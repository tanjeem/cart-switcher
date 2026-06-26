'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Users, ShoppingCart, Tag, FileText,
  CheckCircle2, XCircle, Clock, ArrowRight,
  AlertTriangle, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react'

const G  = '#96bf48'
const GL = '#eef7e0'

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
  { key: 'products',  label: 'Products',   icon: Package,      total: 'totalProducts'  as const, done: 'doneProducts'  as const, failed: 'failedProducts'  as const },
  { key: 'customers', label: 'Customers',  icon: Users,        total: 'totalCustomers' as const, done: 'doneCustomers' as const, failed: 'failedCustomers' as const },
  { key: 'orders',    label: 'Orders',     icon: ShoppingCart, total: 'totalOrders'    as const, done: 'doneOrders'    as const, failed: 'failedOrders'    as const },
  { key: 'coupons',   label: 'Coupons',    icon: Tag,          total: 'totalCoupons'   as const, done: 'doneCoupons'   as const, failed: null },
  { key: 'posts',     label: 'Blog Posts', icon: FileText,     total: 'totalPosts'     as const, done: 'donePosts'     as const, failed: null },
] as const

/* ── Helpers ────────────────────────────────────────────────── */
function fmtElapsed(startedAt: string | null) {
  if (!startedAt) return '0:00'
  const sec = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function fmtOffset(startedAt: string | null, iso: string) {
  if (!startedAt) return fmtTime(iso)
  const sec = Math.floor((new Date(iso).getTime() - new Date(startedAt).getTime()) / 1000)
  if (sec < 0) return '0:00'
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/* Convert raw DB logs → rich display lines with batch messaging */
interface DisplayLine {
  id: string
  ts: string
  text: string
  type: 'info' | 'ok' | 'error' | 'warn' | 'batch'
}

function buildDisplayLines(logs: RawLog[], startedAt: string | null): DisplayLine[] {
  const lines: DisplayLine[] = []
  const batchState: Record<string, { count: number; total: number; lastIdx: number }> = {}

  // Synthetic "Migration started" first line
  if (startedAt) {
    lines.push({ id: '__start', ts: '0:00', text: 'Migration started', type: 'info' })
  }

  logs.forEach((log, idx) => {
    const ts = fmtOffset(startedAt, log.createdAt)
    const entity = log.entity ?? 'unknown'
    const msg = log.message ?? ''
    const status = (log.status ?? '').toLowerCase()

    // Detect batch progress messages already stored (e.g. "Products 1-50 done")
    const batchMatch = msg.match(/(\w+)\s+(\d[\d,]*)\s*[-–]\s*(\d[\d,]*)/i)
    const successMatch = msg.match(/^(\d[\d,]*)\s+(\w+)\s+(migrated|done|pushed|imported)/i)
    const fetchMatch   = msg.match(/fetch|start|begin|migrating/i)
    const totalMatch   = msg.match(/(\d[\d,]+)\s+(\w+)\s+found/i)

    if (status === 'error' || status === 'failed') {
      lines.push({ id: log.id, ts, text: `✗ ${msg || `${entity} failed`}`, type: 'error' })
      return
    }

    if (status === 'warn' || status === 'warning') {
      lines.push({ id: log.id, ts, text: `⚠ ${msg}`, type: 'warn' })
      return
    }

    // "Total found" lines → synthetic fetch opening
    if (totalMatch) {
      const count = totalMatch[1]
      const ent   = totalMatch[2]
      const batches = Math.ceil(parseInt(count.replace(/,/g, '')) / 50)
      lines.push({ id: log.id + '_find', ts, text: `Found ${count} ${ent} — ${batches} batch${batches !== 1 ? 'es' : ''}`, type: 'info' })
      batchState[entity] = { count: 0, total: parseInt(count.replace(/,/g, '')), lastIdx: idx }
      return
    }

    // Done / success
    if (status === 'done' || status === 'success' || successMatch) {
      const state = batchState[entity]
      if (state) {
        state.count += 1
        const from = (state.count - 1) * 50 + 1
        const to   = Math.min(state.count * 50, state.total)
        lines.push({ id: log.id, ts, text: `Fetching ${entity} batch ${state.count}/${Math.ceil(state.total / 50)}…`, type: 'batch' })
        lines.push({ id: log.id + '_push', ts, text: `✓ ${entity.charAt(0).toUpperCase() + entity.slice(1)} ${from}–${to} pushed to Shopify`, type: 'ok' })
      } else {
        lines.push({ id: log.id, ts, text: `✓ ${msg || `${entity} complete`}`, type: 'ok' })
      }
      return
    }

    // Fetch / start
    if (fetchMatch) {
      const state = batchState[entity]
      if (state) {
        state.count += 1
        const batches = Math.ceil(state.total / 50)
        lines.push({ id: log.id, ts, text: `Fetching ${entity} batch ${state.count}/${batches}…`, type: 'batch' })
      } else {
        lines.push({ id: log.id, ts, text: msg || `Starting ${entity} migration…`, type: 'info' })
      }
      return
    }

    // Fallback: pass through as-is
    lines.push({ id: log.id, ts, text: msg || `${entity} processed`, type: 'info' })
  })

  return lines
}

/* ── Entity row with inline error detail ────────────────────── */
function EntityRow({
  row, job, onRetryEntity,
}: {
  row: typeof ENTITY_ROWS[number]
  job: JobSnapshot
  onRetryEntity: (entity: string) => void
}) {
  const [open, setOpen] = useState(false)
  const Icon  = row.icon
  const total = job[row.total] as number
  const done  = job[row.done]  as number
  const failed = row.failed ? (job[row.failed] as number) : 0
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const isDone   = done >= total && total > 0
  const hasError = failed > 0
  const isRunning = !isDone && done > 0

  const barColor = hasError && isDone ? '#f59e0b' : isDone ? G : isRunning ? '#818cf8' : '#e5e7eb'

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className={`flex items-center gap-4 px-4 py-3.5 bg-white ${hasError ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
        onClick={() => hasError && setOpen(o => !o)}>
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isDone ? (hasError ? '#fef3c7' : GL) : '#f9fafb' }}>
          <Icon className="w-4 h-4" style={{ color: isDone ? (hasError ? '#d97706' : G) : '#9ca3af' }} />
        </div>

        {/* Label + bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-gray-700">{row.label}</span>
            <div className="flex items-center gap-3 text-xs">
              {hasError && (
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <AlertTriangle className="w-3 h-3" />{failed} error{failed !== 1 ? 's' : ''}
                </span>
              )}
              <span className="tabular-nums text-gray-400">{done.toLocaleString()} / {total.toLocaleString()}</span>
              <span className="font-black tabular-nums w-9 text-right" style={{ color: barColor }}>{pct}%</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
            <motion.div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
        </div>

        {/* Expand arrow if errors */}
        {hasError && (
          <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Error drawer */}
      <AnimatePresence>
        {open && hasError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden">
            <div className="px-4 py-4 border-t border-amber-100 bg-amber-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-amber-800 mb-1">
                    {failed} {row.label.toLowerCase()} failed to migrate
                  </div>
                  <div className="text-xs text-amber-700 leading-relaxed">
                    These items encountered errors. Retry to attempt only the failed {row.label.toLowerCase()} — successfully migrated items won't be touched.
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onRetryEntity(row.key) }}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors whitespace-nowrap">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry {row.label}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────── */
export default function MigrationLivePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job,      setJob]      = useState<JobSnapshot | null>(null)
  const [elapsed_, setElapsed]  = useState('0:00')
  const [retrying, setRetrying] = useState(false)
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = new EventSource(`/api/progress/${jobId}`)
    es.onmessage = (e) => {
      try { setJob(JSON.parse(e.data) as JobSnapshot) } catch {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [jobId])

  useEffect(() => {
    if (!job?.startedAt || ['DONE','FAILED','PARTIAL','CANCELLED'].includes(job.status)) return
    const t = setInterval(() => setElapsed(fmtElapsed(job.startedAt)), 1000)
    return () => clearInterval(t)
  }, [job?.startedAt, job?.status])

  const displayLines = useMemo(
    () => (job ? buildDisplayLines(job.logs, job.startedAt) : []),
    [job]
  )

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [displayLines.length])

  const retryEntities = async (entities?: string[]) => {
    if (!jobId || retrying) return
    setRetrying(true)
    try {
      await fetch('/api/jobs/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, ...(entities ? { entities } : {}) }),
      })
      window.location.reload()
    } finally {
      setRetrying(false)
    }
  }

  if (!job) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <span className="w-7 h-7 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        <span className="text-sm">Connecting to migration…</span>
      </div>
    </div>
  )

  const isDone     = ['DONE','PARTIAL','FAILED'].includes(job.status)
  const isPartial  = job.status === 'PARTIAL'
  const isFailed   = job.status === 'FAILED'
  const isSuccess  = job.status === 'DONE'

  const totalAll   = ENTITY_ROWS.reduce((s, r) => s + (job[r.total] as number), 0)
  const doneAll    = ENTITY_ROWS.reduce((s, r) => s + (job[r.done]  as number), 0)
  const pctOverall = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0

  const failedEntities = ENTITY_ROWS
    .filter(r => r.failed && (job[r.failed as keyof JobSnapshot] as number) > 0)
    .map(r => r.key)

  const LINE_COLORS: Record<DisplayLine['type'], string> = {
    info:  '#94a3b8',
    batch: '#818cf8',
    ok:    G,
    error: '#f87171',
    warn:  '#fbbf24',
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            {!isDone && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
              </span>
            )}
            {isSuccess  && <CheckCircle2 className="w-5 h-5" style={{ color: G }} />}
            {(isPartial || isFailed) && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            <h1 className="text-xl font-black text-gray-900">
              {!isDone   ? 'Migration in progress' :
               isSuccess ? 'Migration complete' :
               isPartial ? 'Migration finished with errors' :
                           'Migration failed'}
            </h1>
          </div>
          <p className="text-sm text-gray-400">
            {job.wcUrl} <span className="mx-2 text-gray-200">→</span> {job.shopifyDomain}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isDone && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
              <Clock className="w-4 h-4" /> <span className="tabular-nums font-mono">{elapsed_}</span>
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

      {/* ── Overall progress bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-gray-900 text-sm">Overall progress</span>
          <span className="text-sm font-black tabular-nums" style={{ color: G }}>{pctOverall}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
          <motion.div className="h-full rounded-full"
            style={{ backgroundColor: G, boxShadow: `0 0 8px ${G}60` }}
            animate={{ width: `${pctOverall}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }} />
        </div>
        <div className="text-xs text-gray-400 mt-1 tabular-nums">
          {doneAll.toLocaleString()} / {totalAll.toLocaleString()} records
        </div>
      </div>

      {/* ── Two-column layout: entity rows + live log ── */}
      <div className="grid lg:grid-cols-[1fr_460px] gap-5">

        {/* Entity rows */}
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Entity progress</div>
          {ENTITY_ROWS.map(row => (
            <EntityRow key={row.key} row={row} job={job} onRetryEntity={entity => retryEntities([entity])} />
          ))}

          {/* Retry all errors button */}
          {isDone && failedEntities.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-amber-800 mb-0.5">
                  {job.errorCount} record{job.errorCount !== 1 ? 's' : ''} need attention
                </div>
                <div className="text-xs text-amber-600">
                  Retry only the failed entities — everything else stays intact.
                </div>
              </div>
              <button
                onClick={() => retryEntities(failedEntities)}
                disabled={retrying}
                className="flex-shrink-0 flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-60">
                {retrying
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Retrying…</>
                  : <><RefreshCw className="w-4 h-4" />Retry all errors</>}
              </button>
            </motion.div>
          )}

          {/* Full retry for FAILED */}
          {isFailed && failedEntities.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4">
              <div className="text-sm font-bold text-red-700">Migration failed. You can restart it.</div>
              <button
                onClick={() => retryEntities()}
                disabled={retrying}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
                {retrying
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Retrying…</>
                  : <><RefreshCw className="w-4 h-4" />Restart migration</>}
              </button>
            </motion.div>
          )}
        </div>

        {/* Live log terminal */}
        <div className="flex flex-col">
          <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Live log</div>
          <div className="flex-1 rounded-2xl overflow-hidden shadow-lg"
            style={{ background: 'linear-gradient(145deg, #0d1407 0%, #0a1003 100%)', border: '1px solid rgba(150,191,72,0.12)' }}>
            {/* Terminal chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="ml-2 text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>migration.log</span>
              {!isDone && (
                <span className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <motion.span className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: G, boxShadow: `0 0 4px ${G}` }}
                    animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  live
                </span>
              )}
            </div>
            {/* Log lines */}
            <div ref={logsRef} className="h-80 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 scroll-smooth">
              {displayLines.length === 0 ? (
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>Waiting for log output…</span>
              ) : (
                displayLines.map((line, i) => (
                  <motion.div key={line.id + i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex gap-3 leading-relaxed">
                    <span className="flex-shrink-0 tabular-nums" style={{ color: 'rgba(255,255,255,0.2)', minWidth: '36px' }}>
                      {line.ts}
                    </span>
                    <span style={{ color: LINE_COLORS[line.type] }}>
                      {line.text}
                    </span>
                  </motion.div>
                ))
              )}
              {!isDone && displayLines.length > 0 && (
                <motion.div className="flex gap-3"
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)', minWidth: '36px' }}>···</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>_</span>
                </motion.div>
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
              ? { backgroundColor: GL, borderColor: `${G}50` }
              : { backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
            <div className="flex-1">
              <div className="font-black text-gray-900 mb-1">
                {isSuccess
                  ? `${doneAll.toLocaleString()} records migrated successfully`
                  : `${doneAll.toLocaleString()} records migrated · ${job.errorCount} failed`}
              </div>
              <div className="text-sm text-gray-500">
                {isSuccess
                  ? 'Your Shopify store is ready. Check the full report for the SEO redirect map.'
                  : 'Expand the highlighted entities above to retry only the failed records.'}
              </div>
            </div>
            <Link href={`/dashboard/migration/${jobId}/report`}
              className="flex-shrink-0 flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-full text-white"
              style={{ backgroundColor: isSuccess ? G : '#f59e0b' }}>
              View full report <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
