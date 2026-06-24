import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader, USE_GQL_ORDERS } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'
import type { MigrationEntities } from '@/types'

const PAGE_SIZE = 25
const ORDER_PAGE_SIZE = 22
const CLEANUP_BATCH = 20

const ORDER_TIMEOUT_MS = 30_000
const STEP_BUDGET_MS = 25_000

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms))])

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const typeSequence = ['products', 'coupons', 'posts', 'customers', 'orders']

function getNextType(currentType: string, entities: Record<string, boolean>) {
  let idx = typeSequence.indexOf(currentType)
  while (idx < typeSequence.length - 1) {
    idx++
    const next = typeSequence[idx]
    if (entities[next]) return next
  }
  return 'complete'
}

export const migrationStart = inngest.createFunction(
  {
    id: 'run-migration-start',
    concurrency: { limit: 1, key: 'event.data.jobId' },
    retries: 2,
    triggers: [{ event: 'migration/start' }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFailure: async ({ event, error }: { event: any; error: any }) => {
      const originalEvent = event.data.event
      const jobId = originalEvent?.data?.jobId as string | undefined
      if (!jobId) return
      await db.migrationJob.updateMany({
        where: { id: jobId, status: { in: ['PENDING', 'RUNNING'] } },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorLog: `Migration failed to start: ${String(error?.message ?? error ?? 'unknown error')}. Please retry.`,
        },
      })
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any; step: any }) => {
    console.log('[MIGRATION_START] EVENT RECEIVED:', event.data.jobId)
    const { jobId, cleanFirst, entities: rawEntities, autoRetryCount = 0 } = event.data

    const entities: MigrationEntities = {
      products: rawEntities?.products ?? true,
      customers: rawEntities?.customers ?? true,
      orders: rawEntities?.orders ?? true,
      coupons: rawEntities?.coupons ?? true,
      posts: rawEntities?.posts ?? true,
    }

    const job = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!job) throw new Error(`Job ${jobId} not found`)

    const shopify = new ShopifyUploader({ domain: job.shopifyDomain, accessToken: job.shopifyAccessToken })
    const wc = new WooCommerceFetcher({ url: job.wcUrl, consumerKey: job.wcKey, consumerSecret: job.wcSecret })

    await db.migrationJob.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } })

    const credentialsOk = await step.run('validate-credentials', async () => shopify.validate())
    if (!credentialsOk) {
      await db.migrationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorLog: 'Shopify credentials are invalid. Please reconnect your store.',
        },
      })
      return
    }

    if (USE_GQL_ORDERS && entities.orders) {
      const gqlOk = await step.run('detect-order-api', () => shopify.canUseGraphQLOrders())
      if (gqlOk) shopify.enableGqlOrders()
    }

    if (cleanFirst) {
      const dupProductIds = entities.products ? await step.run('dedup-scan-products', async () => shopify.getCartSwitcherProductDuplicates()) : []
      const dupOrderIds = entities.orders ? await step.run('dedup-scan-orders', async () => shopify.getCartSwitcherOrderDuplicates()) : []
      const dupProductBatches = chunk(dupProductIds as number[], CLEANUP_BATCH)
      const dupOrderBatches = chunk(dupOrderIds as number[], CLEANUP_BATCH)
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

    const isDemo = job.isDemo
    const DEMO_LIMIT = 10

    const [orderCount, customerCount, productCount, couponCount, postCount, existingOrderIdsArr] = await Promise.all([
      entities.orders ? step.run('count-orders', () => wc.getCount('/orders')) : Promise.resolve(0),
      entities.customers ? step.run('count-customers', () => wc.getCount('/customers')) : Promise.resolve(0),
      entities.products ? step.run('count-products', () => wc.getCount('/products')) : Promise.resolve(0),
      entities.coupons ? step.run('count-coupons', () => wc.getCount('/coupons')) : Promise.resolve(0),
      entities.posts ? step.run('count-posts', () => wc.getPreviewCounts().then(c => c.posts)) : Promise.resolve(0),
      entities.orders ? step.run('check-existing-orders', async () => {
        const set = await shopify.getExistingOrderSourceIds()
        return Array.from(set)
      }) : Promise.resolve([]),
    ])

    const updateTotals: Record<string, number> = {}
    if (entities.products) updateTotals.totalProducts = isDemo ? Math.min(DEMO_LIMIT, productCount as number) : (productCount as number)
    if (entities.customers) updateTotals.totalCustomers = isDemo ? Math.min(DEMO_LIMIT, customerCount as number) : (customerCount as number)
    if (entities.orders) {
      updateTotals.totalOrders = isDemo ? Math.min(DEMO_LIMIT, orderCount as number) : (orderCount as number)
      updateTotals.doneOrders = (existingOrderIdsArr as string[]).length
    }
    if (entities.coupons) updateTotals.totalCoupons = isDemo ? Math.min(DEMO_LIMIT, couponCount as number) : (couponCount as number)
    if (entities.posts) updateTotals.totalPosts = isDemo ? Math.min(DEMO_LIMIT, postCount as number) : (postCount as number)

    if (Object.keys(updateTotals).length > 0) {
      await db.migrationJob.update({ where: { id: jobId }, data: updateTotals })
    }

    const firstType = getNextType('', entities as unknown as Record<string, boolean>)
    if (firstType === 'complete') {
      await step.sendEvent('trigger-complete', { name: 'migration/complete', data: { jobId, autoRetryCount } })
    } else {
      await step.sendEvent('trigger-first-chunk', {
        name: 'migration/chunk',
        data: { jobId, entities, existingOrders: existingOrderIdsArr, type: firstType, page: 1, autoRetryCount, isDemo },
      })
    }
  }
)

