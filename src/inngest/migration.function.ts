import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'
import type { NormalizedProduct, NormalizedCustomer, NormalizedOrder, NormalizedCoupon, NormalizedPost } from '@/types'

// 20 items per step keeps each Inngest step well under Vercel's 60s limit
// (20 × 500ms sleep = 10s, leaving plenty of headroom)
const BATCH = 20

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

    const limit = job.isDemo ? 10 : undefined

    await db.migrationJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    // ── Phase 1: Fetch everything in parallel ─────────────────────────────────
    // Also fetch existing Shopify order IDs upfront for deduplication on retry.
    const [products, customers, orders, coupons, posts, existingOrderIdsArr] = await Promise.all([
      step.run('fetch-products', async () => {
        const items = await wc.getAllProducts(limit)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalProducts: items.length } })
        return items
      }),
      step.run('fetch-customers', async () => {
        const items = await wc.getAllCustomers(limit)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalCustomers: items.length } })
        return items
      }),
      step.run('fetch-orders', async () => {
        const items = await wc.getAllOrders(limit)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalOrders: items.length } })
        return items
      }),
      step.run('fetch-coupons', async () => {
        const items = await wc.getAllCoupons(limit)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalCoupons: items.length } })
        return items
      }),
      step.run('fetch-posts', async () => {
        const items = await wc.getAllPosts(limit)
        await db.migrationJob.update({ where: { id: jobId }, data: { totalPosts: items.length } })
        return items
      }),
      // Snapshot of already-migrated orders — used to skip duplicates on retry
      step.run('check-existing-orders', async () => {
        const set = await shopify.getExistingOrderSourceIds()
        return Array.from(set)
      }),
    ])

    const existingOrders = new Set<string>(existingOrderIdsArr as string[])

    // ── Phase 2: Upload in parallel across entity types ───────────────────────
    // Within each entity type, batches run SEQUENTIALLY so Shopify's rate limit
    // (2 req/s) isn't overwhelmed. Across entity types they run in parallel.
    // Each batch = 20 items × 500ms = ~10s → well within Vercel's 60s limit.
    const productBatches = chunk(products as NormalizedProduct[], BATCH)
    const customerBatches = chunk(customers as NormalizedCustomer[], BATCH)
    const orderBatches = chunk(orders as NormalizedOrder[], BATCH)

    await Promise.all([

      // Products — sequential batches
      (async () => {
        for (let i = 0; i < productBatches.length; i++) {
          await step.run(`upload-products-${i}`, async () => {
            for (const product of productBatches[i]) {
              try {
                await shopify.createProduct(transformProduct(product))
                await db.migrationJob.update({ where: { id: jobId }, data: { doneProducts: { increment: 1 } } })
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                // Handle already taken (duplicate) as success
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

      // Customers — sequential batches
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

      // Orders — sequential batches, skip already-migrated ones
      (async () => {
        for (let i = 0; i < orderBatches.length; i++) {
          await step.run(`upload-orders-${i}`, async () => {
            for (const order of orderBatches[i]) {
              // Skip if this WC order was already migrated (deduplication on retry)
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

      // Coupons — single step (typically few)
      step.run('upload-coupons', async () => {
        for (const coupon of coupons as NormalizedCoupon[]) {
          try {
            await shopify.createDiscountCode(transformCoupon(coupon))
            await db.migrationJob.update({ where: { id: jobId }, data: { doneCoupons: { increment: 1 } } })
          } catch { /* non-critical */ }
        }
      }),

      // Blog Posts — single step (typically few)
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
