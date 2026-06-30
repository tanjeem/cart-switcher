import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { CheckCircle2, Clock, AlertTriangle, Zap, ArrowRight, Package, Users, ShoppingCart, Tag, FileText, RefreshCw } from 'lucide-react'

const G = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  PENDING:   { label: 'Queued',    dot: '#9ca3af', bg: '#f9fafb', text: '#6b7280' },
  RUNNING:   { label: 'Running',   dot: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
  DONE:      { label: 'Complete',  dot: G,         bg: GL,        text: GD        },
  PARTIAL:   { label: 'Partial',   dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  FAILED:    { label: 'Failed',    dot: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
  CANCELLED: { label: 'Cancelled', dot: '#9ca3af', bg: '#f9fafb', text: '#6b7280' },
}

const PLAN_LIMITS: Record<string, string> = {
  FREE:    'No plan — upgrade to migrate',
  STARTER: 'Starter · up to 2,000 products',
  GROWTH:  'Growth · up to 15,000 products',
  PRO:     'Pro · unlimited',
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="text-gray-400">{icon}</span>
      <span className="font-semibold text-gray-700 tabular-nums">{value.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  )
}

const ADMIN_EMAIL = 'tanjeem.adeeb@gmail.com'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''
  if (email === ADMIN_EMAIL) redirect('/admin')

  const sp = await searchParams
  const isWelcome = sp.welcome === '1'

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: {
      jobs: {
        where: { isDemo: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  const plan = user?.plan ?? 'FREE'
  const jobs = user?.jobs ?? []
  const activeJob = jobs.find(j => j.status === 'RUNNING' || j.status === 'PENDING')
  const pastJobs = jobs.filter(j => j.status !== 'RUNNING' && j.status !== 'PENDING')
  const firstName = clerkUser?.firstName ?? 'there'

  const totalMigrated = jobs.reduce((s, j) => s + j.doneProducts + j.doneOrders + j.doneCustomers + j.doneCoupons + j.donePosts, 0)

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">

      {/* Welcome banner */}
      {isWelcome && (
        <div className="rounded-2xl p-5 border-2 flex items-center gap-4"
          style={{ backgroundColor: GL, borderColor: `${G}50` }}>
          <span className="text-3xl">🎉</span>
          <div>
            <div className="font-black text-gray-900">You&apos;re all set, {firstName}!</div>
            <div className="text-sm text-gray-600">Your {plan} plan is active. Connect your stores and start migrating.</div>
          </div>
          <Link href="/migrate/connect"
            className="ml-auto flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-full text-sm whitespace-nowrap"
            style={{ backgroundColor: G }}>
            Start migration <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Hey, {firstName} 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5">{PLAN_LIMITS[plan]}</p>
        </div>
        {plan === 'FREE' ? (
          <Link href="/checkout"
            className="flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full border-2 transition-all hover:scale-[1.02]"
            style={{ color: GD, borderColor: G, backgroundColor: GL }}>
            Upgrade to migrate <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link href="/migrate/connect"
            className="flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-all hover:opacity-90"
            style={{ backgroundColor: G }}>
            <Zap className="w-4 h-4" /> New migration
          </Link>
        )}
      </div>

      {/* Stats row */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Migrations',     value: jobs.length,                                                              icon: <RefreshCw className="w-4 h-4" />     },
            { label: 'Records moved',  value: totalMigrated,                                                            icon: <Package className="w-4 h-4" />       },
            { label: 'Completed',      value: jobs.filter(j => j.status === 'DONE').length,                            icon: <CheckCircle2 className="w-4 h-4" />  },
            { label: 'Partial/failed', value: jobs.filter(j => j.status === 'PARTIAL' || j.status === 'FAILED').length, icon: <AlertTriangle className="w-4 h-4" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                {stat.icon}
                <span className="text-xs font-semibold">{stat.label}</span>
              </div>
              <div className="text-2xl font-black text-gray-900 tabular-nums">{stat.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active migration */}
      {activeJob && (
        <div className="bg-white rounded-2xl border-2 p-6 shadow-sm" style={{ borderColor: '#3b82f6' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <span className="font-bold text-gray-900">Migration in progress</span>
            </div>
            <StatusBadge status={activeJob.status} />
          </div>
          <div className="text-sm text-gray-500 mb-4">
            <span className="font-semibold text-gray-700">{activeJob.wcUrl}</span>
            <span className="mx-2 text-gray-300">→</span>
            <span className="font-semibold text-gray-700">{activeJob.shopifyDomain}</span>
          </div>
          <div className="space-y-2 mb-4">
            {[
              { label: 'Products',  done: activeJob.doneProducts,  total: activeJob.totalProducts  },
              { label: 'Customers', done: activeJob.doneCustomers, total: activeJob.totalCustomers },
              { label: 'Orders',    done: activeJob.doneOrders,    total: activeJob.totalOrders    },
            ].map(r => {
              const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0
              return (
                <div key={r.label}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{r.label}</span>
                    <span className="font-semibold tabular-nums">{r.done.toLocaleString()} / {r.total.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: G }} />
                  </div>
                </div>
              )
            })}
          </div>
          <Link href={`/migrate/progress/${activeJob.id}`}
            className="inline-flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-all hover:opacity-90"
            style={{ backgroundColor: '#3b82f6' }}>
            View live progress <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Past migrations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900">Migration history</h2>
          {pastJobs.length > 0 && (
            <span className="text-xs text-gray-400">{pastJobs.length} migration{pastJobs.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {pastJobs.length === 0 && !activeJob ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: GL }}>
              <Zap className="w-7 h-7" style={{ color: G }} />
            </div>
            <h3 className="font-black text-gray-900 text-lg mb-2">No migrations yet</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">Connect your WooCommerce store and we&apos;ll move everything to Shopify in under an hour.</p>
            {plan === 'FREE' ? (
              <Link href="/checkout"
                className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-full"
                style={{ backgroundColor: G, color: 'white' }}>
                Choose a plan <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link href="/migrate/connect"
                className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-full text-white"
                style={{ backgroundColor: G }}>
                Start first migration <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pastJobs.map(job => {
              const totalRecords = job.doneProducts + job.doneOrders + job.doneCustomers + job.doneCoupons + job.donePosts
              const duration = job.completedAt && job.startedAt
                ? Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 60000)
                : null
              return (
                <div key={job.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm truncate">{job.wcUrl}</span>
                        <span className="text-gray-300 text-xs">→</span>
                        <span className="font-semibold text-gray-700 text-sm truncate">{job.shopifyDomain}</span>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <MiniStat icon={<Package className="w-3 h-3" />}      label="products"   value={job.doneProducts}  />
                        <MiniStat icon={<Users className="w-3 h-3" />}        label="customers"  value={job.doneCustomers} />
                        <MiniStat icon={<ShoppingCart className="w-3 h-3" />} label="orders"     value={job.doneOrders}    />
                        <MiniStat icon={<Tag className="w-3 h-3" />}          label="coupons"    value={job.doneCoupons}   />
                        <MiniStat icon={<FileText className="w-3 h-3" />}     label="posts"      value={job.donePosts}     />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleDateString()}</div>
                      {duration !== null && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" /> {duration}m
                        </div>
                      )}
                      <div className="text-xs font-bold" style={{ color: GD }}>{totalRecords.toLocaleString()} records</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                    <Link href={`/dashboard/migration/${job.id}/report`}
                      className="text-xs font-bold hover:underline" style={{ color: G }}>
                      View report →
                    </Link>
                    {(job.status === 'FAILED' || job.status === 'PARTIAL') && (
                      <Link href="/migrate/connect"
                        className="text-xs text-gray-400 hover:text-gray-700 font-medium">
                        Re-migrate
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upgrade nudge for FREE users with no jobs */}
      {plan === 'FREE' && jobs.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GL }}>
            <Zap className="w-5 h-5" style={{ color: G }} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 mb-0.5">Ready to migrate?</div>
            <div className="text-sm text-gray-400">Plans start at $79 one-time. Half the price of Cart2Cart, 7-day refund if anything fails.</div>
          </div>
          <Link href="/checkout"
            className="flex-shrink-0 flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-full"
            style={{ backgroundColor: G }}>
            See plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
