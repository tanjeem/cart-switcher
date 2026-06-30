'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Users, ShoppingCart, Tag, FileText,
  CheckCircle2, AlertTriangle, Clock, ArrowRight,
  RefreshCw, ChevronDown, XCircle, ExternalLink,
} from 'lucide-react'

const G  = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

type JobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'PARTIAL' | 'CANCELLED'

interface RawLog { id: string; message: string | null; status: string; entity: string; createdAt: string }

interface JobSnapshot {
  status: JobStatus; wcUrl: string; shopifyDomain: string
  startedAt: string | null; completedAt: string | null
  totalProducts: number; doneProducts: number; failedProducts: number
  totalOrders: number;    doneOrders: number;   failedOrders: number
  totalCustomers: number; doneCustomers: number; failedCustomers: number
  totalCoupons: number;   doneCoupons: number
  totalPosts: number;     donePosts: number
  errorCount: number; logs: RawLog[]
}

const ROWS = [
  { key: 'products',  label: 'Products',   icon: Package,      total: 'totalProducts'  as const, done: 'doneProducts'  as const, failed: 'failedProducts'  as const, accent: '#818cf8' },
  { key: 'orders',    label: 'Orders',     icon: ShoppingCart, total: 'totalOrders'    as const, done: 'doneOrders'    as const, failed: 'failedOrders'    as const, accent: '#22d3ee' },
  { key: 'customers', label: 'Customers',  icon: Users,        total: 'totalCustomers' as const, done: 'doneCustomers' as const, failed: 'failedCustomers' as const, accent: '#a78bfa' },
  { key: 'coupons',   label: 'Coupons',    icon: Tag,          total: 'totalCoupons'   as const, done: 'doneCoupons'   as const, failed: null,                        accent: '#fbbf24' },
  { key: 'posts',     label: 'Blog Posts', icon: FileText,     total: 'totalPosts'     as const, done: 'donePosts'     as const, failed: null,                        accent: '#f472b6' },
] as const

