import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'

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

    // ── Products ──────────────────────────────────────────────────────────────
    const products = await step.run('fetch-products', async () => {
      const items = await wc.getAllProducts(limit)
      await db.migrationJob.update({
        where: { id: jobId },
        data: { totalProducts: items.length },
      })
      return items
    })

    await step.run('upload-products', async () => {
      let done = 0
      let failed = 0
      for (const product of products) {
        try {
          const payload = transformProduct(product)
          await shopify.createProduct(payload)
          done++
          await db.migrationJob.update({
            where: { id: jobId },
            data: { doneProducts: done },
          })
        } catch (err: unknown) {
          failed++
          await db.migrationLog.create({
            data: {
              jobId,
              entity: 'product',
              entityId: product.sourceId,
              status: 'failed',
              message: err instanceof Error ? err.message : String(err),
            },
          })
          await db.migrationJob.update({
            where: { id: jobId },
            data: { failedProducts: failed },
          })
        }
      }
    })

    // ── Customers ─────────────────────────────────────────────────────────────
    const customers = await step.run('fetch-customers', async () => {
      const items = await wc.getAllCustomers(limit)
      await db.migrationJob.update({
        where: { id: jobId },
        data: { totalCustomers: items.length },
      })
      return items
    })

    await step.run('upload-customers', async () => {
      let done = 0
      let failed = 0
      for (const customer of customers) {
        try {
          const payload = transformCustomer(customer)
          await shopify.createCustomer(payload)
          done++
          await db.migrationJob.update({
            where: { id: jobId },
            data: { doneCustomers: done },
          })
        } catch (err: unknown) {
          failed++
          await db.migrationLog.create({
            data: {
              jobId,
              entity: 'customer',
              entityId: customer.sourceId,
              status: 'failed',
              message: err instanceof Error ? err.message : String(err),
            },
          })
          await db.migrationJob.update({
            where: { id: jobId },
            data: { failedCustomers: failed },
          })
        }
      }
    })

    // ── Orders ────────────────────────────────────────────────────────────────
    const orders = await step.run('fetch-orders', async () => {
      const items = await wc.getAllOrders(limit)
      await db.migrationJob.update({
        where: { id: jobId },
        data: { totalOrders: items.length },
      })
      return items
    })

    await step.run('upload-orders', async () => {
      let done = 0
      let failed = 0
      for (const order of orders) {
        try {
          const payload = transformOrder(order)
          await shopify.createOrder(payload)
          done++
          await db.migrationJob.update({
            where: { id: jobId },
            data: { doneOrders: done },
          })
        } catch (err: unknown) {
          failed++
          await db.migrationLog.create({
            data: {
              jobId,
              entity: 'order',
              entityId: order.sourceId,
              status: 'failed',
              message: err instanceof Error ? err.message : String(err),
            },
          })
          await db.migrationJob.update({
            where: { id: jobId },
            data: { failedOrders: failed },
          })
        }
      }
    })

    // ── Coupons ───────────────────────────────────────────────────────────────
    const coupons = await step.run('fetch-coupons', async () => {
      const items = await wc.getAllCoupons(limit)
      await db.migrationJob.update({
        where: { id: jobId },
        data: { totalCoupons: items.length },
      })
      return items
    })

    await step.run('upload-coupons', async () => {
      let done = 0
      for (const coupon of coupons) {
        try {
          const payload = transformCoupon(coupon)
          await shopify.createDiscountCode(payload)
          done++
          await db.migrationJob.update({
            where: { id: jobId },
            data: { doneCoupons: done },
          })
        } catch {
          // coupons are non-critical, log and continue
        }
      }
    })

    // ── Blog Posts ────────────────────────────────────────────────────────────
    const posts = await step.run('fetch-posts', async () => {
      const items = await wc.getAllPosts(limit)
      await db.migrationJob.update({
        where: { id: jobId },
        data: { totalPosts: items.length },
      })
      return items
    })

    await step.run('upload-posts', async () => {
      let done = 0
      for (const post of posts) {
        try {
          const payload = transformPost(post)
          await shopify.createArticle(payload)
          done++
          await db.migrationJob.update({
            where: { id: jobId },
            data: { donePosts: done },
          })
        } catch {
          // posts are non-critical, log and continue
        }
      }
    })

    // ── Complete ──────────────────────────────────────────────────────────────
    await step.run('complete', async () => {
      const final = await db.migrationJob.findUnique({ where: { id: jobId } })
      const hasFailures = (final?.failedProducts ?? 0) + (final?.failedOrders ?? 0) + (final?.failedCustomers ?? 0) > 0

      await db.migrationJob.update({
        where: { id: jobId },
        data: {
          status: hasFailures ? 'PARTIAL' : 'DONE',
          completedAt: new Date(),
        },
      })
    })
  }
)
