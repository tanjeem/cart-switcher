import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const job = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Cancel all running Inngest events for this job
    await inngest.send({ name: 'migration/cancel', data: { jobId } })

    // Mark job as cancelled in DB immediately
    await db.migrationJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[jobs/cancel]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
