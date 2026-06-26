'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Package, Users, ShoppingCart, Tag, FileText, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react'

const G = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

type JobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'PARTIAL' | 'CANCELLED'

interface JobSnapshot {
  status: JobStatus
  wcUrl: string
  shopifyDomain: string
  startedAt: string | null
  completedAt: string | null
  totalProducts: number; doneProducts: number
  totalOrders: number;   doneOrders: number
  totalCustomers: number; doneCustomers: number
  totalCoupons: number;  doneCoupons: number
  totalPosts: number;    donePosts: number
  errorCount: number
  logs: { id: string; message: string | null; status: string; entity: string; createdAt: string }[]
}

const ROWS = [
  { key: 'products',  label: 'Products',  icon: Package,      total: 'totalProducts',  done: 'doneProducts'  },
  { key: 'customers', label: 'Customers', icon: Users,        total: 'totalCustomers', done: 'doneCustomers' },
  { key: 'orders',    label: 'Orders',    icon: ShoppingCart, total: 'totalOrders',    done: 'doneOrders'    },
  { key: 'coupons',   label: 'Coupons',   icon: Tag,          total: 'totalCoupons',   done: 'doneCoupons'   },
  { key: 'posts',     label: 'Blog posts',icon: FileText,     total: 'totalPosts',     done: 'donePosts'     },
] as const

function elapsed(startedAt: string | null) {
  if (!startedAt) return '0:00'
  const sec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MigrationLivePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<JobSnapshot | null>(null)
  const [logs, setLogs] = useState<JobSnapshot['logs']>([])
  const [elapsed_, setElapsed] = useState('0:00')
  const logsRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/progress/${jobId}`)
    esRef.current = es
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as JobSnapshot
        setJob(data)
        if (data.logs?.length) setLogs(data.logs)
      } catch {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [jobId])

  useEffect(() => {
    if (!job?.startedAt || job.status === 'DONE' || job.status === 'FAILED' || job.status === 'PARTIAL') return
    const t = setInterval(() => setElapsed(elapsed(job.startedAt)), 1000)
    return () => clearInterval(t)
  }, [job?.startedAt, job?.status])

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logs])

  if (!job) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <span className="w-7 h-7 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm">Connecting to migration…</span>
        </div>
      </div>
    )
  }

  const isDone = job.status === 'DONE' || job.status === 'PARTIAL' || job.status === 'FAILED'
  const totalAll = ROWS.reduce((s, r) => s + (job[r.total] as number), 0)
  const doneAll  = ROWS.reduce((s, r) => s + (job[r.done]  as number), 0)
  const pctOverall = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0

  const LOG_COLORS: Record<string, string> = {
    info:    '#6b7280',
    warn:    '#d97706',
    warning: '#d97706',
    error:   '#ef4444',
    failed:  '#ef4444',
    done:    G,
    success: G,
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {!isDone && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
            )}
            {isDone && job.status === 'DONE' && <CheckCircle2 className="w-5 h-5" style={{ color: G }} />}
            {isDone && job.status !== 'DONE' && <XCircle className="w-5 h-5 text-red-400" />}
            <h1 className="text-xl font-black text-gray-900">
              {isDone ? (job.status === 'DONE' ? 'Migration complete' : 'Migration finished with issues') : 'Migration in progress'}
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            {job.wcUrl} <span className="mx-2">→</span> {job.shopifyDomain}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isDone && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-4 h-4" /> {elapsed_}
            </div>
          )}
          {isDone && (
            <Link href={`/dashboard/migration/${jobId}/report`}
              className="flex items-center gap-2 text-white font-bold text-sm px-4 py-2 rounded-full"
              style={{ backgroundColor: G }}>
              Full report <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-900">Overall progress</span>
          <span className="text-sm font-black" style={{ color: G }}>{pctOverall}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pctOverall}%`, backgroundColor: G }} />
        </div>
        <div className="grid gap-3">
          {ROWS.map(({ key, label, icon: Icon, total, done }) => {
            const t = job[total] as number
            const d = job[done]  as number
            const pct = t > 0 ? Math.round((d / t) * 100) : 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Icon className="w-4 h-4 text-gray-400" />
                    {label}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="tabular-nums font-semibold text-gray-700">{d.toLocaleString()}</span>
                    <span>/</span>
                    <span className="tabular-nums">{t.toLocaleString()}</span>
                    <span className="w-12 text-right font-bold" style={{ color: G }}>{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: G }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Live log */}
      <div className="bg-[#111] rounded-2xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: G }} />
            <span className="ml-2 text-xs text-white/40 font-mono">migration.log</span>
          </div>
          {!isDone && (
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              live
            </span>
          )}
        </div>
        <div ref={logsRef} className="h-64 overflow-y-auto p-5 font-mono text-xs space-y-1 scroll-smooth">
          {logs.length === 0 && (
            <span className="text-white/20">Waiting for log output…</span>
          )}
          {logs.map(log => (
            <div key={log.id} className="flex gap-3">
              <span className="text-white/20 flex-shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
              <span style={{ color: LOG_COLORS[log.status] ?? '#6b7280' }}>{log.message ?? `${log.entity} processed`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Done state */}
      {isDone && (
        <div className="rounded-2xl p-6 border-2 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={job.status === 'DONE'
            ? { backgroundColor: GL, borderColor: `${G}50` }
            : { backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex-1">
            <div className="font-black text-gray-900 mb-1">
              {job.status === 'DONE' ? `${doneAll.toLocaleString()} records migrated successfully` : `Migration finished with ${job.errorCount} error${job.errorCount !== 1 ? 's' : ''}`}
            </div>
            <div className="text-sm text-gray-500">
              {job.status === 'DONE'
                ? 'Your Shopify store is ready. Check the full report for the SEO redirect map.'
                : 'Some records may need attention. View the full report for details.'}
            </div>
          </div>
          <Link href={`/dashboard/migration/${jobId}/report`}
            className="flex-shrink-0 flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full text-white"
            style={{ backgroundColor: job.status === 'DONE' ? G : '#ef4444' }}>
            View report <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
