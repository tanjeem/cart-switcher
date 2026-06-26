import { db } from '@/lib/db'
import Link from 'next/link'
import { Users, Zap, CreditCard, ArrowRight, TrendingUp } from 'lucide-react'

const G = '#96bf48'
const GL = '#eef7e0'

export default async function AdminOverviewPage() {
  const [userCount, jobCount, paidUsers, recentJobs] = await Promise.all([
    db.user.count(),
    db.migrationJob.count({ where: { isDemo: false } }),
    db.user.count({ where: { plan: { not: 'FREE' } } }),
    db.migrationJob.findMany({
      where: { isDemo: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { email: true, plan: true } } },
    }),
  ])

  const runningJobs = await db.migrationJob.count({ where: { status: 'RUNNING' } })
  const revenue = await db.user.groupBy({
    by: ['plan'],
    _count: { plan: true },
    where: { plan: { not: 'FREE' } },
  })

  const PLAN_PRICES: Record<string, number> = { STARTER: 79, GROWTH: 149, PRO: 249 }
  const totalRevenue = revenue.reduce((s, r) => s + (PLAN_PRICES[r.plan] ?? 0) * r._count.plan, 0)

  const stats = [
    { label: 'Total users',    value: userCount,   icon: <Users className="w-5 h-5" />,    href: '/admin/users'      },
    { label: 'Paid users',     value: paidUsers,   icon: <CreditCard className="w-5 h-5" />, href: '/admin/payments'  },
    { label: 'All migrations', value: jobCount,    icon: <Zap className="w-5 h-5" />,       href: '/admin/migrations' },
    { label: 'Est. revenue',   value: `$${totalRevenue.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, href: '/admin/payments' },
  ]

  const STATUS_COLOR: Record<string, string> = {
    DONE:    G,
    RUNNING: '#3b82f6',
    FAILED:  '#ef4444',
    PARTIAL: '#f59e0b',
    PENDING: '#9ca3af',
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black">Admin overview</h1>
        {runningJobs > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-sm text-white/60">{runningJobs} migration{runningJobs !== 1 ? 's' : ''} running right now</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}
            className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-5 hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 text-white/40 mb-3">
              {stat.icon}
              <span className="text-xs font-semibold">{stat.label}</span>
            </div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
          </Link>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
        <h2 className="font-black mb-4">Plan breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          {revenue.map(r => (
            <div key={r.plan} className="text-center p-4 bg-white/5 rounded-xl">
              <div className="text-2xl font-black" style={{ color: G }}>{r._count.plan}</div>
              <div className="text-sm text-white/50 mt-1">{r.plan}</div>
              <div className="text-xs text-white/30 mt-0.5">${(PLAN_PRICES[r.plan] ?? 0) * r._count.plan}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent migrations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black">Recent migrations</h2>
          <Link href="/admin/migrations" className="text-sm flex items-center gap-1 hover:underline" style={{ color: G }}>
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-2">
          {recentJobs.map(job => (
            <div key={job.id} className="bg-[#1a1a1a] rounded-xl border border-white/10 px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{job.wcUrl}</div>
                <div className="text-xs text-white/40 mt-0.5">{job.user.email} · {job.user.plan}</div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-white/30">{new Date(job.createdAt).toLocaleDateString()}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[job.status] ?? '#9ca3af' }} />
                <span className="text-xs font-semibold text-white/50">{job.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
