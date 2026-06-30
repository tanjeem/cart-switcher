import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const { jobId, entities, deleteAll } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const old = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!old) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const entitiesObj = Array.isArray(entities)
      ? { products: entities.includes('products'), customers: entities.includes('customers'), orders: entities.includes('orders'), coupons: entities.includes('coupons'), posts: entities.includes('posts') }
      : entities ?? null

    // Only reset counts for entities being run — leave others untouched so they don't appear as Queued
    const runAll = !entitiesObj
    const resetData: Record<string, unknown> = { status: 'PENDING', completedAt: null, errorLog: null }
    if (runAll || entitiesObj.products)  { resetData.doneProducts = 0;  resetData.totalProducts = 0;  resetData.failedProducts = 0 }
    if (runAll || entitiesObj.orders)    { resetData.doneOrders = 0;    resetData.totalOrders = 0;    resetData.failedOrders = 0 }
    if (runAll || entitiesObj.customers) { resetData.doneCustomers = 0; resetData.totalCustomers = 0; resetData.failedCustomers = 0 }
    if (runAll || entitiesObj.coupons)   { resetData.doneCoupons = 0;   resetData.totalCoupons = 0 }
    if (runAll || entitiesObj.posts)     { resetData.donePosts = 0;     resetData.totalPosts = 0 }

    const updatedJob = await db.migrationJob.update({ where: { id: jobId }, data: resetData })

    // Delete logs only for the entities being run
    const entityLogKeys = runAll
      ? undefined
      : ['products', 'orders', 'customers', 'coupons', 'posts'].filter(e => entitiesObj[e as keyof typeof entitiesObj])
    await db.migrationLog.deleteMany({ where: { jobId, ...(entityLogKeys ? { entity: { in: entityLogKeys } } : {}) } })

    await inngest.send({ name: 'migration/start', data: { jobId: updatedJob.id, ...(entitiesObj ? { entities: entitiesObj } : {}), ...(deleteAll ? { deleteAll: true } : {}) } })

    return NextResponse.json({ jobId: updatedJob.id })
  } catch (err) {
    console.error('[jobs/retry]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
