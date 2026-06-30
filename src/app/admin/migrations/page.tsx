import { db } from '@/lib/db'
import { Suspense } from 'react'
import Link from 'next/link'

const G = '#96bf48'

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  DONE:      { bg: '#14532d', text: '#86efac' },
  RUNNING:   { bg: '#1e3a8a', text: '#93c5fd' },
  PARTIAL:   { bg: '#78350f', text: '#fcd34d' },
  FAILED:    { bg: '#7f1d1d', text: '#fca5a5' },
  PENDING:   { bg: '#1f2937', text: '#9ca3af' },
  CANCELLED: { bg: '#1f2937', text: '#6b7280' },
}

async function MigrationsList({ userId }: { userId?: string }) {
  const jobs = await db.migrationJob.findMany({
    where: { isDemo: false, ...(userId ? { userId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { email: true, plan: true } } },
  })

  return (
    <div className="space-y-2">
      {jobs.length === 0 && (
        <div className="text-center py-16 text-white/30">No migrations found</div>
      )}
      {jobs.map(job => {
        const sc = STATUS_COLOR[job.status] ?? STATUS_COLOR.PENDING
        const totalDone = job.doneProducts + job.doneOrders + job.doneCustomers + job.doneCoupons + job.donePosts
        const totalAll  = job.totalProducts + job.totalOrders + job.totalCustomers + job.totalCoupons + job.totalPosts
        const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0
        const duration = job.completedAt && job.startedAt
          ? Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 60000)
          : null

        return (
          <Link key={job.id} href={`/dashboard/migration/${job.id}`} className="block bg-[#1a1a1a] rounded-xl border border-white/10 px-5 py-4 hover:border-white/20 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-white text-sm truncate">{job.wcUrl}</span>
                  <span className="text-white/20 text-xs">→</span>
                  <span className="text-white/60 text-sm truncate">{job.shopifyDomain}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: sc.bg, color: sc.text }}>
                    {job.status}
                  </span>
                </div>
                <div className="text-xs text-white/30 mb-3">{job.user.email} · {job.user.plan} plan</div>

                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: G }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                  <span>{job.doneProducts.toLocaleString()} products</span>
                  <span>{job.doneCustomers.toLocaleString()} customers</span>
                  <span>{job.doneOrders.toLocaleString()} orders</span>
                  <span className="font-semibold" style={{ color: G }}>{pct}% complete</span>
                  {duration !== null && <span>{duration}m</span>}
                </div>
              </div>
              <div className="text-xs text-white/30 flex-shrink-0">
                {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default async function AdminMigrationsPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const sp = await searchParams
  const userId = sp.userId

  const [total, running, done, failed] = await Promise.all([
    db.migrationJob.count({ where: { isDemo: false } }),
    db.migrationJob.count({ where: { status: 'RUNNING' } }),
    db.migrationJob.count({ where: { status: 'DONE' } }),
    db.migrationJob.count({ where: { status: { in: ['FAILED', 'PARTIAL'] } } }),
  ])

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Migrations</h1>
        {userId && (
          <a href="/admin/migrations" className="text-sm hover:underline" style={{ color: G }}>
            ← All migrations
          </a>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',   value: total   },
          { label: 'Running', value: running  },
          { label: 'Done',    value: done     },
          { label: 'Failed',  value: failed   },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] rounded-xl border border-white/10 p-4">
            <div className="text-xs text-white/30 mb-1">{s.label}</div>
            <div className="text-2xl font-black text-white">{s.value}</div>
          </div>
        ))}
      </div>

      <Suspense fallback={<div className="text-white/30 text-sm">Loading…</div>}>
        <MigrationsList userId={userId} />
      </Suspense>
    </div>
  )
}