export const migrationChunk = inngest.createFunction(
  {
    id: 'run-migration-chunk',
    concurrency: { limit: 1, key: 'event.data.jobId' },
    retries: 4,
    triggers: [{ event: 'migration/chunk' }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFailure: async ({ event, error }: { event: any; error: any }) => {
      const originalEvent = event.data.event
      const jobId = originalEvent?.data?.jobId as string | undefined
      if (!jobId) return
      await db.migrationJob.updateMany({
        where: { id: jobId, status: { in: ['PENDING', 'RUNNING'] } },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorLog: `Migration chunk failed: ${String(error?.message ?? error ?? 'unknown error')}. Please retry.`,
        },
      })
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, entities, existingOrders, type, page, autoRetryCount, isDemo } = event.data

    const job = await db.migrationJob.findUnique({ where: { id: jobId }, select: { status: true, wcUrl: true, wcKey: true, wcSecret: true, shopifyDomain: true, shopifyAccessToken: true } })
    if (job?.status === 'CANCELLED') return
    if (!job) return

    const wc = new WooCommerceFetcher({ url: job.wcUrl, consumerKey: job.wcKey, consumerSecret: job.wcSecret })
    const shopify = new ShopifyUploader({ domain: job.shopifyDomain, accessToken: job.shopifyAccessToken })
    if (USE_GQL_ORDERS && entities.orders) shopify.enableGqlOrders()

    const existingOrderSet = new Set<string>(existingOrders || [])
    const DEMO_LIMIT = 10
    const pageSize = type === 'orders' ? ORDER_PAGE_SIZE : PAGE_SIZE

    let items: any[] = []
    let done = 0
    let failed = 0
    const failedLogs: { entityId: string; message: string }[] = []

    await step.run(`process-${type}-page-${page}`, async () => {
      const stepStart = Date.now()

      if (type === 'products') {
        items = await wc.getProductPage(page, pageSize)
        for (const item of items) {
          if (Date.now() - stepStart > STEP_BUDGET_MS) break
          try {
            await shopify.createProduct(transformProduct(item))
            done++
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes('handle') && msg.includes('already been taken')) { done++; continue }
            failedLogs.push({ entityId: String(item.sourceId), message: msg })
            failed++
          }
        }
      } else if (type === 'customers') {
        items = await wc.getCustomerPage(page, pageSize)
        for (const item of items) {
          if (Date.now() - stepStart > STEP_BUDGET_MS) break
          try { await shopify.createCustomer(transformCustomer(item)); done++ }
          catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            failedLogs.push({ entityId: String(item.sourceId), message: msg })
            failed++
          }
        }
      } else if (type === 'orders') {
        items = await wc.getOrderPage(page, pageSize)
        for (const item of items) {
          if (Date.now() - stepStart > STEP_BUDGET_MS) break
          if (existingOrderSet.has(String(item.sourceId))) continue
          try {
            await withTimeout(shopify.createOrder(transformOrder(item)), ORDER_TIMEOUT_MS)
            done++
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            failedLogs.push({ entityId: String(item.sourceId), message: msg })
            failed++
          }
        }
      } else if (type === 'coupons') {
        items = await wc.getCouponPage(page, pageSize)
        for (const item of items) {
          if (Date.now() - stepStart > STEP_BUDGET_MS) break
          try { await shopify.createDiscountCode(transformCoupon(item)); done++ }
          catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            failedLogs.push({ entityId: String(item.sourceId), message: msg })
            failed++
          }
        }
      } else if (type === 'posts') {
        items = await wc.getPostPage(page, pageSize)
        for (const item of items) {
          if (Date.now() - stepStart > STEP_BUDGET_MS) break
          try { await shopify.createArticle(transformPost(item)); done++ }
          catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            failedLogs.push({ entityId: String(item.sourceId), message: msg })
            failed++
          }
        }
      }

      if (done > 0 || failed > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {}
        if (type === 'products') { data.doneProducts = { increment: done }; data.failedProducts = { increment: failed } }
        else if (type === 'customers') { data.doneCustomers = { increment: done }; data.failedCustomers = { increment: failed } }
        else if (type === 'orders') { data.doneOrders = { increment: done }; data.failedOrders = { increment: failed } }
        else if (type === 'coupons') { data.doneCoupons = { increment: done } } 
        else if (type === 'posts') { data.donePosts = { increment: done } }

        if (Object.keys(data).length > 0) await db.migrationJob.update({ where: { id: jobId }, data })
      }

      if (failedLogs.length > 0) {
        await Promise.all(
          failedLogs.map(l => db.migrationLog.create({
            data: { jobId, entity: type.replace(/s$/, ''), entityId: l.entityId, status: 'failed', message: l.message }
          }))
        )
      }
    })

    const isDemoLimitHit = isDemo && (page * pageSize >= DEMO_LIMIT)

    if (items.length < pageSize || isDemoLimitHit) {
      const nextType = getNextType(type, entities)
      if (nextType === 'complete') {
        await step.sendEvent('trigger-complete', { name: 'migration/complete', data: { jobId, autoRetryCount } })
      } else {
        await step.sendEvent('trigger-next-type', {
          name: 'migration/chunk',
          data: { jobId, entities, existingOrders, type: nextType, page: 1, autoRetryCount, isDemo },
        })
      }
    } else {
      await step.sendEvent('trigger-next-page', {
        name: 'migration/chunk',
        data: { jobId, entities, existingOrders, type, page: page + 1, autoRetryCount, isDemo },
      })
    }
  }
)

