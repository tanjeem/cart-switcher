'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { MigrationProgress } from '@/types'

export default function ProgressPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    const es = new EventSource(`/api/progress/${jobId}`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as MigrationProgress
      setProgress(data)
      if (data.status === 'DONE' || data.status === 'FAILED' || data.status === 'PARTIAL') {
        es.close()
      }
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [jobId])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    try {
      const res = await fetch('/api/jobs/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json()
      if (data.jobId) router.push(`/migrate/progress/${data.jobId}`)
    } catch {
      setRetrying(false)
    }
  }, [jobId, router])

  const handleCleanRetry = useCallback(async () => {
    if (!confirm('This will delete ALL products, customers, and orders from your Shopify store before re-migrating. Continue?')) return
    setCleaning(true)
    try {
      const res = await fetch('/api/jobs/clean-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json()
      if (data.jobId) router.push(`/migrate/progress/${data.jobId}`)
    } catch {
      setCleaning(false)
    }
  }, [jobId, router])

  const isDone = progress?.status === 'DONE'
  const isPartial = progress?.status === 'PARTIAL'
  const isFailed = progress?.status === 'FAILED'
  const isRunning = progress?.status === 'RUNNING' || progress?.status === 'PENDING'
  const canRetry = isPartial || isFailed || isRunning

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <a href="/" className="font-bold text-xl">CartSwitcher</a>
          <h1 className="text-2xl font-bold mt-4 mb-1">Migration in progress</h1>
          <p className="text-gray-500 text-sm">Keep this tab open — your store is being migrated</p>
        </div>

        {/* Status badge */}
        {progress && (
          <div className="flex justify-center mb-6">
            <StatusBadge status={progress.status} />
          </div>
        )}

        <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-5">
          {!progress && (
            <div className="text-center text-gray-400 py-8 text-sm">Starting migration...</div>
          )}

          {progress && (
            <>
              <ProgressRow
                label="Products"
                icon="📦"
                done={progress.doneProducts}
                total={progress.totalProducts}
                failed={progress.failedProducts}
              />
              <ProgressRow
                label="Customers"
                icon="👥"
                done={progress.doneCustomers}
                total={progress.totalCustomers}
                failed={progress.failedCustomers}
              />
              <ProgressRow
                label="Orders"
                icon="🧾"
                done={progress.doneOrders}
                total={progress.totalOrders}
                failed={progress.failedOrders}
              />
              <ProgressRow
                label="Coupons"
                icon="🏷️"
                done={progress.doneCoupons}
                total={progress.totalCoupons}
                failed={0}
              />
              <ProgressRow
                label="Blog Posts"
                icon="📝"
                done={progress.donePosts}
                total={progress.totalPosts}
                failed={0}
              />
            </>
          )}
        </div>

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

        {/* Action buttons — shown whenever migration isn't cleanly DONE */}
        {canRetry && progress && (
          <div className="mt-4 space-y-3">
            {/* Retry: skip already-migrated items */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-900">
                  {isRunning ? 'Migration stuck or taking too long?' : 'Some items failed to migrate.'}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Continues where it left off — already-migrated orders are skipped.
                </p>
              </div>
              <button
                onClick={handleRetry}
                disabled={retrying || cleaning}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {retrying ? 'Starting...' : 'Retry'}
              </button>
            </div>

            {/* Fix Duplicates & Retry: remove CartSwitcher duplicates then re-migrate */}
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

        {/* Tools link — always visible once migration has started */}
        {progress && (
          <div className="mt-4 text-center">
            <a
              href={`/migrate/dedup/${jobId}`}
              className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
            >
              Remove duplicate products
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

function ProgressRow({
  label, icon, done, total, failed,
}: {
  label: string; icon: string; done: number; total: number; failed: number
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isWaiting = total === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </span>
        <span className="text-xs text-gray-500">
          {isWaiting ? 'Waiting...' : `${done.toLocaleString()} / ${total.toLocaleString()}`}
          {failed > 0 && <span className="text-red-500 ml-1">({failed} failed)</span>}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${failed > 0 ? 'bg-yellow-400' : 'bg-black'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:  { label: 'Queued',     cls: 'bg-gray-100 text-gray-600' },
    RUNNING:  { label: 'Running',    cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    DONE:     { label: 'Complete',   cls: 'bg-green-50 text-green-700 border border-green-200' },
    PARTIAL:  { label: 'Partial',    cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
    FAILED:   { label: 'Failed',     cls: 'bg-red-50 text-red-700 border border-red-200' },
  }
  const { label, cls } = map[status] ?? map.PENDING
  return (
    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  )
}
