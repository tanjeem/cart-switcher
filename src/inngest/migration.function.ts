import { inngest } from './client'
import { db } from '@/lib/db'
import { WooCommerceFetcher } from '@/fetchers/woocommerce'
import { ShopifyUploader, USE_GQL_ORDERS } from '@/uploaders/shopify'
import { transformProduct, transformCustomer, transformOrder, transformCoupon, transformPost } from '@/transformers'
import type { NormalizedProduct, NormalizedCoupon, NormalizedPost, MigrationEntities } from '@/types'

const UPLOAD_BATCH     = 25   // products per step
const WC_PAGE_SIZE     = 100
const CLEANUP_BATCH    = 20
const ORDER_PAGE_SIZE  = 22   // orders fetched+uploaded per step (800ms sleep × 22 = 17.6s + ~2s WC fetch ≤ 25s budget)
const CUSTOMER_PAGE_SIZE = 25 // customers fetched+uploaded per step

// Vercel maxDuration = 60s. Budget math:
//   STEP_BUDGET_MS (25s) guards the loop: don't start next order if >25s elapsed.
//   ORDER_TIMEOUT_MS (30s) caps the order itself.
//   Worst case step time: 25s + 30s (last order) + ~3s overhead = 58s < 60s ✓
//
// The old 20s timeout was also shorter than the 429 retry ceiling:
//   8 retries × 3s delay = 24s → timeout always fired first for rate-limited orders.
//   Now: 3 retries × 1s = 3s max from 429 handling, well within 30s.
const ORDER_TIMEOUT_MS = 30_000  // per-order cap; was 20s (too short for slow/old orders)
const STEP_BUDGET_MS   = 25_000  // bail before starting next order if >25s elapsed

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms))])

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export const migrationFunction = inngest.createFunction(
  {
    id: 'run-migration',
    // Scope concurrency per jobId so each migration job gets its own slot.
    // A global limit (no key) caused new jobs to queue indefinitely when
    // Inngest still considered previous stuck runs as active (occupying slots).
    concurrency: { limit: 1, key: 'event.data.jobId' },
    retries: 2,
    triggers: [{ event: 'migration/start' }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFailure: async ({ event, error }: { event: any; error: any }) => {
      const originalEvent = event.data.event
      const jobId = originalEvent?.data?.jobId as string | undefined
      if (!jobId) return
      // Match PENDING too — if the function crashes before the status → RUNNING
      // update, the job stays PENDING ("Queued") forever without this.
      await db.migrationJob.updateMany({
        where: { id: jobId, status: { in: ['PENDING', 'RUNNING'] } },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorLog: `Migration stopped unexpectedly: ${String(error?.message ?? error ?? 'unknown error')}. Please retry.`,
        },
      })
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, cleanFirst, entities: rawEntities } = event.data

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

    // ── Credential check ──────────────────────────────────────────────────────
    const credentialsOk = await step.run('validate-credentials', async () => {
      const ok = await shopify.validate()
      if (!ok) {
        await db.migrationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorLog: 'Shopify credentials are invalid or the app was uninstalled. Please reconnect your Shopify store to start a new migration.',
          },
        })
      }
      return ok
    })
    if (!credentialsOk) return

    // ── GraphQL order detection ───────────────────────────────────────────────
    // Probe whether this token supports GraphQL orderCreate (requires offline token).
    // Memoized by Inngest so replays return the cached boolean instantly.
    // To force REST instead, set USE_GQL_ORDERS = false in shopify.ts.
    if (USE_GQL_ORDERS && entities.orders) {
      const gqlOk = await step.run('detect-order-api', () => shopify.canUseGraphQLOrders())
      if (gqlOk) shopify.enableGqlOrders()
    }

    // ── Phase 0 (optional): Remove CartSwitcher duplicates ────────────────────
    if (cleanFirst) {
      // Run sequentially, not in parallel — both hit the Shopify REST bucket.
      // Parallel execution drains the bucket (40 tokens) twice as fast, triggering
      // the adaptive throttle on every subsequent page and making each scan 3× slower.
      const dupProductIds = entities.products
        ? await step.run('dedup-scan-products', async () => shopify.getCartSwitcherProductDuplicates())
        : []
      const dupOrderIds = entities.orders
        ? await step.run('dedup-scan-orders', async () => shopify.getCartSwitcherOrderDuplicates())
        : []

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

    // ── Phase 1: Counts + existing-order snapshot + small entity fetches ──────
    // Orders and customers are NOT fetched here — they're fetched per-step in
    // Phase 3 so their data is never stored in Inngest's memoization state.
    // (Storing 2476 full order objects in Inngest state caused each subsequent
    // step invocation to deserialize megabytes of data on every replay.)
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

    // Existing orders set is small (just string IDs) — safe to keep in Inngest state
    const existingOrders = new Set<string>(existingOrderIdsArr as string[])

    // Helper: check if this job was cancelled between steps
    const isCancelled = async () => {
      const s = await db.migrationJob.findUnique({ where: { id: jobId }, select: { status: true } })
      return s?.status === 'CANCELLED'
    }

    // ── Phase 2: Products + coupons + posts (small, fetched upfront) ──────────
    const productBatches = chunk(products as NormalizedProduct[], UPLOAD_BATCH)

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

    // ── Phase 3: Customers — fetch + upload per WC page ───────────────────────
    // Each step fetches CUSTOMER_PAGE_SIZE customers from WC and uploads them
    // immediately. Nothing is returned to Inngest state, so replay overhead stays
    // constant regardless of how many steps have completed.
    if (entities.customers && effectiveCustomerCount > 0) {
      const customerPageCount = Math.ceil(effectiveCustomerCount / CUSTOMER_PAGE_SIZE)
      for (let page = 1; page <= customerPageCount; page++) {
        await step.run(`customers-page-${page}`, async () => {
          if (await isCancelled()) return
          const wcCustomers = await wc.getCustomerPage(page, CUSTOMER_PAGE_SIZE)
          let done = 0
          let failed = 0
          const failedLogs: { entityId: string; message: string }[] = []
          for (const customer of wcCustomers) {
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

    // ── Phase 4: Orders — fetch + upload per WC page ──────────────────────────
    // Each step fetches ORDER_PAGE_SIZE orders from WC and uploads them.
    // - existingOrders (built from Shopify at start) is used to skip already-done orders
    // - withTimeout caps each order at ORDER_TIMEOUT_MS so no single order can stall
    // - STEP_BUDGET_MS guard ensures we bail before Vercel's 60s function kill
    // - Steps return nothing → Inngest stores undefined → O(1) replay forever
    if (entities.orders && effectiveOrderCount > 0) {
      const orderPageCount = Math.ceil(effectiveOrderCount / ORDER_PAGE_SIZE)
      for (let page = 1; page <= orderPageCount; page++) {
        await step.run(`orders-page-${page}`, async () => {
          if (await isCancelled()) return
          const stepStart = Date.now()
          const wcOrders = await wc.getOrderPage(page, ORDER_PAGE_SIZE)
          let done = 0
          let failed = 0
          const failedLogs: { entityId: string; message: string }[] = []
          for (const order of wcOrders) {
            if (Date.now() - stepStart > STEP_BUDGET_MS) break
            if (existingOrders.has(order.sourceId)) { done++; continue }
            try {
              await withTimeout(shopify.createOrder(transformOrder(order)), ORDER_TIMEOUT_MS)
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
      const final = await db.migrationJob.findUnique({ where: { id: jobId } })
      if (final?.status === 'CANCELLED') return
      
      const expectedTotal = (final?.totalProducts ?? 0) + (final?.totalOrders ?? 0) + (final?.totalCustomers ?? 0)
      const doneTotal = (final?.doneProducts ?? 0) + (final?.doneOrders ?? 0) + (final?.doneCustomers ?? 0)
      const failedTotal = (final?.failedProducts ?? 0) + (final?.failedOrders ?? 0) + (final?.failedCustomers ?? 0)
      
      const missingTotal = expectedTotal - (doneTotal + failedTotal)
      const throttledErrors = await db.migrationLog.count({
        where: { jobId, status: 'failed', message: { contains: 'throttled' } }
      })
      
      const autoRetryCount = event.data.autoRetryCount ?? 0
      
      // Auto-retry if we missed items (due to step timeouts) or had rate-limit errors, up to 10 times.
      if ((missingTotal > 0 || throttledErrors > 0) && autoRetryCount < 10) {
        await db.migrationJob.update({
          where: { id: jobId },
          data: {
            doneProducts: 0, doneOrders: 0, doneCustomers: 0, doneCoupons: 0, donePosts: 0,
            failedProducts: 0, failedOrders: 0, failedCustomers: 0,
          }
        })
        await db.migrationLog.deleteMany({ where: { jobId } })
        await inngest.send({ 
          name: 'migration/start', 
          data: { ...event.data, autoRetryCount: autoRetryCount + 1 } 
        })
        return
      }

      const hasFailures = failedTotal > 0
      await db.migrationJob.update({
        where: { id: jobId },
        data: { status: hasFailures ? 'PARTIAL' : 'DONE', completedAt: new Date() },
      })
    })
  }
)
