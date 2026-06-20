import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'

const PRODUCT_BATCH = 20 // max products per step to stay under Vercel 60s timeout

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

    // ── Fetch all entity types in parallel ────────────────────────────────────
    const [products, customers, orders, coupons, posts] = await Promise.all([
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
    ])

    // ── Upload all entity types in parallel ───────────────────────────────────
    // Products are batched (20/step) to stay under Vercel's 60s function limit.
    // Each batch is a separate Inngest step so timeouts checkpoint correctly.
    const productBatches: (typeof products)[] = []
    for (let i = 0; i < products.length; i += PRODUCT_BATCH) {
      productBatches.push(products.slice(i, i + PRODUCT_BATCH))
    }

    await Promise.all([
      // Products — one step per batch of 20
      ...productBatches.map((batch, batchIdx) =>
        step.run(`upload-products-${batchIdx}`, async () => {
          for (const product of batch) {
            try {
              const payload = transformProduct(product)
              await shopify.createProduct(payload)
              // Atomic increment avoids race conditions across parallel batches
              await db.migrationJob.update({ where: { id: jobId }, data: { doneProducts: { increment: 1 } } })
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              // Skip duplicates silently — treat as success
              if (msg.includes('handle') && msg.includes('already been taken')) {
                await db.migrationJob.update({ where: { id: jobId }, data: { doneProducts: { increment: 1 } } })
                continue
              }
              await db.migrationLog.create({ data: { jobId, entity: 'product', entityId: product.sourceId, status: 'failed', message: msg } })
              await db.migrationJob.update({ where: { id: jobId }, data: { failedProducts: { increment: 1 } } })
            }
          }
        })
      ),

      // Customers
      step.run('upload-customers', async () => {
        for (const customer of customers) {
          try {
            await shopify.createCustomer(transformCustomer(customer))
            await db.migrationJob.update({ where: { id: jobId }, data: { doneCustomers: { increment: 1 } } })
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            await db.migrationLog.create({ data: { jobId, entity: 'customer', entityId: customer.sourceId, status: 'failed', message: msg } })
            await db.migrationJob.update({ where: { id: jobId }, data: { failedCustomers: { increment: 1 } } })
          }
        }
      }),

      // Orders
      step.run('upload-orders', async () => {
        for (const order of orders) {
          try {
            await shopify.createOrder(transformOrder(order))
            await db.migrationJob.update({ where: { id: jobId }, data: { doneOrders: { increment: 1 } } })
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            await db.migrationLog.create({ data: { jobId, entity: 'order', entityId: order.sourceId, status: 'failed', message: msg } })
            await db.migrationJob.update({ where: { id: jobId }, data: { failedOrders: { increment: 1 } } })
          }
        }
      }),

      // Coupons
      step.run('upload-coupons', async () => {
        for (const coupon of coupons) {
          try {
            await shopify.createDiscountCode(transformCoupon(coupon))
            await db.migrationJob.update({ where: { id: jobId }, data: { doneCoupons: { increment: 1 } } })
          } catch { /* non-critical */ }
        }
      }),

      // Blog Posts
      step.run('upload-posts', async () => {
        for (const post of posts) {
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
