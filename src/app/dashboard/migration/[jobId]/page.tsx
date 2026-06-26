'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Users, ShoppingCart, Tag, FileText,
  CheckCircle2, AlertTriangle, Clock, ArrowRight,
  RefreshCw, ChevronDown, ExternalLink, Zap,
  TrendingUp, Shield, XCircle,
} from 'lucide-react'

const G  = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

type JobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'PARTIAL' | 'CANCELLED'

interface RawLog {
  id: string
  message: string | null
  status: string
  entity: string
  createdAt: string
}

interface JobSnapshot {
  status: JobStatus
  wcUrl: string
  shopifyDomain: string
  startedAt: string | null
  completedAt: string | null
  totalProducts: number;  doneProducts: number;  failedProducts: number
  totalOrders: number;    doneOrders: number;    failedOrders: number
  totalCustomers: number; doneCustomers: number; failedCustomers: number
  totalCoupons: number;   doneCoupons: number
  totalPosts: number;     donePosts: number
  errorCount: number
  logs: RawLog[]
}

const ENTITY_ROWS = [
  { key: 'products',  label: 'Products',   icon: Package,      total: 'totalProducts'  as const, done: 'doneProducts'  as const, failed: 'failedProducts'  as const, accent: '#818cf8' },
  { key: 'orders',    label: 'Orders',     icon: ShoppingCart, total: 'totalOrders'    as const, done: 'doneOrders'    as const, failed: 'failedOrders'    as const, accent: '#22d3ee' },
  { key: 'customers', label: 'Customers',  icon: Users,        total: 'totalCustomers' as const, done: 'doneCustomers' as const, failed: 'failedCustomers' as const, accent: '#a78bfa' },
  { key: 'coupons',   label: 'Coupons',    icon: Tag,          total: 'totalCoupons'   as const, done: 'doneCoupons'   as const, failed: null,                        accent: '#fbbf24' },
  { key: 'posts',     label: 'Blog Posts', icon: FileText,     total: 'totalPosts'     as const, done: 'donePosts'     as const, failed: null,                        accent: '#f472b6' },
] as const

