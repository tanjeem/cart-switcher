import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'
import type { NormalizedProduct, NormalizedCustomer, NormalizedOrder, NormalizedCoupon, NormalizedPost } from '@/types'

// 10 items per upload step: ~5–15s each, safely under Vercel's 60s limit
const UPLOAD_BATCH = 10
// 5 WooCommerce pages per fetch step: 500 items/step, ~5–15s at 1–3s/page
const WC_PAGES_PER_STEP = 5
const WC_PAGE_SIZE = 100

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
    const { jobId } = event.data

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

    // ── Phase 1: Count + existing-order snapshot (all in parallel) ────────────
    const [orderCount, customerCount, existingOrderIdsArr, products, coupons, posts] = await Promise.all([
      step.run('count-orders', async () => wc.getCount('/orders')),
      step.run('count-customers', async () => wc.getCount('/customers')),
      // Snapshot already-migrated orders by wc_order_id note attribute for dedup
      step.run('check-existing-orders', async () => {
        const set = await shopify.getExistingOrderSourceIds()
        return Array.from(set)
      }),
      // Products are small enough to fetch all at once
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

    // Clamp counts for demo mode
    const effectiveOrderCount = isDemo ? Math.min(DEMO_LIMIT, orderCount as number) : (orderCount as number)
    const effectiveCustomerCount = isDemo ? Math.min(DEMO_LIMIT, customerCount as number) : (customerCount as number)

    await db.migrationJob.update({
      where: { id: jobId },
      data: {
        totalOrders: effectiveOrderCount,
        totalCustomers: effectiveCustomerCount,
      },
    })

    // ── Phase 2: Fetch orders + customers in parallel page-range steps ────────
    // Each step fetches WC_PAGES_PER_STEP pages (500 items). This keeps every
    // fetch step under ~15s even on slow WooCommerce servers (5 pages × 3s).
    const orderPageStepCount = Math.ceil(effectiveOrderCount / (WC_PAGE_SIZE * WC_PAGES_PER_STEP))
    const customerPageStepCount = Math.ceil(effectiveCustomerCount / (WC_PAGE_SIZE * WC_PAGES_PER_STEP))

    const [orderChunks, customerChunks] = await Promise.all([
      Promise.all(
        Array.from({ length: Math.max(1, orderPageStepCount) }, (_, i) =>
          step.run(`fetch-orders-${i}`, async () => {
            const startPage = i * WC_PAGES_PER_STEP + 1
            const items = await wc.getOrdersInRange(startPage, WC_PAGES_PER_STEP)
            return items.slice(0, Math.max(0, effectiveOrderCount - i * WC_PAGE_SIZE * WC_PAGES_PER_STEP))
          })
        )
      ),
      Promise.all(
        Array.from({ length: Math.max(1, customerPageStepCount) }, (_, i) =>
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
    // Within each entity type, batches run SEQUENTIALLY — keeps Shopify API
    // load to ~1 req/s per entity type (3 types × 1 req/s = 3 req/s total,
    // within the 40-burst / 2 req/s steady-state limit with 429 retry).
    const productBatches = chunk(products as NormalizedProduct[], UPLOAD_BATCH)
    const customerBatches = chunk(customers, UPLOAD_BATCH)
    const orderBatches = chunk(orders, UPLOAD_BATCH)

    await Promise.all([

      // ── Products ──
      (async () => {
        for (let i = 0; i < productBatches.length; i++) {
          await step.run(`upload-products-${i}`, async () => {
            for (const product of productBatches[i]) {
              try {
                await shopify.createProduct(transformProduct(product))
                await db.migrationJob.update({ where: { id: jobId }, data: { doneProducts: { increment: 1 } } })
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                if (msg.includes('handle') && msg.includes('already been taken')) {
                  await db.migrationJob.update({ where: { id: jobId }, data: { doneProducts: { increment: 1 } } })
                  continue
                }
                await db.migrationLog.create({ data: { jobId, entity: 'product', entityId: product.sourceId, status: 'failed', message: msg } })
                await db.migrationJob.update({ where: { id: jobId }, data: { failedProducts: { increment: 1 } } })
              }
            }
          })
        }
      })(),

      // ── Customers ──
      (async () => {
        for (let i = 0; i < customerBatches.length; i++) {
          await step.run(`upload-customers-${i}`, async () => {
            for (const customer of customerBatches[i]) {
              try {
                await shopify.createCustomer(transformCustomer(customer))
                await db.migrationJob.update({ where: { id: jobId }, data: { doneCustomers: { increment: 1 } } })
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                await db.migrationLog.create({ data: { jobId, entity: 'customer', entityId: customer.sourceId, status: 'failed', message: msg } })
                await db.migrationJob.update({ where: { id: jobId }, data: { failedCustomers: { increment: 1 } } })
              }
            }
          })
        }
      })(),

      // ── Orders ──
      (async () => {
        for (let i = 0; i < orderBatches.length; i++) {
          await step.run(`upload-orders-${i}`, async () => {
            for (const order of orderBatches[i]) {
              if (existingOrders.has(order.sourceId)) {
                await db.migrationJob.update({ where: { id: jobId }, data: { doneOrders: { increment: 1 } } })
                continue
              }
              try {
                await shopify.createOrder(transformOrder(order))
                await db.migrationJob.update({ where: { id: jobId }, data: { doneOrders: { increment: 1 } } })
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                await db.migrationLog.create({ data: { jobId, entity: 'order', entityId: order.sourceId, status: 'failed', message: msg } })
                await db.migrationJob.update({ where: { id: jobId }, data: { failedOrders: { increment: 1 } } })
              }
            }
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
