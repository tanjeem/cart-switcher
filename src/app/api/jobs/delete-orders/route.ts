import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const job = await db.migrationJob.findUnique({ where: { id: jobId } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const runId = `${Date.now()}`

    await db.migrationJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', completedAt: null, errorLog: null, inngestId: runId, startedAt: new Date() },
    })

    await inngest.send({
      name: 'migration/delete-orders',
      data: { jobId, runId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[jobs/delete-orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
