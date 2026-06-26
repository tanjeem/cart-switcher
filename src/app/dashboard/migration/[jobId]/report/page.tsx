import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import {
  CheckCircle2, XCircle, AlertTriangle, Package, Users,
  ShoppingCart, Tag, FileText, ArrowLeft, Clock, RefreshCw,
  ExternalLink, Shield, TrendingUp,
} from 'lucide-react'

const G  = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'
const ADMIN_EMAIL = 'tanjeem.adeeb@gmail.com'

function fmtDuration(start: Date, end: Date) {
  const sec = Math.floor((end.getTime() - start.getTime()) / 1000)
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60), s = sec % 60
  if (m < 60) return `${m}m ${s > 0 ? ` ${s}s` : ''}`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export default async function MigrationReportPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { jobId } = await params

  // Admin can view any job; regular user can only see their own
  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)
  const isAdmin = clerkUser.emailAddresses.some(e => e.emailAddress === ADMIN_EMAIL)

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user && !isAdmin) redirect('/sign-in')

  const job = await db.migrationJob.findUnique({
    where: { id: jobId },
    include: { logs: { orderBy: { createdAt: 'asc' } } },
  })

  if (!job) notFound()
  if (!isAdmin && user && job.userId !== user.id) notFound()

  const totalAll = job.totalProducts + job.totalOrders + job.totalCustomers + job.totalCoupons + job.totalPosts
  const doneAll  = job.doneProducts  + job.doneOrders  + job.doneCustomers  + job.doneCoupons  + job.donePosts
  const failedAll = (job.failedProducts ?? 0) + (job.failedOrders ?? 0) + (job.failedCustomers ?? 0)
  const duration = job.completedAt && job.startedAt
    ? fmtDuration(job.startedAt, job.completedAt) : null
  const pctOverall = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0

  const ENTITY_ROWS = [
    { label: 'Products',   icon: Package,      total: job.totalProducts,  done: job.doneProducts,  failed: job.failedProducts ?? 0,  accent: '#818cf8' },
    { label: 'Orders',     icon: ShoppingCart, total: job.totalOrders,    done: job.doneOrders,    failed: job.failedOrders ?? 0,    accent: '#22d3ee' },
    { label: 'Customers',  icon: Users,        total: job.totalCustomers, done: job.doneCustomers, failed: job.failedCustomers ?? 0, accent: '#a78bfa' },
    { label: 'Coupons',    icon: Tag,          total: job.totalCoupons,   done: job.doneCoupons,   failed: 0,                        accent: '#fbbf24' },
    { label: 'Blog Posts', icon: FileText,     total: job.totalPosts,     done: job.donePosts,     failed: 0,                        accent: '#f472b6' },
  ]

  // Group errors by message
  const errorLogs = job.logs.filter(l => l.status === 'error' || l.status === 'failed')
  const errorGroups: Record<string, { count: number; entity: string }> = {}
  errorLogs.forEach(l => {
    const key = l.message ?? 'Unknown error'
    if (!errorGroups[key]) errorGroups[key] = { count: 0, entity: l.entity }
    errorGroups[key].count++
  })
  const errorSummary = Object.entries(errorGroups)
    .sort((a, b) => b[1].count - a[1].count)

  const isSuccess = job.status === 'DONE'
  const isPartial = job.status === 'PARTIAL'
  const isFailed  = job.status === 'FAILED'

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8 space-y-6">

      {/* Back */}
      <Link href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      {/* ── Status hero ── */}
      <div className="rounded-2xl p-6 border-2"
        style={isSuccess
          ? { backgroundColor: GL, borderColor: `${G}40` }
          : isPartial
          ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
          : { backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              {isSuccess && <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: G }}><CheckCircle2 className="w-4 h-4 text-white" /></div>}
              {isPartial && <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-white" /></div>}
              {isFailed  && <div className="w-8 h-8 rounded-xl bg-red-400 flex items-center justify-center"><XCircle className="w-4 h-4 text-white" /></div>}
              <h1 className="text-xl font-black text-gray-900">
                {isSuccess ? 'Migration complete' : isPartial ? 'Completed with errors' : 'Migration failed'}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-mono mb-3">
              <span>{job.wcUrl}</span>
              <span className="text-gray-300">→</span>
              <span>{job.shopifyDomain}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="font-black text-gray-900">{doneAll.toLocaleString()}</span> records migrated
              </span>
              {failedAll > 0 && (
                <span className="flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-black">{failedAll.toLocaleString()}</span> failed
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-black">{duration}</span>
                </span>
              )}
              <span className="text-gray-400">
                {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black tracking-tighter" style={{ color: isSuccess ? G : isPartial ? '#f59e0b' : '#ef4444' }}>
              {pctOverall}%
            </div>
            <div className="text-xs text-gray-400 mt-0.5">overall</div>
          </div>
        </div>

        {/* Overall bar */}
        <div className="mt-5 h-2 rounded-full overflow-hidden bg-white/60">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pctOverall}%`, backgroundColor: isSuccess ? G : isPartial ? '#f59e0b' : '#ef4444' }} />
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { value: doneAll.toLocaleString(),     label: 'Migrated',  sub: 'total records',         color: G           },
          { value: failedAll > 0 ? failedAll.toLocaleString() : '0', label: 'Errors', sub: failedAll > 0 ? 'see breakdown below' : 'clean run', color: failedAll > 0 ? '#f59e0b' : G },
          { value: duration ?? '–',              label: 'Duration',  sub: 'start to finish'                            },
          { value: `${job.totalProducts > 0 ? job.totalProducts.toLocaleString() : '–'}`, label: 'Products', sub: `${job.doneProducts} migrated` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="text-2xl font-black tracking-tight mb-0.5" style={{ color: s.color ?? '#111827' }}>{s.value}</div>
            <div className="text-sm font-semibold text-gray-700">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Entity breakdown ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: G }} />
          <h2 className="font-black text-gray-900 text-sm">Entity breakdown</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {ENTITY_ROWS.map(({ label, icon: Icon, total, done, failed, accent }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const isSkip = total === 0
            const barColor = failed > 0 ? '#f59e0b' : pct === 100 ? G : accent
            return (
              <div key={label} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSkip ? '#f9fafb' : failed > 0 ? '#fef3c7' : GL }}>
                  <Icon className="w-4 h-4" style={{ color: isSkip ? '#d1d5db' : failed > 0 ? '#d97706' : G }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{label}</span>
                      {failed > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{failed} errors</span>
                      )}
                      {!isSkip && pct === 100 && failed === 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: GL, color: GD }}>✓ Done</span>
                      )}
                      {isSkip && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Skipped</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {!isSkip && <span className="tabular-nums text-gray-400 font-mono">{done.toLocaleString()} / {total.toLocaleString()}</span>}
                      {!isSkip && <span className="font-black w-9 text-right tabular-nums" style={{ color: barColor }}>{pct}%</span>}
                    </div>
                  </div>
                  {!isSkip && (
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Error summary ── */}
      {errorSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <h2 className="font-black text-gray-900 text-sm">{errorLogs.length} error{errorLogs.length !== 1 ? 's' : ''}</h2>
            </div>
            <span className="text-xs text-gray-400">{errorSummary.length} distinct type{errorSummary.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {errorSummary.map(([msg, { count, entity }]) => (
              <div key={msg} className="flex items-start gap-3 px-6 py-3">
                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <XCircle className="w-3 h-3 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-relaxed">{msg}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{entity}</p>
                </div>
                {count > 1 && (
                  <span className="flex-shrink-0 text-[10px] font-black bg-red-50 text-red-400 px-2.5 py-1 rounded-full">×{count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Full log terminal ── */}
      <div className="rounded-2xl overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(160deg, #0d1607 0%, #060d02 100%)', border: '1px solid rgba(150,191,72,0.14)' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: G }} />
          </div>
          <span className="ml-2 text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>migration.log</span>
          <span className="ml-auto text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{job.logs.length} events</span>
        </div>
        <div className="h-64 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1">
          {job.logs.map(log => (
            <div key={log.id} className="flex gap-3">
              <span className="flex-shrink-0 tabular-nums select-none" style={{ color: 'rgba(255,255,255,0.18)', minWidth: '80px' }}>
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
              <span style={{
                color: log.status === 'error' || log.status === 'failed' ? '#f87171'
                  : log.status === 'warn' ? '#fbbf24'
                  : log.status === 'done' || log.status === 'success' ? G
                  : '#64748b'
              }}>
                {log.status === 'error' || log.status === 'failed' ? '✗ ' : log.status === 'done' ? '✓ ' : ''}
                {log.message ?? `${log.entity} processed`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust row ── */}
      {isSuccess && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <Shield className="w-4 h-4" />, title: 'Data integrity', sub: 'All records verified against Shopify API' },
            { icon: <CheckCircle2 className="w-4 h-4" />, title: 'SEO preserved', sub: '301 redirects auto-generated for all URLs' },
            { icon: <TrendingUp className="w-4 h-4" />, title: 'Store live', sub: 'WooCommerce stayed online throughout' },
          ].map(t => (
            <div key={t.title} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <span style={{ color: G }}>{t.icon}</span>
              <div>
                <div className="text-xs font-bold text-gray-700">{t.title}</div>
                <div className="text-[10px] text-gray-400">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        {(isPartial || isFailed) && (
          <Link href={`/dashboard/migration/${jobId}`}
            className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full text-white cursor-pointer"
            style={{ backgroundColor: '#f59e0b' }}>
            <RefreshCw className="w-4 h-4" /> Retry errors
          </Link>
        )}
        <Link href="https://admin.shopify.com" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full text-white cursor-pointer"
          style={{ backgroundColor: G }}>
          Open Shopify admin <ExternalLink className="w-4 h-4" />
        </Link>
        <Link href="/dashboard/support"
          className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
          Contact support
        </Link>
      </div>
    </div>
  )
}
