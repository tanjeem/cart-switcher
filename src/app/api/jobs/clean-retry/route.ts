import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const { jobId, entities } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const old = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!old) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const updatedJob = await db.migrationJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        completedAt: null,
        errorLog: null,
        doneProducts: 0,
        doneOrders: 0,
        doneCustomers: 0,
        doneCoupons: 0,
        donePosts: 0,
        failedProducts: 0,
        failedOrders: 0,
        failedCustomers: 0,
      },
    })

    await db.migrationLog.deleteMany({ where: { jobId } })

    // cleanFirst: true tells the migration function to delete all existing
    // Shopify data before importing, giving a clean slate
    await inngest.send({ name: 'migration/start', data: { jobId: updatedJob.id, cleanFirst: true, ...(entities ? { entities } : {}) } })

    return NextResponse.json({ jobId: updatedJob.id })
  } catch (err) {
    console.error('[jobs/clean-retry]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
