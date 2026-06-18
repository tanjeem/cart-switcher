'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { MigrationProgress } from '@/types'

export default function ProgressPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [progress, setProgress] = useState<MigrationProgress | null>(null)

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

  const isDone = progress?.status === 'DONE' || progress?.status === 'PARTIAL'
  const isFailed = progress?.status === 'FAILED'

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

        {isDone && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <p className="font-semibold text-green-800 mb-1">Migration complete!</p>
            <p className="text-sm text-green-700 mb-4">
              Your store data has been migrated to Shopify.
              {progress?.status === 'PARTIAL' && ' Some items failed — retry below or check your dashboard.'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a
                href="/dashboard"
                className="inline-block bg-black text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                View dashboard
              </a>
              {progress?.status === 'PARTIAL' && (
                <a
                  href="/migrate/connect"
                  className="inline-block bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Retry migration
                </a>
              )}
            </div>
          </div>
        )}

        {isFailed && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5 text-center">
            <p className="font-semibold text-red-800 mb-1">Migration failed</p>
            <p className="text-sm text-red-600 mb-4">Check your credentials and try again.</p>
            <a
              href="/migrate/connect"
              className="inline-block bg-black text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Try again
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
