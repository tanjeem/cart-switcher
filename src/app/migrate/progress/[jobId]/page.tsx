'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { MigrationProgress, MigrationEntities } from '@/types'

const ENTITY_DEFS: { key: keyof MigrationEntities; label: string; icon: string }[] = [
  { key: 'products',  label: 'Products',   icon: '📦' },
  { key: 'customers', label: 'Customers',  icon: '👥' },
  { key: 'orders',    label: 'Orders',     icon: '🧾' },
  { key: 'coupons',   label: 'Coupons',    icon: '🏷️' },
  { key: 'posts',     label: 'Blog Posts', icon: '📝' },
]

const ALL_ON: MigrationEntities = {
  products: true, customers: true, orders: true, coupons: true, posts: true,
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${Math.round(seconds)}s`
  const mins = Math.round(seconds / 60)
  return `~${mins} min`
}

function formatStaleness(secs: number): string {
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return rem > 0 ? `${mins}m ${rem}s ago` : `${mins}m ago`
}

interface ProgressSample {
  time: number
  customers: number
  orders: number
}

const SAMPLE_WINDOW = 20

function rollingEta(
  done: number,
  total: number,
  field: 'customers' | 'orders',
  samples: ProgressSample[],
): string | null {
  if (done === 0 || done >= total || samples.length < 2) return null
  const oldest = samples[0]
  const newest = samples.at(-1)
  if (!oldest || !newest) return null
  const elapsed = (newest.time - oldest.time) / 1000
  const delta = newest[field] - oldest[field]
  if (delta <= 0 || elapsed <= 0) return null
  const rate = delta / elapsed
  const remaining = (total - done) / rate
  return formatEta(remaining)
}

function rollingSpeed(
  field: 'customers' | 'orders',
  samples: ProgressSample[],
): string | null {
  if (samples.length < 2) return null
  const oldest = samples[0]
  const newest = samples.at(-1)
  if (!oldest || !newest) return null
  const elapsed = (newest.time - oldest.time) / 1000
  const delta = newest[field] - oldest[field]
  if (delta <= 0 || elapsed <= 0) return null
  const perMin = (delta / elapsed) * 60
  return `${Math.round(perMin)}/min`
}

export default function ProgressPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [samples, setSamples] = useState<ProgressSample[]>([])
  const [retrying, setRetrying] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [connected, setConnected] = useState(false)
  const [staleSecs, setStaleSecs] = useState(0)
  const [ordersFrozenSecs, setOrdersFrozenSecs] = useState(0)
  const [bulkStatus, setBulkStatus] = useState<{ status: string; objectCount: number } | null>(null)
  const lastUpdateRef = useRef<number | null>(null)
  const lastOrdersChangeRef = useRef<number | null>(null)
  const lastOrdersValueRef = useRef<number | null>(null)
  const [entities, setEntities] = useState<MigrationEntities>(() => {
    if (globalThis.window === undefined) return ALL_ON
    try {
      const saved = localStorage.getItem('cs-entities')
      if (saved) {
        const parsed = JSON.parse(saved) as MigrationEntities
        const valid = ENTITY_DEFS.every(({ key }) => typeof parsed[key] === 'boolean')
        if (valid) return parsed
      }
    } catch {}
    return ALL_ON
  })

  // Tick every second to keep "updated X ago" and orders-frozen counter live
  useEffect(() => {
    const id = setInterval(() => {
      if (lastUpdateRef.current !== null) {
        setStaleSecs(Math.floor((Date.now() - lastUpdateRef.current) / 1000))
      }
      if (lastOrdersChangeRef.current !== null) {
        setOrdersFrozenSecs(Math.floor((Date.now() - lastOrdersChangeRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Track when doneOrders last changed so we can detect bulk-operation stall
  useEffect(() => {
    if (progress === null) return
    if (progress.doneOrders !== lastOrdersValueRef.current) {
      lastOrdersValueRef.current = progress.doneOrders
      lastOrdersChangeRef.current = Date.now()
      setOrdersFrozenSecs(0)
      setBulkStatus(null)
    }
  }, [progress])


  useEffect(() => {
    let es: EventSource
    let done = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const handleMessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as MigrationProgress
      setProgress(data)
      lastUpdateRef.current = Date.now()
      setStaleSecs(0)
      setConnected(true)
      if (data.status === 'RUNNING') {
        setSamples(prev => [
          ...prev.slice(-(SAMPLE_WINDOW - 1)),
          { time: Date.now(), customers: data.doneCustomers, orders: data.doneOrders },
        ])
      }
      if (['DONE', 'FAILED', 'PARTIAL', 'CANCELLED'].includes(data.status)) {
        done = true
        es.close()
      }
    }

    const connect = () => {
      es = new EventSource(`/api/progress/${jobId}`)
      es.onmessage = handleMessage
      es.onerror = () => {
        setConnected(false)
        es.close()
        if (!done) {
          retryTimer = setTimeout(connect, 2000)
        }
      }
    }

    connect()
    return () => {
      done = true
      if (retryTimer) clearTimeout(retryTimer)
      es.close()
    }
  }, [jobId])

  const toggleEntity = (key: keyof MigrationEntities) => {
    setEntities(prev => {
      const next = { ...prev, [key]: !prev[key] }
      const anyOn = Object.values(next).some(Boolean)
      const result = anyOn ? next : prev
      try { localStorage.setItem('cs-entities', JSON.stringify(result)) } catch {}
      return result
    })
  }

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    try {
      const res = await fetch('/api/jobs/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, entities }),
      })
      const data = await res.json()
      if (data.jobId) router.push(`/migrate/progress/${data.jobId}`)
    } catch {
      setRetrying(false)
    }
  }, [jobId, router, entities])

  const handleCleanRetry = useCallback(async () => {
    if (!confirm('This will delete CartSwitcher-created products and orders from Shopify before re-migrating. Continue?')) return
    setCleaning(true)
    try {
      const res = await fetch('/api/jobs/clean-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, entities }),
      })
      const data = await res.json()
      if (data.jobId) router.push(`/migrate/progress/${data.jobId}`)
    } catch {
      setCleaning(false)
    }
  }, [jobId, router, entities])

  const handleStop = useCallback(async () => {
    if (!confirm('Stop the migration? Items migrated so far will remain in Shopify. You can retry later.')) return
    setStopping(true)
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' })
    } catch {}
  }, [jobId])

  const isDone      = progress?.status === 'DONE'
  const isPartial   = progress?.status === 'PARTIAL'
  const isFailed    = progress?.status === 'FAILED'
  const isCancelled = progress?.status === 'CANCELLED'
  const isRunning   = progress?.status === 'RUNNING' || progress?.status === 'PENDING'
  const canRetry    = isPartial || isFailed || isRunning || isCancelled

  const rowVisible = (total: number, done: number) => total > 0 || done > 0

  // Staleness thresholds — only meaningful while running
  const isStale     = isRunning && staleSecs >= 45
  const isVeryStale = isRunning && staleSecs >= 120

  // Orders frozen = same count for >20s while upload is still pending
  const isOrdersFrozen = (
    isRunning &&
    ordersFrozenSecs > 20 &&
    (progress?.doneOrders ?? 0) < (progress?.totalOrders ?? 0) &&
    (progress?.totalOrders ?? 0) > 0
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOrdersFrozen) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/shopify/bulk-status/${jobId}`)
        if (res.ok) setBulkStatus(await res.json())
      } catch { /* network hiccup — next poll will retry */ }
    }
    poll()
    const id = setInterval(poll, 10000)
    return () => clearInterval(id)
  }, [isOrdersFrozen, jobId])

  let retryHeading = 'Some items failed to migrate.'
  if (isRunning) retryHeading = 'Migration stuck or taking too long?'
  else if (isCancelled) retryHeading = 'Resume migration?'

  let retryLabel = 'Retry'
  if (retrying) retryLabel = 'Starting...'
  else if (isCancelled) retryLabel = 'Resume'

  const customersDone = !progress?.totalCustomers || progress.doneCustomers >= progress.totalCustomers
  const activeField: 'customers' | 'orders' = customersDone ? 'orders' : 'customers'
  const activeDone  = activeField === 'orders' ? (progress?.doneOrders ?? 0)    : (progress?.doneCustomers ?? 0)
  const activeTotal = activeField === 'orders' ? (progress?.totalOrders ?? 0)   : (progress?.totalCustomers ?? 0)

  let activeEta: string | null = null
  let activeSpeed: string | null = null
  if (progress && isRunning) {
    activeEta   = rollingEta(activeDone, activeTotal, activeField, samples)
    activeSpeed = rollingSpeed(activeField, samples)
  }

  // Combined progress across products + customers + orders for the header bar
  const totalAll = (progress?.totalProducts ?? 0) + (progress?.totalCustomers ?? 0) + (progress?.totalOrders ?? 0)
  const doneAll  = (progress?.doneProducts ?? 0)  + (progress?.doneCustomers ?? 0)  + (progress?.doneOrders ?? 0)
  const overallPct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <a href="/" className="font-bold text-xl">CartSwitcher</a>
          <h1 className="text-2xl font-bold mt-4 mb-1">Migration in progress</h1>
          <p className="text-gray-500 text-sm">Keep this tab open — your store is being migrated</p>
        </div>

        {/* Status + live indicators */}
        {progress && (
          <div className="flex flex-col items-center gap-2 mb-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={progress.status} pulsing={isRunning} />
              {isRunning && <ConnectionDot connected={connected} />}
            </div>

            {/* ETA + speed */}
            {isRunning && (activeEta || activeSpeed) && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {activeEta && <span>{activeEta} remaining</span>}
                {activeEta && activeSpeed && <span className="text-gray-300">•</span>}
                {activeSpeed && <span>{activeSpeed}</span>}
              </div>
            )}

            {/* Last update counter */}
            {isRunning && lastUpdateRef.current !== null && (
              <span className={`text-xs ${isVeryStale ? 'text-red-500 font-medium' : isStale ? 'text-amber-600' : 'text-gray-400'}`}>
                Updated {formatStaleness(staleSecs)}
              </span>
            )}
          </div>
        )}

        {/* Bulk operation in-progress banner */}
        {isOrdersFrozen && !isVeryStale && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="mt-0.5 shrink-0 w-4 h-4 border-2 border-blue-400 border-t-blue-700 rounded-full animate-spin" />
            <div className="flex-1 min-w-0">
              {bulkStatus && bulkStatus.status === 'RUNNING' && bulkStatus.objectCount > 0 ? (
                <>
                  <p className="text-sm font-medium text-blue-900">
                    Shopify has processed {bulkStatus.objectCount.toLocaleString()} orders so far
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Uploading in bulk — the counter will jump when Shopify finishes the batch.
                  </p>
                </>
              ) : bulkStatus && bulkStatus.status === 'COMPLETED' ? (
                <>
                  <p className="text-sm font-medium text-blue-900">Shopify finished — saving results...</p>
                  <p className="text-xs text-blue-700 mt-0.5">Counter will update in a few seconds.</p>
                </>
              ) : bulkStatus && bulkStatus.status === 'FAILED' ? (
                <>
                  <p className="text-sm font-medium text-red-800">Bulk operation failed on Shopify</p>
                  <p className="text-xs text-red-700 mt-0.5">Stop the migration and retry orders to restart it.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-blue-900">Orders uploading via bulk operation</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Shopify processes all orders server-side — takes 5–15 min for large stores. Counter updates when done.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stale / stuck warnings */}
        {isVeryStale && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">No progress in {Math.floor(staleSecs / 60)}m — migration may be stuck</p>
              <p className="text-xs text-red-600 mt-0.5">Stop the migration and retry orders only to resume from where it left off.</p>
            </div>
          </div>
        )}
        {isStale && !isVeryStale && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-amber-500 mt-0.5 shrink-0">⏳</span>
            <div>
              <p className="text-sm font-medium text-amber-900">No new progress in {staleSecs}s</p>
              <p className="text-xs text-amber-700 mt-0.5">A step is being retried automatically — this is normal. Please wait.</p>
            </div>
          </div>
        )}

        {/* Overall progress bar */}
        {totalAll > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Overall progress</span>
              <span className="font-medium">{overallPct}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Per-entity rows */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-5">
          {!progress && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Starting migration...</p>
            </div>
          )}

          {progress && (
            <>
              {rowVisible(progress.totalProducts, progress.doneProducts) && (
                <ProgressRow label="Products"   icon="📦" done={progress.doneProducts}  total={progress.totalProducts}  failed={progress.failedProducts} />
              )}
              {rowVisible(progress.totalCustomers, progress.doneCustomers) && (
                <ProgressRow label="Customers"  icon="👥" done={progress.doneCustomers} total={progress.totalCustomers} failed={progress.failedCustomers} />
              )}
              {rowVisible(progress.totalOrders, progress.doneOrders) && (
                <ProgressRow label="Orders"     icon="🧾" done={progress.doneOrders}    total={progress.totalOrders}    failed={progress.failedOrders} />
              )}
              {rowVisible(progress.totalCoupons, progress.doneCoupons) && (
                <ProgressRow label="Coupons"    icon="🏷️" done={progress.doneCoupons}   total={progress.totalCoupons}   failed={0} />
              )}
              {rowVisible(progress.totalPosts, progress.donePosts) && (
                <ProgressRow label="Blog Posts" icon="📝" done={progress.donePosts}     total={progress.totalPosts}     failed={0} />
              )}
            </>
          )}
        </div>

        {/* Fatal error banner */}
        {isFailed && progress?.errorLog && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800 mb-1">Migration failed</p>
            <p className="text-sm text-red-700">{progress.errorLog}</p>
            <a
              href="/migrate/connect"
              className="inline-block mt-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Reconnect Shopify store
            </a>
          </div>
        )}

        {/* Stop button */}
        {isRunning && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={handleStop}
              disabled={stopping}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <span>⏹</span>
              {stopping ? 'Stopping...' : 'Stop migration'}
            </button>
          </div>
        )}

        {/* Cancelled state */}
        {isCancelled && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-gray-700">Migration stopped</p>
            <p className="text-xs text-gray-500 mt-1">Items migrated so far remain in your Shopify store.</p>
          </div>
        )}

        {/* Live error log */}
        {progress?.recentErrors && progress.recentErrors.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Recent errors</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {progress.recentErrors.map((e) => (
                <div key={`${e.entity}-${e.entityId}`} className="text-xs rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                  <span className="font-medium text-red-700 capitalize">{e.entity}</span>
                  <span className="text-gray-400 mx-1">#{e.entityId}</span>
                  <span className="text-red-600">{e.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retry actions */}
        {canRetry && progress && (
          <div className="mt-4 space-y-3">
            {!isRunning && (
              <div className="bg-white border rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Select what to retry</p>
                <div className="flex flex-wrap gap-2">
                  {ENTITY_DEFS.map(({ key, label, icon }) => {
                    const on = entities[key]
                    return (
                      <button
                        key={key}
                        onClick={() => toggleEntity(key)}
                        disabled={retrying || cleaning}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                          border transition-all duration-150
                          ${on
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <span>{icon}</span>
                        {label}
                        {on && <span className="ml-0.5 text-xs opacity-60">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-900">{retryHeading}</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Continues where it left off — already-migrated orders are skipped.
                </p>
              </div>
              <button
                onClick={handleRetry}
                disabled={retrying || cleaning}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {retryLabel}
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-900">Seeing duplicate products or orders?</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Removes only <strong>CartSwitcher-created duplicates</strong> — your other Shopify data is untouched.
                </p>
              </div>
              <button
                onClick={handleCleanRetry}
                disabled={retrying || cleaning}
                className="shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {cleaning ? 'Fixing...' : 'Fix Duplicates & Retry'}
              </button>
            </div>
          </div>
        )}

        {/* Tool links */}
        {progress && (
          <div className="mt-4 text-center space-y-2">
            <a
              href={`/migrate/dedup/${jobId}`}
              className="block text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
            >
              Remove duplicate products
            </a>
            <a
              href={`/migrate/manage/${jobId}`}
              className="block text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
            >
              Delete products / customers / orders from Shopify
            </a>
          </div>
        )}

        {isDone && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <p className="font-semibold text-green-800 mb-1">Migration complete!</p>
            <p className="text-sm text-green-700 mb-4">Your store data has been migrated to Shopify.</p>
            <a
              href="/dashboard"
              className="inline-block bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              View dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function ConnectionDot({ connected }: Readonly<{ connected: boolean }>) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className="relative flex h-2 w-2">
        {connected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-300" />
        )}
      </span>
      {connected ? 'Live' : 'Reconnecting...'}
    </span>
  )
}

function ProgressRow({
  label, icon, done, total, failed,
}: Readonly<{
  label: string; icon: string; done: number; total: number; failed: number
}>) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isWaiting = total === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          {isWaiting
            ? <span className="text-gray-300 italic">Waiting...</span>
            : <>{done.toLocaleString()} <span className="text-gray-300">/</span> {total.toLocaleString()}</>
          }
          {failed > 0 && <span className="text-red-400 ml-1">{failed} failed</span>}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${failed > 0 ? 'bg-amber-400' : 'bg-black'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status, pulsing }: Readonly<{ status: string; pulsing?: boolean }>) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: 'Queued',   cls: 'bg-gray-100 text-gray-600' },
    RUNNING:   { label: 'Running',  cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    DONE:      { label: 'Complete', cls: 'bg-green-50 text-green-700 border border-green-200' },
    PARTIAL:   { label: 'Partial',  cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    FAILED:    { label: 'Failed',   cls: 'bg-red-50 text-red-700 border border-red-200' },
    CANCELLED: { label: 'Stopped',  cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  }
  const { label, cls } = map[status] ?? map.PENDING
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>
      {pulsing && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
        </span>
      )}
      {label}
    </span>
  )
}
