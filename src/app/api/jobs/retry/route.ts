import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const { jobId, entities } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const old = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!old) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Create a fresh job with the same WooCommerce + Shopify credentials
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

    await inngest.send({ name: 'migration/start', data: { jobId: newJob.id, ...(entities ? { entities } : {}) } })

    return NextResponse.json({ jobId: newJob.id })
  } catch (err) {
    console.error('[jobs/retry]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