export const migrationComplete = inngest.createFunction(
  { id: 'run-migration-complete', concurrency: { limit: 1, key: 'event.data.jobId' }, triggers: [{ event: 'migration/complete' }] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, autoRetryCount } = event.data

    const final = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (final?.status === 'CANCELLED') return

    const pMiss = (final?.totalProducts ?? 0) - ((final?.doneProducts ?? 0) + (final?.failedProducts ?? 0))
    const cMiss = (final?.totalCustomers ?? 0) - ((final?.doneCustomers ?? 0) + (final?.failedCustomers ?? 0))
    const oMiss = (final?.totalOrders ?? 0) - ((final?.doneOrders ?? 0) + (final?.failedOrders ?? 0))

    const pThrottled = await db.migrationLog.count({ where: { jobId, entity: 'product', status: 'failed', message: { contains: 'throttled' } } })
    const cThrottled = await db.migrationLog.count({ where: { jobId, entity: 'customer', status: 'failed', message: { contains: 'throttled' } } })
    const oThrottled = await db.migrationLog.count({ where: { jobId, entity: 'order', status: 'failed', message: { contains: 'throttled' } } })

    const retryP = pMiss > 0 || pThrottled > 0
    const retryC = cMiss > 0 || cThrottled > 0
    const retryO = oMiss > 0 || oThrottled > 0

    if ((retryP || retryC || retryO) && autoRetryCount < 10) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resetData: any = {}
      if (retryP) { resetData.doneProducts = 0; resetData.failedProducts = 0 }
      if (retryC) { resetData.doneCustomers = 0; resetData.failedCustomers = 0 }
      if (retryO) { resetData.doneOrders = 0; resetData.failedOrders = 0 }

      await db.migrationJob.update({ where: { id: jobId }, data: resetData })

      if (retryP) await db.migrationLog.deleteMany({ where: { jobId, entity: 'product' } })
      if (retryC) await db.migrationLog.deleteMany({ where: { jobId, entity: 'customer' } })
      if (retryO) await db.migrationLog.deleteMany({ where: { jobId, entity: 'order' } })

      await inngest.send({
        name: 'migration/start',
        data: {
          jobId,
          cleanFirst: false,
          autoRetryCount: autoRetryCount + 1,
          entities: { products: retryP, customers: retryC, orders: retryO, coupons: false, posts: false }
        }
      })
      return
    }

    const failedTotal = (final?.failedProducts ?? 0) + (final?.failedOrders ?? 0) + (final?.failedCustomers ?? 0)
    const hasFailures = failedTotal > 0

    await db.migrationJob.update({
      where: { id: jobId },
      data: { status: hasFailures ? 'PARTIAL' : 'DONE', completedAt: new Date() },
    })
  }
)
