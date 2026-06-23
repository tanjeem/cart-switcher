import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const logs = await db.migrationLog.findMany({
    where: { jobId, status: 'failed', entity: 'order' },
    orderBy: { createdAt: 'asc' },
    select: { entityId: true, message: true, createdAt: true },
  })

  const grouped = new Map<string, number>()
  for (const log of logs) {
    const key = log.message
    grouped.set(key, (grouped.get(key) ?? 0) + 1)
  }

  const summary = Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([message, count]) => ({ count, message }))

  return NextResponse.json({ total: logs.length, summary, logs })
}
