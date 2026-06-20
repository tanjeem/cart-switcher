import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'
import type { NormalizedProduct, NormalizedCustomer, NormalizedOrder, NormalizedCoupon, NormalizedPost } from '@/types'

const UPLOAD_BATCH = 25      // items per upload step (~8-15s each, well under 60s)
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
    const { jobId, cleanFirst } = event.data

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
      // Scan for duplicates in parallel
      const [dupProductIds, dupOrderIds] = await Promise.all([
        step.run('dedup-scan-products', async () => shopify.getCartSwitcherProductDuplicates()),
        step.run('dedup-scan-orders', async () => shopify.getCartSwitcherOrderDuplicates()),
      ])

      const dupProductBatches = chunk(dupProductIds as number[], CLEANUP_BATCH)
      const dupOrderBatches = chunk(dupOrderIds as number[], CLEANUP_BATCH)

      // Delete duplicate products and orders in parallel
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

    // ── Phase 1: Count + existing-order snapshot (all in parallel) ────────────
    const [orderCount, customerCount, existingOrderIdsArr, products, coupons, posts] = await Promise.all([
      step.run('count-orders', async () => wc.getCount('/orders')),
      step.run('count-customers', async () => wc.getCount('/customers')),
      // If we just cleaned, this will be empty — that's the point
      step.run('check-existing-orders', async () => {
        const set = await shopify.getExistingOrderSourceIds()
        return Array.from(set)
      }),
      step.run('fetch-products', async () => {
        const items = await wc.getAllProducts(isDemo ? DEMO_LIMIT : undefined)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalProducts: items.length } })
        return items
      }),
      step.run('fetch-coupons', async () => {
        const items = await wc.getAllCoupons(isDemo ? DEMO_LIMIT : undefined)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalCoupons: items.length } })
        return items
      }),
      step.run('fetch-posts', async () => {
        const items = await wc.getAllPosts(isDemo ? DEMO_LIMIT : undefined)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalPosts: items.length } })
        return items
      }),
    ])

    const effectiveOrderCount = isDemo ? Math.min(DEMO_LIMIT, orderCount as number) : (orderCount as number)
    const effectiveCustomerCount = isDemo ? Math.min(DEMO_LIMIT, customerCount as number) : (customerCount as number)

    await db.migrationJob.update({
      where: { id: jobId },
      data: { totalOrders: effectiveOrderCount, totalCustomers: effectiveCustomerCount },
    })

    // ── Phase 2: Fetch orders + customers in page-range steps ─────────────────
    const orderPageStepCount = Math.max(1, Math.ceil(effectiveOrderCount / (WC_PAGE_SIZE * WC_PAGES_PER_STEP)))
    const customerPageStepCount = Math.max(1, Math.ceil(effectiveCustomerCount / (WC_PAGE_SIZE * WC_PAGES_PER_STEP)))

    const [orderChunks, customerChunks] = await Promise.all([
      Promise.all(
        Array.from({ length: orderPageStepCount }, (_, i) =>
          step.run(`fetch-orders-${i}`, async () => {
            const startPage = i * WC_PAGES_PER_STEP + 1
            const items = await wc.getOrdersInRange(startPage, WC_PAGES_PER_STEP)
            return items.slice(0, Math.max(0, effectiveOrderCount - i * WC_PAGE_SIZE * WC_PAGES_PER_STEP))
          })
        )
      ),
      Promise.all(
        Array.from({ length: customerPageStepCount }, (_, i) =>
          step.run(`fetch-customers-${i}`, async () => {
            const startPage = i * WC_PAGES_PER_STEP + 1
            const items = await wc.getCustomersInRange(startPage, WC_PAGES_PER_STEP)
            return items.slice(0, Math.max(0, effectiveCustomerCount - i * WC_PAGE_SIZE * WC_PAGES_PER_STEP))
          })
        )
      ),
    ])

    const orders = (orderChunks as NormalizedOrder[][]).flat()
    const customers = (customerChunks as NormalizedCustomer[][]).flat()
    const existingOrders = new Set<string>(existingOrderIdsArr as string[])

    // ── Phase 3: Upload in parallel across entity types ───────────────────────
    // Batches are sequential within each entity type to respect Shopify's
    // 2 req/s rate limit. Entity types upload in parallel with each other.
    const productBatches = chunk(products as NormalizedProduct[], UPLOAD_BATCH)
    const customerBatches = chunk(customers, UPLOAD_BATCH)
    const orderBatches = chunk(orders, UPLOAD_BATCH)

    await Promise.all([

      // ── Products ──
      (async () => {
        for (let i = 0; i < productBatches.length; i++) {
          await step.run(`upload-products-${i}`, async () => {
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
            // Flush counters + logs in one shot at end of step
            await Promise.all([
              db.migrationJob.update({ where: { id: jobId }, data: { doneProducts: { increment: done }, failedProducts: { increment: failed } } }),
              ...failedLogs.map(l => db.migrationLog.create({ data: { jobId, entity: 'product', entityId: l.entityId, status: 'failed', message: l.message } })),
            ])
          })
        }
      })(),

      // ── Customers ──
      (async () => {
        for (let i = 0; i < customerBatches.length; i++) {
          await step.run(`upload-customers-${i}`, async () => {
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
      })(),

      // ── Orders ──
      (async () => {
        for (let i = 0; i < orderBatches.length; i++) {
          await step.run(`upload-orders-${i}`, async () => {
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
      })(),

      // ── Coupons ──
      step.run('upload-coupons', async () => {
        for (const coupon of coupons as NormalizedCoupon[]) {
          try {
            await shopify.createDiscountCode(transformCoupon(coupon))
            await db.migrationJob.update({ where: { id: jobId }, data: { doneCoupons: { increment: 1 } } })
          } catch { /* non-critical */ }
        }
      }),

      // ── Blog Posts ──
      step.run('upload-posts', async () => {
        for (const post of posts as NormalizedPost[]) {
          try {
            await shopify.createArticle(transformPost(post))
            await db.migrationJob.update({ where: { id: jobId }, data: { donePosts: { increment: 1 } } })
          } catch { /* non-critical */ }
        }
      }),
    ])

    // ── Complete ──────────────────────────────────────────────────────────────
    await step.run('complete', async () => {
      const final = await db.migrationJob.findUnique({ where: { id: jobId } })
      const hasFailures =
        (final?.failedProducts ?? 0) + (final?.failedOrders ?? 0) + (final?.failedCustomers ?? 0) > 0

      await db.migrationJob.update({
        where: { id: jobId },
        data: { status: hasFailures ? 'PARTIAL' : 'DONE', completedAt: new Date() },
      })
    })
  }
)
