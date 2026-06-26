import { db } from '@/lib/db'
import Link from 'next/link'
import { MessageCircle, Zap } from 'lucide-react'

const G = '#96bf48'

const PLAN_COLORS: Record<string, string> = {
  FREE:    '#4b5563',
  STARTER: '#16a34a',
  GROWTH:  '#2563eb',
  PRO:     '#7c3aed',
}

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { jobs: true, chatMessages: true } },
      jobs: { where: { isDemo: false }, select: { status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">All users</h1>
        <span className="text-sm text-white/40">{users.length} total</span>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Email', 'Plan', 'Jobs', 'Last status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const lastJob = user.jobs[0]
              return (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{user.email}</div>
                    {user.name && <div className="text-xs text-white/30">{user.name}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: PLAN_COLORS[user.plan] ?? '#4b5563' }}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4 tabular-nums text-white/60">{user._count.jobs}</td>
                  <td className="px-5 py-4">
                    {lastJob ? (
                      <span className="text-xs font-semibold text-white/50">{lastJob.status}</span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-white/30">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/chat?userId=${user.id}`}
                        className="flex items-center gap-1 text-xs font-semibold hover:text-white transition-colors"
                        style={{ color: G }}>
                        <MessageCircle className="w-3.5 h-3.5" />
                        {user._count.chatMessages > 0 ? user._count.chatMessages : 'Chat'}
                      </Link>
                      <Link href={`/admin/migrations?userId=${user.id}`}
                        className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                        <Zap className="w-3.5 h-3.5" /> Jobs
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