function fmtElapsed(s: string | null) {
  if (!s) return '0:00'
  const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
function fmtOffset(start: string | null, iso: string) {
  if (!start) return '0:00'
  const sec = Math.max(0, Math.floor((new Date(iso).getTime() - new Date(start).getTime()) / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
function fmtDuration(start: string | null, end: string | null) {
  if (!start || !end) return null
  const sec = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m ${sec % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

interface Line { id: string; ts: string; text: string; type: 'system'|'info'|'batch'|'ok'|'error'|'warn' }

function buildLines(logs: RawLog[], startedAt: string | null): Line[] {
  const out: Line[] = []
  if (startedAt) out.push({ id: '__start', ts: '0:00', text: 'Migration started', type: 'system' })

  // Deduplicate errors first
  const seen = new Set<string>()
  const errorCounts: Record<string, number> = {}
  logs.forEach(l => {
    if (l.status !== 'error' && l.status !== 'failed') return
    const k = `${l.entity}::${l.message}`
    errorCounts[k] = (errorCounts[k] ?? 0) + 1
  })

  const batchState: Record<string, { count: number; total: number }> = {}

  logs.forEach(log => {
    const ts  = fmtOffset(startedAt, log.createdAt)
    const ent = log.entity ?? 'unknown'
    const msg = log.message ?? ''
    const st  = (log.status ?? '').toLowerCase()

    if (st === 'error' || st === 'failed') {
      const k = `${ent}::${msg}`
      if (!seen.has(k)) {
        seen.add(k)
        const n = errorCounts[k]
        out.push({ id: log.id, ts, text: n > 1 ? `✗ ${n}× ${msg}` : `✗ ${msg}`, type: 'error' })
      }
      return
    }
    if (st === 'warn' || st === 'warning') { out.push({ id: log.id, ts, text: `⚠ ${msg}`, type: 'warn' }); return }

    const totalM = msg.match(/(\d[\d,]+)\s+(\w+)\s+found/i)
    if (totalM) {
      const n = parseInt(totalM[1].replace(/,/g, ''))
      batchState[ent] = { count: 0, total: n }
      out.push({ id: log.id, ts, text: `Found ${totalM[1]} ${totalM[2]} — ${Math.ceil(n / 50)} batches`, type: 'info' })
      return
    }
    if ((st === 'done' || st === 'success' || msg.match(/done|complete|migrated|pushed/i)) && batchState[ent]) {
      const b = batchState[ent]; b.count++
      const from = (b.count - 1) * 50 + 1, to = Math.min(b.count * 50, b.total)
      out.push({ id: log.id + 'f', ts, text: `Fetching ${ent} batch ${b.count}/${Math.ceil(b.total / 50)}…`, type: 'batch' })
      out.push({ id: log.id + 'p', ts, text: `✓ ${ent.charAt(0).toUpperCase() + ent.slice(1)} ${from}–${to} pushed to Shopify`, type: 'ok' })
      return
    }
    if (msg.match(/fetch|start|begin|migrating/i) && batchState[ent]) {
      const b = batchState[ent]; b.count++
      out.push({ id: log.id, ts, text: `Fetching ${ent} batch ${b.count}/${Math.ceil(b.total / 50)}…`, type: 'batch' })
      return
    }
    out.push({ id: log.id, ts, text: msg || `${ent} processed`, type: 'info' })
  })
  return out
}

const LINE_COLOR: Record<string, string> = {
  system: '#96bf4899', info: '#475569', batch: '#818cf8', ok: '#96bf48', error: '#f87171', warn: '#fbbf24',
}

/* ── Entity row ─────────────────────────────────────────────── */
function EntityRow({ row, job, onRetry, onRun }: { row: typeof ROWS[number]; job: JobSnapshot; onRetry: (k: string) => void; onRun: (k: string) => void }) {
  const [open, setOpen] = useState(false)
  const Icon   = row.icon
  const total  = job[row.total] as number
  const done   = job[row.done] as number
  const failed = row.failed ? (job[row.failed] as number) : 0
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0
  const isSkip = total === 0
  const isDone = !isSkip && done >= total - failed && done > 0
  const isRun  = !isDone && done > 0

  const barColor = isSkip ? '#e5e7eb' : failed > 0 ? '#f59e0b' : isDone ? G : isRun ? row.accent : '#e5e7eb'
  const pill = isSkip ? null : failed > 0 ? 'error' : isDone ? 'done' : isRun ? 'run' : 'queue'

  // Pull error messages from logs
  const errMsgs = useMemo(() => {
    const grouped: Record<string, number> = {}
    job.logs.filter(l => l.entity === row.key && (l.status === 'error' || l.status === 'failed') && l.message)
      .forEach(l => { grouped[l.message!] = (grouped[l.message!] ?? 0) + 1 })
    return Object.entries(grouped).sort((a, b) => b[1] - a[1])
  }, [job.logs, row.key])

  return (
    <div className="rounded-xl border overflow-hidden transition-colors"
      style={{ borderColor: failed > 0 ? '#fde68a' : isDone ? `${G}25` : '#f3f4f6', backgroundColor: failed > 0 ? '#fffcf0' : 'white' }}>

      <div className={`flex items-center gap-3 px-4 py-3 ${failed > 0 ? 'cursor-pointer select-none' : ''}`}
        onClick={() => failed > 0 && setOpen(o => !o)}>

        {/* icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 relative"
          style={{ backgroundColor: isSkip ? '#f9fafb' : failed > 0 ? '#fef3c7' : isDone ? GL : `${row.accent}12` }}>
          <Icon className="w-4 h-4" style={{ color: isSkip ? '#d1d5db' : failed > 0 ? '#d97706' : isDone ? G : isRun ? row.accent : '#9ca3af' }} />
          {isDone && !failed && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: G }}>
              <CheckCircle2 className="w-2 h-2 text-white" strokeWidth={3} />
            </span>
          )}
        </div>

        {/* label + bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-800">{row.label}</span>
              {pill === 'done'  && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ backgroundColor: GL, color: GD }}>Done</span>}
              {pill === 'error' && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">{failed} errors</span>}
              {pill === 'run'   && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: row.accent }}>Running</span>}
              {pill === 'queue' && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400">Queued</span>}
              {isSkip && (
                <>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-300">Skipped</span>
                  <button onClick={e => { e.stopPropagation(); onRun(row.key) }}
                    className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md text-white cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: row.accent }}>
                    <RefreshCw className="w-2.5 h-2.5" /> Run {row.label}
                  </button>
                </>
              )}
            </div>
            {!isSkip && (
              <div className="flex items-center gap-2 text-xs">
                <span className="tabular-nums font-mono text-gray-400">{done.toLocaleString()}/{total.toLocaleString()}</span>
                <span className="font-black tabular-nums w-9 text-right" style={{ color: barColor }}>{pct}%</span>
              </div>
            )}
          </div>
          {!isSkip && (
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
              <motion.div className="h-full rounded-full"
                style={{ backgroundColor: barColor, boxShadow: isRun ? `0 0 5px ${barColor}80` : 'none' }}
                animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
            </div>
          )}
        </div>

        {failed > 0 && <ChevronDown className={`w-4 h-4 text-amber-400 flex-shrink-0 transition-transform duration-200 cursor-pointer ${open ? 'rotate-180' : ''}`} />}
      </div>

      {/* error drawer */}
      <AnimatePresence>
        {open && failed > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="border-t border-amber-100 px-4 py-3 space-y-2.5">
              {errMsgs.map(([msg, count]) => (
                <div key={msg} className="flex items-start gap-2 text-xs">
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 flex-1 leading-relaxed">{msg}</span>
                  {count > 1 && <span className="text-[10px] font-black bg-red-50 text-red-400 px-1.5 py-0.5 rounded-full flex-shrink-0">×{count}</span>}
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">Only {failed} failed {row.label.toLowerCase()} will be retried.</span>
                <button onClick={e => { e.stopPropagation(); onRetry(row.key) }}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white ml-3 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#f59e0b' }}>
                  <RefreshCw className="w-3 h-3" /> Retry {row.label}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── page ────────────────────────────────────────────────────── */
export default function MigrationLivePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job,      setJob]     = useState<JobSnapshot | null>(null)
  const [tick,     setTick]    = useState('0:00')
  const [retrying,  setRetrying]  = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [tab,      setTab]     = useState<'progress'|'log'>('progress')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = new EventSource(`/api/progress/${jobId}`)
    es.onmessage = e => { try { setJob(JSON.parse(e.data)) } catch {} }
    es.onerror   = () => es.close()
    return () => es.close()
  }, [jobId])

  useEffect(() => {
    if (!job?.startedAt || ['DONE','FAILED','PARTIAL','CANCELLED'].includes(job.status)) return
    const t = setInterval(() => setTick(fmtElapsed(job.startedAt)), 1000)
    return () => clearInterval(t)
  }, [job?.startedAt, job?.status])

  const lines = useMemo(() => job ? buildLines(job.logs, job.startedAt) : [], [job])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [lines.length])

  const cancel = async () => {
    if (!jobId || cancelling) return
    setCancelling(true)
    try {
      await fetch('/api/jobs/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      window.location.reload()
    } finally { setCancelling(false) }
  }

  const retry = async (entities?: string[]) => {
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
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${G} ${G} ${G} transparent` }} />
        <span className="text-sm text-gray-400">Connecting…</span>
      </div>
    </div>
  )

  const isDone    = ['DONE','PARTIAL','FAILED'].includes(job.status)
  const isPartial = job.status === 'PARTIAL'
  const isFailed  = job.status === 'FAILED'
  const isSuccess = job.status === 'DONE'
  const isRunning = job.status === 'RUNNING'

  const totalAll   = ROWS.reduce((s, r) => s + (job[r.total] as number), 0)
  const doneAll    = ROWS.reduce((s, r) => s + (job[r.done]  as number), 0)
  const pct        = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0
  const duration   = fmtDuration(job.startedAt, job.completedAt)
  const failedEnts = ROWS.filter(r => r.failed && (job[r.failed as keyof JobSnapshot] as number) > 0).map(r => r.key)

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {isRunning && (
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inset-0 rounded-full opacity-75" style={{ backgroundColor: G }} />
              <span className="relative rounded-full h-2.5 w-2.5" style={{ backgroundColor: G }} />
            </span>
          )}
          {isSuccess  && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: G }} />}
          {(isPartial || isFailed) && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-lg font-black text-gray-900 leading-tight">
              {isRunning ? 'Migration in progress' : isSuccess ? 'Migration complete' : isPartial ? 'Completed with errors' : 'Migration failed'}
            </h1>
            <p className="text-xs text-gray-400 font-mono truncate">{job.wcUrl} → {job.shopifyDomain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-100 rounded-full px-3 py-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5" style={{ color: G }} />
                <span className="font-mono font-bold tabular-nums text-sm">{tick}</span>
              </div>
              <button onClick={cancel} disabled={cancelling}
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full bg-red-500 text-white cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-60">
                <XCircle className="w-3.5 h-3.5" />{cancelling ? 'Stopping…' : 'Stop'}
              </button>
            </div>
          )}
          {isDone && (
            <div className="flex items-center gap-2">
              <Link href={`/migrate/dedup/${jobId}`}
                className="flex items-center gap-1.5 font-bold text-sm px-4 py-2 rounded-full cursor-pointer hover:opacity-90 transition-opacity border border-gray-200 text-gray-600 bg-white">
                Remove duplicates
              </Link>
              <Link href={`/dashboard/migration/${jobId}/report`}
                className="flex items-center gap-1.5 text-white font-bold text-sm px-4 py-2 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: G }}>
                View report <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Compact stats strip ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { v: `${pct}%`,                  l: 'Complete',    c: G              },
          { v: duration ?? (isRunning ? tick : '–'), l: isDone ? 'Duration' : 'Elapsed', c: '#111827' },
          { v: job.errorCount > 0 ? job.errorCount.toLocaleString() : '0', l: 'Errors', c: job.errorCount > 0 ? '#f59e0b' : G },
          { v: doneAll.toLocaleString(),   l: 'Migrated',    c: '#111827'      },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm text-center">
            <div className="text-xl font-black tracking-tight" style={{ color: s.c }}>{s.v}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Overall progress bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500">Overall progress</span>
          <span className="text-xs font-black tabular-nums" style={{ color: G }}>{doneAll.toLocaleString()} / {totalAll.toLocaleString()}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
          <motion.div className="h-full rounded-full relative overflow-hidden"
            style={{ backgroundColor: G }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            {isRunning && (
              <motion.div className="absolute inset-0 opacity-40"
                style={{ background: 'linear-gradient(90deg, transparent, white, transparent)' }}
                animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} />
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="flex lg:hidden gap-1 bg-gray-100 rounded-xl p-1">
        {(['progress', 'log'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
            style={{ backgroundColor: tab === t ? 'white' : 'transparent', color: tab === t ? G : '#9ca3af', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            {t === 'log' ? 'Live Log' : 'Progress'}
          </button>
        ))}
      </div>

      {/* ── Two-col layout ── */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-4">

        {/* Entity rows */}
        <div className={`space-y-2 ${tab !== 'progress' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Entity progress</span>
            {failedEnts.length > 0 && isDone && (
              <button onClick={() => retry(failedEnts)} disabled={retrying}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full text-white cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#f59e0b' }}>
                {retrying
                  ? <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Retrying…</>
                  : <><RefreshCw className="w-3 h-3" />Retry all {job.errorCount} errors</>}
              </button>
            )}
          </div>
          {ROWS.map(r => <EntityRow key={r.key} row={r} job={job} onRetry={e => retry([e])} onRun={e => retry([e])} />)}

          {isFailed && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3 mt-2">
              <div>
                <p className="text-sm font-bold text-red-700">Migration failed</p>
                <p className="text-xs text-red-400 mt-0.5">Check the log for details before restarting.</p>
              </div>
              <button onClick={() => retry()} disabled={retrying}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-red-500 text-white cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-60 flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" />{retrying ? 'Restarting…' : 'Restart'}
              </button>
            </div>
          )}
        </div>

        {/* Log terminal */}
        <div className={`flex flex-col ${tab !== 'log' ? 'hidden lg:flex' : ''}`}>
          <div className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Live log</div>
          <div className="flex-1 rounded-xl overflow-hidden"
            style={{ background: '#0a1003', border: '1px solid rgba(150,191,72,0.12)', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
            {/* chrome */}
            <div className="flex items-center gap-2 px-3.5 py-2 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: G }} />
              </div>
              <span className="ml-1.5 text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>migration.log</span>
              <div className="ml-auto flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {isRunning
                  ? <><motion.span className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: G }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />
                    <span className="text-[10px] font-mono">live</span></>
                  : <span className="text-[10px] font-mono">done · {lines.length} events</span>}
              </div>
            </div>
            {/* lines */}
            <div ref={logRef}
              className="overflow-y-auto p-3.5 font-mono text-[11px] leading-relaxed space-y-1"
              style={{ minHeight: '300px', maxHeight: '460px' }}>
              {lines.length === 0
                ? <span style={{ color: 'rgba(255,255,255,0.12)' }}>Waiting…</span>
                : lines.map((l, i) => (
                  <motion.div key={l.id + i} initial={{ opacity: 0, x: -3 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.1 }}
                    className="flex gap-2.5">
                    <span className="flex-shrink-0 tabular-nums" style={{ color: 'rgba(255,255,255,0.16)', minWidth: '34px' }}>{l.ts}</span>
                    <span style={{ color: LINE_COLOR[l.type] }}>{l.text}</span>
                  </motion.div>
                ))}
              {isRunning && lines.length > 0 && (
                <motion.div className="flex gap-2.5" animate={{ opacity: [0.7, 0.2, 0.7] }} transition={{ duration: 1.1, repeat: Infinity }}>
                  <span style={{ color: 'rgba(255,255,255,0.15)', minWidth: '34px' }}>···</span>
                  <span style={{ color: 'rgba(255,255,255,0.18)' }}>_</span>
                </motion.div>
              )}
            </div>
            {/* footer */}
            <div className="px-3.5 py-2 border-t flex items-center justify-between"
              style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>{lines.length} events</span>
              {isDone && (
                <Link href={`/dashboard/migration/${jobId}/report`}
                  className="flex items-center gap-1 text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: G }}>
                  Full report <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Done banner ── */}
      <AnimatePresence>
        {isDone && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
            style={isSuccess
              ? { backgroundColor: GL, borderColor: `${G}40` }
              : { backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {isSuccess
                ? <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: G }}><CheckCircle2 className="w-4 h-4 text-white" /></div>
                : <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-white" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm">
                {isSuccess
                  ? `${doneAll.toLocaleString()} records migrated — 0 errors`
                  : `${doneAll.toLocaleString()} migrated · ${job.errorCount} errors`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isSuccess
                  ? 'Your Shopify store is ready. View the report for the SEO redirect map.'
                  : 'Expand error entities above to retry only the failed records.'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {failedEnts.length > 0 && (
                <button onClick={() => retry(failedEnts)} disabled={retrying}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#f59e0b' }}>
                  {retrying ? 'Retrying…' : `Retry ${job.errorCount} errors`}
                </button>
              )}
              <Link href={`/dashboard/migration/${jobId}/report`}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: isSuccess ? G : '#6b7280' }}>
                View report <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
