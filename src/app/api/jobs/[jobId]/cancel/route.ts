import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const job = await db.migrationJob.findUnique({ where: { id: jobId }, select: { id: true, status: true } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'RUNNING' && job.status !== 'PENDING') {
    return NextResponse.json({ error: 'Job is not running' }, { status: 400 })
  }
  await db.migrationJob.update({
    where: { id: jobId },
    data: { status: 'CANCELLED', completedAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
