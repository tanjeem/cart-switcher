import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'
import type { NormalizedProduct, NormalizedCustomer, NormalizedOrder, NormalizedCoupon, NormalizedPost, MigrationEntities } from '@/types'

const UPLOAD_BATCH = 50      // items per upload step (~25s each, well under 300s)
const WC_PAGES_PER_STEP = 10 // WC pages per fetch step (1000 items, ~10-20s)
const WC_PAGE_SIZE = 100
const CLEANUP_BATCH = 20      // IDs per delete step

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export const migrationFunction = inngest.createFunction(
  {
    id: 'run-migration',
    concurrency: { limit: 5 },
    retries: 2,
    triggers: [{ event: 'migration/start' }],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, cleanFirst, entities: rawEntities } = event.data

    // Default: all entity types enabled when not specified
    const entities: MigrationEntities = {
      products:  rawEntities?.products  ?? true,
      customers: rawEntities?.customers ?? true,
      orders:    rawEntities?.orders    ?? true,
      coupons:   rawEntities?.coupons   ?? true,
      posts:     rawEntities?.posts     ?? true,
    }

    const job = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error(`Job ${jobId} not found`)

    const wc = new WooCommerceFetcher({
      url: job.wcUrl,
      consumerKey: job.wcKey,
      consumerSecret: job.wcSecret,
    })

    const shopify = new ShopifyUploader({
      domain: job.shopifyDomain,
      accessToken: job.shopifyAccessToken,
    })

    const isDemo = job.isDemo
    const DEMO_LIMIT = 10

    await db.migrationJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    // ── Phase 0 (optional): Remove CartSwitcher duplicates from Shopify ───────
    // Triggered by "Fix Duplicates & Retry". Only touches items CartSwitcher
    // created — identified by the 'cartswitcher-migrated' tag (products) and
    // note_attributes[wc_order_id] (orders). Never deletes merchant-added items.
    if (cleanFirst) {
      const [dupProductIds, dupOrderIds] = await Promise.all([
        entities.products
          ? step.run('dedup-scan-products', async () => shopify.getCartSwitcherProductDuplicates())
          : Promise.resolve([]),
        entities.orders
          ? step.run('dedup-scan-orders', async () => shopify.getCartSwitcherOrderDuplicates())
          : Promise.resolve([]),
      ])

      const dupProductBatches = chunk(dupProductIds as number[], CLEANUP_BATCH)
      const dupOrderBatches   = chunk(dupOrderIds   as number[], CLEANUP_BATCH)

      await Promise.all([
        (async () => {
          for (let i = 0; i < dupProductBatches.length; i++) {
            await step.run(`dedup-products-${i}`, async () => {
              for (const id of dupProductBatches[i]) {
                try { await shopify.deleteProduct(id) } catch { /* ignore */ }
              }
            })
          }
        })(),
        (async () => {
          for (let i = 0; i < dupOrderBatches.length; i++) {
            await step.run(`dedup-orders-${i}`, async () => {
              for (const id of dupOrderBatches[i]) {
                try { await shopify.deleteOrder(id) } catch { /* ignore */ }
              }
            })
          }
        })(),
      ])
    }

    // ── Phase 1: Count + existing-order snapshot ───────────────────────────────
    // Only run counts / fetches for enabled entity types.
    const [orderCount, customerCount, existingOrderIdsArr, products, coupons, posts] = await Promise.all([
      entities.orders
        ? step.run('count-orders', async () => wc.getCount('/orders'))
        : Promise.resolve(0),
      entities.customers
        ? step.run('count-customers', async () => wc.getCount('/customers'))
        : Promise.resolve(0),
      entities.orders
        ? step.run('check-existing-orders', async () => {
            const set = await shopify.getExistingOrderSourceIds()
            return Array.from(set)
          })
        : Promise.resolve([]),
      entities.products
        ? step.run('fetch-products', async () => {
            const items = await wc.getAllProducts(isDemo ? DEMO_LIMIT : undefined)
            await db.migrationJob.update({ where: { id: jobId }, data: { totalProducts: items.length } })
            return items
          })
        : step.run('skip-products', async () => {
            await db.migrationJob.update({ where: { id: jobId }, data: { totalProducts: 0 } })
            return []
          }),
      entities.coupons
        ? step.run('fetch-coupons', async () => {
            const items = await wc.getAllCoupons(isDemo ? DEMO_LIMIT : undefined)
            await db.migrationJob.update({ where: { id: jobId }, data: { totalCoupons: items.length } })
            return items
          })
        : step.run('skip-coupons', async () => {
            await db.migrationJob.update({ where: { id: jobId }, data: { totalCoupons: 0 } })
            return []
          }),
      entities.posts
        ? step.run('fetch-posts', async () => {
            const items = await wc.getAllPosts(isDemo ? DEMO_LIMIT : undefined)
            await db.migrationJob.update({ where: { id: jobId }, data: { totalPosts: items.length } })
            return items
          })
        : step.run('skip-posts', async () => {
            await db.migrationJob.update({ where: { id: jobId }, data: { totalPosts: 0 } })
            return []
          }),
    ])

    const effectiveOrderCount    = entities.orders    ? (isDemo ? Math.min(DEMO_LIMIT, orderCount    as number) : (orderCount    as number)) : 0
    const effectiveCustomerCount = entities.customers ? (isDemo ? Math.min(DEMO_LIMIT, customerCount as number) : (customerCount as number)) : 0

    await db.migrationJob.update({
      where: { id: jobId },
      data: { totalOrders: effectiveOrderCount, totalCustomers: effectiveCustomerCount },
    })

    // ── Phase 2: Fetch orders + customers in page-range steps ─────────────────
    const orderPageStepCount    = entities.orders    ? Math.max(1, Math.ceil(effectiveOrderCount    / (WC_PAGE_SIZE * WC_PAGES_PER_STEP))) : 0
    const customerPageStepCount = entities.customers ? Math.max(1, Math.ceil(effectiveCustomerCount / (WC_PAGE_SIZE * WC_PAGES_PER_STEP))) : 0

    const [orderChunks, customerChunks] = await Promise.all([
      orderPageStepCount > 0
        ? Promise.all(
            Array.from({ length: orderPageStepCount }, (_, i) =>
              step.run(`fetch-orders-${i}`, async () => {
                const startPage = i * WC_PAGES_PER_STEP + 1
                const items = await wc.getOrdersInRange(startPage, WC_PAGES_PER_STEP)
                return items.slice(0, Math.max(0, effectiveOrderCount - i * WC_PAGE_SIZE * WC_PAGES_PER_STEP))
              })
            )
          )
        : Promise.resolve([]),
      customerPageStepCount > 0
        ? Promise.all(
            Array.from({ length: customerPageStepCount }, (_, i) =>
              step.run(`fetch-customers-${i}`, async () => {
                const startPage = i * WC_PAGES_PER_STEP + 1
                const items = await wc.getCustomersInRange(startPage, WC_PAGES_PER_STEP)
                return items.slice(0, Math.max(0, effectiveCustomerCount - i * WC_PAGE_SIZE * WC_PAGES_PER_STEP))
              })
            )
          )
        : Promise.resolve([]),
    ])

    const orders    = (orderChunks    as NormalizedOrder[][]   ).flat()
    const customers = (customerChunks as NormalizedCustomer[][]).flat()
    const existingOrders = new Set<string>(existingOrderIdsArr as string[])

    // ── Phase 3: Upload ───────────────────────────────────────────────────────
    // Products, coupons, and posts upload in parallel (they're fast/few).
    // Customers then orders upload SEQUENTIALLY to stay under Shopify's 2 req/s
    // rate limit — running both simultaneously causes rate-limit collisions that
    // add 2s retry delays per item, making parallel execution slower overall.
    const productBatches  = chunk(products  as NormalizedProduct[], UPLOAD_BATCH)
    const customerBatches = chunk(customers,                         UPLOAD_BATCH)
    const orderBatches    = chunk(orders,                            UPLOAD_BATCH)

    // Helper: check if this job was cancelled between steps
    const isCancelled = async () => {
      const s = await db.migrationJob.findUnique({ where: { id: jobId }, select: { status: true } })
      return s?.status === 'CANCELLED'
    }

    // Phase 3a: Products + coupons + posts in parallel (fast, small counts)
    await Promise.all([

      // ── Products ──
      entities.products
        ? (async () => {
            for (let i = 0; i < productBatches.length; i++) {
              await step.run(`upload-products-${i}`, async () => {
                if (await isCancelled()) return
                let done = 0
                let failed = 0
                const failedLogs: { entityId: string; message: string }[] = []
                for (const product of productBatches[i]) {
                  try {
                    await shopify.createProduct(transformProduct(product))
                    done++
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err)
                    if (msg.includes('handle') && msg.includes('already been taken')) {
                      done++
                      continue
                    }
                    failedLogs.push({ entityId: product.sourceId, message: msg })
                    failed++
                  }
                }
                await Promise.all([
                  db.migrationJob.update({ where: { id: jobId }, data: { doneProducts: { increment: done }, failedProducts: { increment: failed } } }),
                  ...failedLogs.map(l => db.migrationLog.create({ data: { jobId, entity: 'product', entityId: l.entityId, status: 'failed', message: l.message } })),
                ])
              })
            }
          })()
        : Promise.resolve(),

      // ── Coupons ──
      entities.coupons
        ? step.run('upload-coupons', async () => {
            if (await isCancelled()) return
            for (const coupon of coupons as NormalizedCoupon[]) {
              try {
                await shopify.createDiscountCode(transformCoupon(coupon))
                await db.migrationJob.update({ where: { id: jobId }, data: { doneCoupons: { increment: 1 } } })
              } catch { /* non-critical */ }
            }
          })
        : Promise.resolve(),

      // ── Blog Posts ──
      entities.posts
        ? step.run('upload-posts', async () => {
            if (await isCancelled()) return
            for (const post of posts as NormalizedPost[]) {
              try {
                await shopify.createArticle(transformPost(post))
                await db.migrationJob.update({ where: { id: jobId }, data: { donePosts: { increment: 1 } } })
              } catch { /* non-critical */ }
            }
          })
        : Promise.resolve(),
    ])

    // Phase 3b: Customers (sequential to stay under 2 req/s without collisions)
    if (entities.customers) {
      for (let i = 0; i < customerBatches.length; i++) {
        await step.run(`upload-customers-${i}`, async () => {
          if (await isCancelled()) return
          let done = 0
          let failed = 0
          const failedLogs: { entityId: string; message: string }[] = []
          for (const customer of customerBatches[i]) {
            try {
              await shopify.createCustomer(transformCustomer(customer))
              done++
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              failedLogs.push({ entityId: customer.sourceId, message: msg })
              failed++
            }
          }
          await Promise.all([
            db.migrationJob.update({ where: { id: jobId }, data: { doneCustomers: { increment: done }, failedCustomers: { increment: failed } } }),
            ...failedLogs.map(l => db.migrationLog.create({ data: { jobId, entity: 'customer', entityId: l.entityId, status: 'failed', message: l.message } })),
          ])
        })
      }
    }

    // Phase 3c: Orders (after customers to avoid combined rate-limit pressure)
    if (entities.orders) {
      for (let i = 0; i < orderBatches.length; i++) {
        await step.run(`upload-orders-${i}`, async () => {
          if (await isCancelled()) return
          let done = 0
          let failed = 0
          const failedLogs: { entityId: string; message: string }[] = []
          for (const order of orderBatches[i]) {
            if (existingOrders.has(order.sourceId)) {
              done++
              continue
            }
            try {
              await shopify.createOrder(transformOrder(order))
              done++
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              failedLogs.push({ entityId: order.sourceId, message: msg })
              failed++
            }
          }
          await Promise.all([
            db.migrationJob.update({ where: { id: jobId }, data: { doneOrders: { increment: done }, failedOrders: { increment: failed } } }),
            ...failedLogs.map(l => db.migrationLog.create({ data: { jobId, entity: 'order', entityId: l.entityId, status: 'failed', message: l.message } })),
          ])
        })
      }
    }

    // ── Complete ──────────────────────────────────────────────────────────────
    await step.run('complete', async () => {
      const final = await db.migrationJob.findUnique({ where: { id: jobId }, select: { status: true, failedProducts: true, failedOrders: true, failedCustomers: true } })
      if (final?.status === 'CANCELLED') return // user stopped it — keep CANCELLED status
      const hasFailures =
        (final?.failedProducts ?? 0) + (final?.failedOrders ?? 0) + (final?.failedCustomers ?? 0) > 0
      await db.migrationJob.update({
        where: { id: jobId },
        data: { status: hasFailures ? 'PARTIAL' : 'DONE', completedAt: new Date() },
      })
    })
  }
)
