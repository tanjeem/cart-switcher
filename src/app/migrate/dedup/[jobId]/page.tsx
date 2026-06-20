'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface DupGroup {
  title: string
  image?: string
  ids: number[]  // ids[0] is the one we keep, rest are deleted
}

type PageState = 'idle' | 'scanning' | 'ready' | 'deleting' | 'done'

export default function DedupPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [state, setState] = useState<PageState>('idle')
  const [groups, setGroups] = useState<DupGroup[]>([])
  const [totalExtras, setTotalExtras] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // group titles selected for deletion
  const [progress, setProgress] = useState({ deleted: 0, failed: 0, total: 0 })
  const [error, setError] = useState('')

  const scan = useCallback(async () => {
    setState('scanning')
    setError('')
    setGroups([])
    setSelected(new Set())
    try {
      const res = await fetch(`/api/shopify/dedup/${jobId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scan failed')
      setGroups(data.groups)
      setTotalExtras(data.totalExtras)
      // Pre-select all groups
      setSelected(new Set((data.groups as DupGroup[]).map(g => g.title)))
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
      setState('idle')
    }
  }, [jobId])

  // Auto-scan on first load
  useEffect(() => { scan() }, [scan])

  const toggleGroup = (title: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const deleteSelected = useCallback(async () => {
    // Collect IDs to delete: for each selected group, ids[1..] (keep ids[0])
    const toDelete: number[] = []
    for (const g of groups) {
      if (selected.has(g.title)) toDelete.push(...g.ids.slice(1))
    }
    if (toDelete.length === 0) return

    setState('deleting')
    setProgress({ deleted: 0, failed: 0, total: toDelete.length })

    // Send in batches of 20 to avoid long-running requests
    const BATCH = 20
    let deleted = 0
    let failed = 0
    for (let i = 0; i < toDelete.length; i += BATCH) {
      const batch = toDelete.slice(i, i + BATCH)
      try {
        const res = await fetch(`/api/shopify/dedup/${jobId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch }),
        })
        const data = await res.json()
        deleted += data.deleted ?? 0
        failed += data.failed ?? 0
      } catch {
        failed += batch.length
      }
      setProgress({ deleted, failed, total: toDelete.length })
    }

    setState('done')
  }, [groups, selected, jobId])

  const selectedExtras = groups
    .filter(g => selected.has(g.title))
    .reduce((sum, g) => sum + g.ids.length - 1, 0)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href={`/migrate/progress/${jobId}`} className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
            ← Back to migration
          </a>
          <h1 className="text-2xl font-bold">Remove duplicate products</h1>
          <p className="text-gray-500 text-sm mt-1">
            Scans your Shopify store for products with the same name — regardless of origin — and removes the extras, keeping the oldest copy.
          </p>
        </div>

        {/* Scan button / status */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={scan}
            disabled={state === 'scanning' || state === 'deleting'}
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {state === 'scanning' ? 'Scanning...' : 'Rescan'}
          </button>
          {state === 'ready' && groups.length > 0 && (
            <span className="text-sm text-gray-600">
              Found <strong>{groups.length}</strong> duplicate {groups.length === 1 ? 'group' : 'groups'} — <strong>{totalExtras}</strong> extra {totalExtras === 1 ? 'copy' : 'copies'} to remove
            </span>
          )}
          {state === 'ready' && groups.length === 0 && (
            <span className="text-sm text-green-700 font-medium">No duplicate products found.</span>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {/* Deletion progress */}
        {state === 'deleting' && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Deleting... {progress.deleted + progress.failed} / {progress.total}
            </p>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${Math.round(((progress.deleted + progress.failed) / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {state === 'done' && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-medium text-green-800">
              Done — {progress.deleted} deleted{progress.failed > 0 ? `, ${progress.failed} failed` : ''}.
            </p>
            <button onClick={scan} className="text-sm text-green-700 underline">Rescan</button>
          </div>
        )}

        {/* Duplicate groups list */}
        {(state === 'ready' || state === 'deleting' || state === 'done') && groups.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Bulk action bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.size === groups.length}
                  onChange={() => setSelected(
                    selected.size === groups.length ? new Set() : new Set(groups.map(g => g.title))
                  )}
                  className="rounded"
                />
                Select all
              </label>
              <button
                onClick={deleteSelected}
                disabled={selected.size === 0 || state === 'deleting' || state === 'done'}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Delete {selectedExtras} extra {selectedExtras === 1 ? 'copy' : 'copies'}
              </button>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {groups.map(g => {
                const extraCount = g.ids.length - 1
                const isSelected = selected.has(g.title)
                return (
                  <label
                    key={g.title}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? '' : 'opacity-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGroup(g.title)}
                      className="rounded shrink-0"
                    />
                    {g.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.image} alt={g.title} className="w-10 h-10 object-cover rounded border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded border shrink-0 flex items-center justify-center text-gray-400 text-xs">?</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.title}</p>
                      <p className="text-xs text-gray-500">{g.ids.length} copies in Shopify</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                      −{extraCount} {extraCount === 1 ? 'copy' : 'copies'}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
