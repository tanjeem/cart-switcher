import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { CheckCircle2, XCircle, AlertTriangle, Package, Users, ShoppingCart, Tag, FileText, ArrowLeft, Clock, RefreshCw } from 'lucide-react'

const G = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

const STATUS_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  DONE:    { label: 'Completed',             icon: <CheckCircle2 className="w-5 h-5" />, color: GD,       bg: GL        },
  PARTIAL: { label: 'Completed with errors', icon: <AlertTriangle className="w-5 h-5" />, color: '#92400e', bg: '#fffbeb' },
  FAILED:  { label: 'Failed',                icon: <XCircle className="w-5 h-5" />,       color: '#b91c1c', bg: '#fef2f2' },
}

export default async function MigrationReportPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { jobId } = await params

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/sign-in')

  const job = await db.migrationJob.findUnique({
    where: { id: jobId },
    include: { logs: { orderBy: { createdAt: 'asc' }, take: 200 } },
  })

  if (!job || job.userId !== user.id) notFound()

  const cfg = STATUS_LABEL[job.status] ?? STATUS_LABEL.DONE
  const totalAll = job.totalProducts + job.totalOrders + job.totalCustomers + job.totalCoupons + job.totalPosts
  const doneAll  = job.doneProducts  + job.doneOrders  + job.doneCustomers  + job.doneCoupons  + job.donePosts
  const duration = job.completedAt && job.startedAt
    ? Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 60000)
    : null

  const rows = [
    { label: 'Products',   icon: Package,      total: job.totalProducts,  done: job.doneProducts  },
    { label: 'Customers',  icon: Users,        total: job.totalCustomers, done: job.doneCustomers },
    { label: 'Orders',     icon: ShoppingCart, total: job.totalOrders,    done: job.doneOrders    },
    { label: 'Coupons',    icon: Tag,          total: job.totalCoupons,   done: job.doneCoupons   },
    { label: 'Blog posts', icon: FileText,     total: job.totalPosts,     done: job.donePosts     },
  ]

  const errorLogs = job.logs.filter(l => l.status === 'error')
  const infoLogs  = job.logs.filter(l => l.status !== 'error')

  return (
    <div className="max-w-[900px] mx-auto px-6 py-8 space-y-8">

      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      {/* Status hero */}
      <div className="rounded-2xl p-6 border-2" style={{ backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }}>
        <div className="flex items-center gap-3 mb-2" style={{ color: cfg.color }}>
          {cfg.icon}
          <h1 className="text-xl font-black">{cfg.label}</h1>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          <span className="font-semibold">{job.wcUrl}</span>
          <span className="mx-2 text-gray-400">→</span>
          <span className="font-semibold">{job.shopifyDomain}</span>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-gray-500">
          <span><span className="font-bold text-gray-900">{doneAll.toLocaleString()}</span> records migrated</span>
          {totalAll > doneAll && <span><span className="font-bold text-red-500">{(totalAll - doneAll).toLocaleString()}</span> skipped / failed</span>}
          {duration !== null && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{duration} min</span>
          )}
          <span>{new Date(job.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Entity breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-black text-gray-900 mb-5">Entity breakdown</h2>
        <div className="space-y-4">
          {rows.map(({ label, icon: Icon, total, done }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const failed = total - done
            return (
              <div key={label} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GL }}>
                  <Icon className="w-4 h-4" style={{ color: G }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-gray-700">{label}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="tabular-nums font-bold text-gray-900">{done.toLocaleString()} / {total.toLocaleString()}</span>
                      {failed > 0 && <span className="text-red-400 font-semibold">{failed} failed</span>}
                      <span className="font-black w-10 text-right" style={{ color: G }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: G }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Errors */}
      {errorLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" /> {errorLogs.length} error{errorLogs.length !== 1 ? 's' : ''}
          </h2>
          <div className="space-y-2">
            {errorLogs.slice(0, 50).map(log => (
              <div key={log.id} className="flex gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-300 text-xs flex-shrink-0 pt-0.5 tabular-nums">{new Date(log.createdAt).toLocaleTimeString()}</span>
                <span className="text-red-600">{log.message}</span>
              </div>
            ))}
            {errorLogs.length > 50 && (
              <div className="text-xs text-gray-400 pt-2">… and {errorLogs.length - 50} more errors. Download full log for details.</div>
            )}
          </div>
        </div>
      )}

      {/* Full log */}
      <div className="bg-[#111] rounded-2xl overflow-hidden shadow-lg">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: G }} />
          <span className="ml-2 text-xs text-white/40 font-mono">migration.log</span>
        </div>
        <div className="h-72 overflow-y-auto p-5 font-mono text-xs space-y-1">
          {infoLogs.map(log => (
            <div key={log.id} className="flex gap-3">
              <span className="text-white/20 flex-shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
              <span className={log.status === 'warn' ? 'text-yellow-400' : 'text-white/60'}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {(job.status === 'PARTIAL' || job.status === 'FAILED') && (
          <Link href="/migrate/connect"
            className="flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full text-white"
            style={{ backgroundColor: G }}>
            <RefreshCw className="w-4 h-4" /> Start a new migration
          </Link>
        )}
        <Link href="/dashboard/support"
          className="flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50">
          Contact support
        </Link>
      </div>
    </div>
  )
}
