import { db } from '@/lib/db'

const G = '#96bf48'

const PLAN_PRICES: Record<string, number> = { STARTER: 79, GROWTH: 149, PRO: 249 }

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  STARTER: { bg: '#14532d', text: '#86efac' },
  GROWTH:  { bg: '#1e3a8a', text: '#93c5fd' },
  PRO:     { bg: '#4c1d95', text: '#c4b5fd' },
}

export default async function AdminPaymentsPage() {
  const paidUsers = await db.user.findMany({
    where: { plan: { not: 'FREE' } },
    orderBy: { planActivatedAt: 'desc' },
    select: {
      id: true, email: true, name: true, plan: true,
      planActivatedAt: true, stripeCustomerId: true,
      _count: { select: { jobs: true } },
    },
  })

  const planBreakdown = await db.user.groupBy({
    by: ['plan'],
    _count: { plan: true },
    where: { plan: { not: 'FREE' } },
  })

  const totalRevenue = paidUsers.reduce((s, u) => s + (PLAN_PRICES[u.plan] ?? 0), 0)
  const breakdown = planBreakdown.map(r => ({
    plan: r.plan,
    count: r._count.plan,
    revenue: (PLAN_PRICES[r.plan] ?? 0) * r._count.plan,
  })).sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">
      <h1 className="text-2xl font-black">Payments & Revenue</h1>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-5 col-span-2">
          <div className="text-xs text-white/30 mb-2">Total revenue</div>
          <div className="text-4xl font-black" style={{ color: G }}>${totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-white/30 mt-1">One-time payments · all time</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-5">
          <div className="text-xs text-white/30 mb-2">Paid customers</div>
          <div className="text-3xl font-black text-white">{paidUsers.length}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-5">
          <div className="text-xs text-white/30 mb-2">Avg. revenue</div>
          <div className="text-3xl font-black text-white">
            ${paidUsers.length > 0 ? Math.round(totalRevenue / paidUsers.length) : 0}
          </div>
        </div>
      </div>

      {/* Plan breakdown */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
        <h2 className="font-black mb-4">By plan</h2>
        <div className="space-y-3">
          {breakdown.map(b => {
            const pct = totalRevenue > 0 ? Math.round((b.revenue / totalRevenue) * 100) : 0
            const pc = PLAN_COLORS[b.plan] ?? { bg: '#1f2937', text: '#9ca3af' }
            return (
              <div key={b.plan} className="flex items-center gap-4">
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold w-20 justify-center"
                  style={{ backgroundColor: pc.bg, color: pc.text }}>
                  {b.plan}
                </span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: G }} />
                </div>
                <span className="text-sm font-bold text-white/70 w-24 text-right">
                  ${b.revenue.toLocaleString()} ({b.count})
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Customer list */}
      <div>
        <h2 className="font-black mb-4">All paying customers</h2>
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Customer', 'Plan', 'Revenue', 'Jobs', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paidUsers.map(user => {
                const pc = PLAN_COLORS[user.plan] ?? { bg: '#1f2937', text: '#9ca3af' }
                return (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{user.email}</div>
                      {user.name && <div className="text-xs text-white/30">{user.name}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: pc.bg, color: pc.text }}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold" style={{ color: G }}>
                      ${PLAN_PRICES[user.plan] ?? 0}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-white/60">{user._count.jobs}</td>
                    <td className="px-5 py-4 text-xs text-white/30">
                      {user.planActivatedAt ? new Date(user.planActivatedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
