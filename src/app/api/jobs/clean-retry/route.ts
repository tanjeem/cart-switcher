import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const { jobId, entities } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const old = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!old) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (old.status === 'RUNNING' || old.status === 'PENDING') {
      await db.migrationJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', completedAt: new Date() },
      })
    }

    const newJob = await db.migrationJob.create({
      data: {
        userId: old.userId,
        wcUrl: old.wcUrl,
        wcKey: old.wcKey,
        wcSecret: old.wcSecret,
        shopifyDomain: old.shopifyDomain,
        shopifyAccessToken: old.shopifyAccessToken,
        isDemo: old.isDemo,
        status: 'PENDING',
      },
    })

    // cleanFirst: true tells the migration function to delete all existing
    // Shopify data before importing, giving a clean slate
    await inngest.send({ name: 'migration/start', data: { jobId: newJob.id, cleanFirst: true, ...(entities ? { entities } : {}) } })

    return NextResponse.json({ jobId: newJob.id })
  } catch (err) {
    console.error('[jobs/clean-retry]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