/* ── helpers ─────────────────────────────────────────────────── */
function fmtElapsed(startedAt: string | null) {
  if (!startedAt) return '0:00'
  const sec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function fmtDuration(start: string | null, end: string | null) {
  if (!start || !end) return null
  const sec = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60), s = sec % 60
  if (m < 60) return `${m}m ${s}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function fmtOffset(startedAt: string | null, iso: string) {
  if (!startedAt) return '0:00'
  const sec = Math.max(0, Math.floor((new Date(iso).getTime() - new Date(startedAt).getTime()) / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

interface DisplayLine {
  id: string; ts: string; text: string
  type: 'info' | 'ok' | 'error' | 'warn' | 'batch' | 'system'
}

function buildDisplayLines(logs: RawLog[], startedAt: string | null): DisplayLine[] {
  const lines: DisplayLine[] = []
  if (startedAt) lines.push({ id: '__start', ts: '0:00', text: 'Migration started', type: 'system' })

  // Group error messages to show summary lines instead of 37 identical rows
  const errorGroups: Record<string, { count: number; entity: string; ts: string; firstId: string }> = {}

  // Pass 1 — collect errors grouped by message
  logs.forEach(log => {
    const status = (log.status ?? '').toLowerCase()
    if (status !== 'error' && status !== 'failed') return
    const msg = log.message ?? 'Unknown error'
    const key = `${log.entity}::${msg}`
    if (!errorGroups[key]) {
      errorGroups[key] = { count: 0, entity: log.entity, ts: fmtOffset(startedAt, log.createdAt), firstId: log.id }
    }
    errorGroups[key].count++
  })

  // Pass 2 — non-error logs → batch lines
  const batchState: Record<string, { count: number; total: number }> = {}
  const seenErrors = new Set<string>()

  logs.forEach((log, idx) => {
    const ts = fmtOffset(startedAt, log.createdAt)
    const entity = log.entity ?? 'unknown'
    const msg = log.message ?? ''
    const status = (log.status ?? '').toLowerCase()

    if (status === 'error' || status === 'failed') {
      const key = `${entity}::${msg}`
      if (!seenErrors.has(key)) {
        seenErrors.add(key)
        const g = errorGroups[key]
        lines.push({
          id: log.id,
          ts,
          text: g.count > 1
            ? `✗ ${g.count}× ${msg} (${entity})`
            : `✗ ${msg}`,
          type: 'error',
        })
      }
      return
    }
    if (status === 'warn' || status === 'warning') {
      lines.push({ id: log.id, ts, text: `⚠ ${msg}`, type: 'warn' }); return
    }

    const totalMatch = msg.match(/(\d[\d,]+)\s+(\w+)\s+found/i)
    const doneMatch  = msg.match(/(done|complete|migrated|pushed|imported)/i)
    const fetchMatch = msg.match(/(fetch|start|begin|migrating)/i)

    if (totalMatch) {
      const count   = parseInt(totalMatch[1].replace(/,/g, ''))
      const batches = Math.ceil(count / 50)
      batchState[entity] = { count: 0, total: count }
      lines.push({ id: log.id, ts, text: `Found ${totalMatch[1]} ${totalMatch[2]} — ${batches} batch${batches !== 1 ? 'es' : ''}`, type: 'info' })
      return
    }
    if ((status === 'done' || status === 'success' || doneMatch) && batchState[entity]) {
      const st = batchState[entity]
      st.count++
      const from = (st.count - 1) * 50 + 1
      const to   = Math.min(st.count * 50, st.total)
      lines.push({ id: log.id + '_f', ts, text: `Fetching ${entity} batch ${st.count}/${Math.ceil(st.total / 50)}…`, type: 'batch' })
      lines.push({ id: log.id + '_p', ts, text: `✓ ${entity.charAt(0).toUpperCase() + entity.slice(1)} ${from}–${to} pushed to Shopify`, type: 'ok' })
      return
    }
    if (fetchMatch && batchState[entity]) {
      const st = batchState[entity]
      st.count++
      lines.push({ id: log.id, ts, text: `Fetching ${entity} batch ${st.count}/${Math.ceil(st.total / 50)}…`, type: 'batch' })
      return
    }
    lines.push({ id: log.id, ts, text: msg || `${entity} processed`, type: 'info' })
  })

  return lines
}

/* ── entity card ─────────────────────────────────────────────── */
function EntityCard({
  row, job, logs, onRetry,
}: {
  row: typeof ENTITY_ROWS[number]
  job: JobSnapshot
  logs: RawLog[]
  onRetry: (entity: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon    = row.icon
  const total   = job[row.total] as number
  const done    = job[row.done]  as number
  const failed  = row.failed ? (job[row.failed] as number) : 0
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0
  const isDone  = done > 0 && done >= total - failed
  const hasErr  = failed > 0
  const isSkip  = total === 0

  // Deduplicated error messages for this entity
  const entityErrors = useMemo(() => {
    const errs = logs.filter(l => l.entity === row.key && (l.status === 'error' || l.status === 'failed') && l.message)
    const grouped: Record<string, number> = {}
    errs.forEach(l => { grouped[l.message!] = (grouped[l.message!] ?? 0) + 1 })
    return Object.entries(grouped).map(([msg, count]) => ({ msg, count }))
  }, [logs, row.key])

  const barColor = isSkip ? '#e5e7eb'
    : hasErr && isDone ? '#f59e0b'
    : isDone ? G
    : pct > 0 ? row.accent
    : '#e5e7eb'

  const status = isSkip ? 'skipped'
    : isDone && hasErr ? 'partial'
    : isDone ? 'done'
    : pct > 0 ? 'running'
    : 'waiting'

  return (
    <motion.div layout className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: hasErr ? '#fde68a' : isDone ? `${G}30` : '#f3f4f6',
        backgroundColor: hasErr ? '#fffbeb' : isDone ? '#fafffe' : 'white',
      }}>
      {/* Main row */}
      <div className={`flex items-center gap-4 px-5 py-4 ${hasErr ? 'cursor-pointer' : ''}`}
        onClick={() => hasErr && setExpanded(o => !o)}>

        {/* Icon bubble */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: isSkip ? '#f9fafb'
                : hasErr ? '#fef3c7'
                : isDone ? GL
                : `${row.accent}15`,
            }}>
            <Icon className="w-5 h-5" style={{
              color: isSkip ? '#d1d5db'
                : hasErr ? '#d97706'
                : isDone ? G
                : pct > 0 ? row.accent
                : '#9ca3af'
            }} />
          </div>
          {isDone && !hasErr && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: G }}>
              <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          )}
          {hasErr && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">{row.label}</span>
              {/* Status pill */}
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: status === 'done' ? GL
                    : status === 'partial' ? '#fef3c7'
                    : status === 'running' ? `${row.accent}15`
                    : '#f3f4f6',
                  color: status === 'done' ? GD
                    : status === 'partial' ? '#92400e'
                    : status === 'running' ? row.accent
                    : '#9ca3af',
                }}>
                {status === 'done' ? '✓ Done'
                  : status === 'partial' ? `${failed} errors`
                  : status === 'running' ? 'Running'
                  : status === 'waiting' ? 'Queued'
                  : 'Skipped'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              {!isSkip && (
                <span className="tabular-nums text-gray-400 font-mono">
                  {done.toLocaleString()}<span className="text-gray-200 mx-1">/</span>{total.toLocaleString()}
                </span>
              )}
              {!isSkip && (
                <span className="font-black tabular-nums w-10 text-right" style={{ color: barColor }}>
                  {isSkip ? '–' : `${pct}%`}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!isSkip && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
              <motion.div className="h-full rounded-full"
                style={{ backgroundColor: barColor, boxShadow: pct > 0 && pct < 100 ? `0 0 6px ${barColor}80` : 'none' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }} />
            </div>
          )}
        </div>

        {hasErr && (
          <ChevronDown className={`w-4 h-4 text-amber-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Error drawer */}
      <AnimatePresence>
        {expanded && hasErr && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden">
            <div className="border-t border-amber-100 mx-5 mb-4 pt-4 space-y-3">
              {/* Error list */}
              <div className="space-y-1.5">
                {entityErrors.map(({ msg, count }) => (
                  <div key={msg} className="flex items-start gap-2.5 text-xs">
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 flex-1">{msg}</span>
                    {count > 1 && (
                      <span className="text-[10px] font-black bg-red-50 text-red-400 px-2 py-0.5 rounded-full flex-shrink-0">×{count}</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Retry CTA */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-gray-400">
                  Retrying will only attempt the {failed} failed {row.label.toLowerCase()}.
                </p>
                <button onClick={e => { e.stopPropagation(); onRetry(row.key) }}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white transition-all hover:opacity-90 flex-shrink-0 ml-3"
                  style={{ backgroundColor: '#f59e0b' }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry {row.label}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── stats card ──────────────────────────────────────────────── */
function StatCard({ value, label, sub, color }: { value: string; label: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="text-2xl font-black tracking-tight mb-0.5" style={{ color: color ?? '#111827' }}>{value}</div>
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

/* ── main page ───────────────────────────────────────────────── */
export default function MigrationLivePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job,      setJob]     = useState<JobSnapshot | null>(null)
  const [elapsed_, setElapsed] = useState('0:00')
  const [retrying, setRetrying] = useState(false)
  const [activeTab, setActiveTab] = useState<'progress' | 'log'>('progress')
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = new EventSource(`/api/progress/${jobId}`)
    es.onmessage = e => { try { setJob(JSON.parse(e.data)); } catch {} }
    es.onerror   = () => es.close()
    return () => es.close()
  }, [jobId])

  useEffect(() => {
    if (!job?.startedAt || ['DONE','FAILED','PARTIAL','CANCELLED'].includes(job.status)) return
    const t = setInterval(() => setElapsed(fmtElapsed(job.startedAt)), 1000)
    return () => clearInterval(t)
  }, [job?.startedAt, job?.status])

  const displayLines = useMemo(() => (job ? buildDisplayLines(job.logs, job.startedAt) : []), [job])

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [displayLines.length])

  const retryEntities = async (entities?: string[]) => {
    if (!jobId || retrying) return
    setRetrying(true)
    try {
      await fetch('/api/jobs/retry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, ...(entities ? { entities } : {}) }),
      })
      window.location.reload()
    } finally { setRetrying(false) }
  }

  if (!job) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-gray-100" />
          <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `transparent transparent transparent ${G}` }} />
        </div>
        <span className="text-sm text-gray-400 font-medium">Connecting to migration…</span>
      </div>
    </div>
  )

  const isDone    = ['DONE','PARTIAL','FAILED'].includes(job.status)
  const isPartial = job.status === 'PARTIAL'
  const isFailed  = job.status === 'FAILED'
  const isSuccess = job.status === 'DONE'
  const isRunning = job.status === 'RUNNING'

  const totalAll = ENTITY_ROWS.reduce((s, r) => s + (job[r.total] as number), 0)
  const doneAll  = ENTITY_ROWS.reduce((s, r) => s + (job[r.done]  as number), 0)
  const pctOverall = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0
  const duration = fmtDuration(job.startedAt, job.completedAt)

  const failedEntities = ENTITY_ROWS
    .filter(r => r.failed && (job[r.failed as keyof JobSnapshot] as number) > 0)
    .map(r => r.key)

  const LINE_COLORS: Record<string, string> = {
    system: `${G}99`, info: '#64748b', batch: '#818cf8',
    ok: G, error: '#f87171', warn: '#fbbf24',
  }

  return (
    <div className="max-w-[1160px] mx-auto px-6 py-8 space-y-6">

      {/* ── Top header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {/* Status badge */}
          <div className="flex items-center gap-2.5 mb-3">
            {isRunning && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: G }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: G }} />
              </span>
            )}
            <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
              style={{
                backgroundColor: isSuccess ? GL : isRunning ? `${G}18` : isPartial ? '#fef3c7' : '#fee2e2',
                color: isSuccess ? GD : isRunning ? GD : isPartial ? '#92400e' : '#991b1b',
              }}>
              {isRunning ? 'Live' : isSuccess ? 'Complete' : isPartial ? 'Partial' : 'Failed'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {isRunning ? 'Migration in progress' : isSuccess ? 'Migration complete' : isPartial ? 'Migration finished with errors' : 'Migration failed'}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-mono">{job.wcUrl}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-200 flex-shrink-0" />
            <span className="font-mono">{job.shopifyDomain}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-100 rounded-full px-4 py-2 shadow-sm">
              <Clock className="w-4 h-4" style={{ color: G }} />
              <span className="tabular-nums font-mono font-bold">{elapsed_}</span>
            </div>
          )}
          {isDone && (
            <Link href={`/dashboard/migration/${jobId}/report`}
              className="flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-all hover:opacity-90 hover:scale-[1.01]"
              style={{ backgroundColor: G }}>
              View report <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          value={`${pctOverall}%`}
          label="Complete"
          sub={`${doneAll.toLocaleString()} of ${totalAll.toLocaleString()} records`}
          color={G}
        />
        <StatCard
          value={duration ?? (isRunning ? elapsed_ : '–')}
          label={isDone ? 'Total duration' : 'Elapsed'}
          sub={isDone ? `Started ${new Date(job.startedAt!).toLocaleTimeString()}` : 'Time so far'}
        />
        <StatCard
          value={job.errorCount > 0 ? job.errorCount.toLocaleString() : '0'}
          label="Errors"
          sub={job.errorCount > 0 ? 'Click entity to retry' : 'Clean migration'}
          color={job.errorCount > 0 ? '#f59e0b' : G}
        />
        <StatCard
          value={doneAll.toLocaleString()}
          label="Records moved"
          sub="To Shopify"
        />
      </div>

      {/* ── Overall progress bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-900 text-sm">Overall progress</span>
          <span className="text-sm font-black tabular-nums" style={{ color: G }}>{pctOverall}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
          <motion.div className="h-full rounded-full relative overflow-hidden"
            style={{ backgroundColor: G }}
            animate={{ width: `${pctOverall}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}>
            {/* Shimmer while running */}
            {isRunning && (
              <motion.div className="absolute inset-0 opacity-30"
                style={{ background: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)', backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }} />
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Main content: tabs on mobile, side-by-side on desktop ── */}
      {/* Tab bar (mobile) */}
      <div className="flex lg:hidden border-b border-gray-100">
        {(['progress', 'log'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-3 text-sm font-bold capitalize transition-colors"
            style={{ color: activeTab === tab ? G : '#9ca3af', borderBottom: activeTab === tab ? `2px solid ${G}` : '2px solid transparent' }}>
            {tab === 'log' ? 'Live Log' : 'Entity Progress'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-5">

        {/* ── Entity cards ── */}
        <div className={`space-y-3 ${activeTab !== 'progress' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Entity progress</span>
            {failedEntities.length > 0 && isDone && (
              <button onClick={() => retryEntities(failedEntities)} disabled={retrying}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full text-white disabled:opacity-60 transition-all hover:opacity-90"
                style={{ backgroundColor: '#f59e0b' }}>
                {retrying
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Retrying…</>
                  : <><RefreshCw className="w-3.5 h-3.5" />Retry all {job.errorCount} errors</>}
              </button>
            )}
          </div>
          {ENTITY_ROWS.map(row => (
            <EntityCard key={row.key} row={row} job={job} logs={job.logs} onRetry={e => retryEntities([e])} />
          ))}

          {/* FAILED full restart */}
          {isFailed && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-red-700 mb-0.5">Migration failed to start</div>
                <div className="text-xs text-red-500">You can restart from the beginning.</div>
              </div>
              <button onClick={() => retryEntities()} disabled={retrying}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
                {retrying ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Restarting…</> : <><RefreshCw className="w-4 h-4" />Restart</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Live log terminal ── */}
        <div className={`flex flex-col ${activeTab !== 'log' ? 'hidden lg:flex' : ''}`}>
          <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Live log</div>
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'linear-gradient(160deg, #0d1607 0%, #060d02 100%)', border: '1px solid rgba(150,191,72,0.14)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>

            {/* Terminal chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.25)' }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: G }} />
              </div>
              <span className="ml-2 text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                migration.log
              </span>
              <div className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {isRunning
                  ? <><motion.span className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: G, boxShadow: `0 0 5px ${G}` }}
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                    live</>
                  : <><span className="w-1.5 h-1.5 rounded-full bg-gray-600" />finished</>}
              </div>
            </div>

            {/* Log lines */}
            <div ref={logsRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-1 scroll-smooth"
              style={{ minHeight: '340px', maxHeight: '520px' }}>
              {displayLines.length === 0 ? (
                <span style={{ color: 'rgba(255,255,255,0.12)' }}>Waiting for log output…</span>
              ) : (
                displayLines.map((line, i) => (
                  <motion.div key={line.id + i}
                    initial={{ opacity: 0, x: -3 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex gap-3">
                    <span className="flex-shrink-0 tabular-nums select-none"
                      style={{ color: 'rgba(255,255,255,0.18)', minWidth: '38px' }}>
                      {line.ts}
                    </span>
                    <span style={{ color: LINE_COLORS[line.type] ?? '#64748b' }}>
                      {line.text}
                    </span>
                  </motion.div>
                ))
              )}
              {isRunning && displayLines.length > 0 && (
                <motion.div className="flex gap-3 mt-1"
                  animate={{ opacity: [0.8, 0.2, 0.8] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  <span style={{ color: 'rgba(255,255,255,0.15)', minWidth: '38px' }}>···</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>_</span>
                </motion.div>
              )}
            </div>

            {/* Log footer */}
            <div className="px-4 py-2.5 border-t flex items-center justify-between"
              style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {displayLines.length} events
              </span>
              {isDone && (
                <a href={`/dashboard/migration/${jobId}/report`}
                  className="flex items-center gap-1 text-[10px] font-bold transition-opacity hover:opacity-80"
                  style={{ color: G }}>
                  Full report <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Done banner ── */}
      <AnimatePresence>
        {isDone && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 border-2 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={isSuccess
              ? { backgroundColor: GL, borderColor: `${G}40` }
              : isFailed
              ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' }
              : { backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
            <div className="flex items-center gap-3 flex-shrink-0">
              {isSuccess
                ? <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: G }}>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                : <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-gray-900 mb-0.5">
                {isSuccess
                  ? `${doneAll.toLocaleString()} records migrated successfully`
                  : isPartial
                  ? `${doneAll.toLocaleString()} migrated · ${job.errorCount} errors — click entities above to retry`
                  : 'Migration failed — restart to try again'}
              </div>
              <div className="text-sm text-gray-500">
                {isSuccess
                  ? 'Your Shopify store is live. Check the full report for the SEO redirect map and summary.'
                  : isPartial
                  ? 'Expand each failed entity to see the exact errors and retry only those records.'
                  : 'Check the log for error details before restarting.'}
              </div>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              {failedEntities.length > 0 && (
                <button onClick={() => retryEntities(failedEntities)} disabled={retrying}
                  className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full text-white disabled:opacity-60"
                  style={{ backgroundColor: '#f59e0b' }}>
                  {retrying ? 'Retrying…' : `Retry ${job.errorCount} errors`}
                </button>
              )}
              <Link href={`/dashboard/migration/${jobId}/report`}
                className="flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full text-white transition-all hover:opacity-90"
                style={{ backgroundColor: isSuccess ? G : '#6b7280' }}>
                View report <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
