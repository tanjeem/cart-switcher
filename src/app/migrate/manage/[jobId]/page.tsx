'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

type Entity = 'products' | 'customers' | 'orders'

interface EntityState {
  count: number | null
  ids: number[]
  loading: boolean
  deleting: boolean
  deleted: number
  total: number
  confirming: boolean
  error: string | null
}

interface Creds { domain: string; token: string }

const ENTITY_META: { key: Entity; label: string; icon: string; warning: string }[] = [
  {
    key: 'products',
    label: 'Products',
    icon: '📦',
    warning: 'This will permanently delete ALL products from your Shopify store — including ones not migrated by CartSwitcher.',
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: '👥',
    warning: 'This will permanently delete ALL customers from your Shopify store. This cannot be undone.',
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: '🧾',
    warning: 'This will permanently delete ALL orders from your Shopify store. This cannot be undone.',
  },
]

const BATCH_SIZE = 25

const initState = (): EntityState => ({
  count: null, ids: [], loading: false, deleting: false,
  deleted: 0, total: 0, confirming: false, error: null,
})

export default function ManagePage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [state, setState] = useState<Record<Entity, EntityState>>({
    products: initState(),
    customers: initState(),
    orders: initState(),
  })
  // Override credentials (shown when 401 occurs)
  const [creds, setCreds] = useState<Creds>({ domain: '', token: '' })
  const [showCredsForm, setShowCredsForm] = useState(false)
  const [savedCreds, setSavedCreds] = useState<Creds | null>(null)

  const patch = (entity: Entity, update: Partial<EntityState>) =>
    setState(prev => ({ ...prev, [entity]: { ...prev[entity], ...update } }))

  const credParams = (c: Creds | null) =>
    c ? `&domain=${encodeURIComponent(c.domain)}&token=${encodeURIComponent(c.token)}` : ''

  const credBody = (c: Creds | null) =>
    c ? { domain: c.domain, token: c.token } : {}

  const fetchCount = async (entity: Entity) => {
    patch(entity, { loading: true, error: null })
    try {
      const res = await fetch(`/api/shopify/manage/${jobId}?entity=${entity}${credParams(savedCreds)}`)
      const data = await res.json()
      if (!res.ok) {
        // Only show manual form if the server already tried all automatic fallbacks
        if (res.status === 401) setShowCredsForm(true)
        throw new Error(data.error ?? 'Failed to fetch')
      }
      patch(entity, { count: data.count, ids: data.ids, loading: false })
    } catch (err) {
      patch(entity, { loading: false, error: String(err) })
    }
  }

  const startDelete = async (entity: Entity) => {
    const ids = state[entity].ids
    if (!ids.length) return
    patch(entity, { deleting: true, deleted: 0, total: ids.length, confirming: false, error: null })

    let deleted = 0
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      try {
        const res = await fetch(`/api/shopify/manage/${jobId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity, ids: batch, ...credBody(savedCreds) }),
        })
        const data = await res.json()
        deleted += data.deleted ?? batch.length
      } catch {
        // continue on error
      }
      patch(entity, { deleted })
    }

    patch(entity, { deleting: false, count: 0, ids: [], deleted: 0, total: 0 })
  }

  const saveCreds = () => {
    if (!creds.domain.trim() || !creds.token.trim()) return
    setSavedCreds({ domain: creds.domain.trim(), token: creds.token.trim() })
    setShowCredsForm(false)
    // Reset all entity states so user can re-fetch with new creds
    setState({ products: initState(), customers: initState(), orders: initState() })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <a href="/" className="font-bold text-xl">CartSwitcher</a>
          <h1 className="text-2xl font-bold mt-4 mb-1">Manage Shopify Store Data</h1>
          <p className="text-gray-500 text-sm">Delete products, customers, or orders from your Shopify store</p>
        </div>

        {/* Credentials form — shown on 401 or manual toggle */}
        {showCredsForm ? (
          <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
            <p className="text-sm font-semibold text-gray-800 mb-1">Enter Shopify credentials</p>
            <p className="text-xs text-gray-500 mb-4">
              The stored credentials aren&apos;t working. Enter your Shopify store domain and Admin API access token.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Store domain</label>
                <input
                  type="text"
                  placeholder="your-store.myshopify.com"
                  value={creds.domain}
                  onChange={e => setCreds(p => ({ ...p, domain: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Admin API access token</label>
                <input
                  type="password"
                  placeholder="shpat_..."
                  value={creds.token}
                  onChange={e => setCreds(p => ({ ...p, token: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCredsForm(false)}
                  className="flex-1 border text-gray-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCreds}
                  disabled={!creds.domain.trim() || !creds.token.trim()}
                  className="flex-1 bg-black text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Save & continue
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex-1 mr-3">
              <p className="text-xs text-amber-800">
                <strong>Warning:</strong> deletions here are permanent and affect your live Shopify store.
              </p>
            </div>
            <button
              onClick={() => setShowCredsForm(true)}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 whitespace-nowrap"
            >
              {savedCreds ? 'Change credentials' : 'Wrong credentials?'}
            </button>
          </div>
        )}

        {savedCreds && !showCredsForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4 text-xs text-blue-800">
            Using manually entered credentials for <strong>{savedCreds.domain}</strong>
          </div>
        )}

        <div className="space-y-4">
          {ENTITY_META.map(({ key, label, icon, warning }) => {
            const s = state[key]
            const pct = s.total > 0 ? Math.round((s.deleted / s.total) * 100) : 0

            return (
              <div key={key} className="bg-white rounded-2xl border shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="font-semibold text-gray-900">{label}</span>
                    {s.count !== null && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {s.count.toLocaleString()} in store
                      </span>
                    )}
                  </div>
                  {s.count === null ? (
                    <button
                      onClick={() => fetchCount(key)}
                      disabled={s.loading}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                      {s.loading ? 'Loading...' : 'Check count'}
                    </button>
                  ) : (
                    <button
                      onClick={() => fetchCount(key)}
                      disabled={s.loading || s.deleting}
                      className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      {s.loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                </div>

                {s.error && (
                  <p className="text-xs text-red-600 mb-3">{s.error}</p>
                )}

                {s.deleting && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Deleting...</span>
                      <span>{s.deleted.toLocaleString()} / {s.total.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {s.count !== null && s.count > 0 && !s.deleting && (
                  <>
                    {!s.confirming ? (
                      <button
                        onClick={() => patch(key, { confirming: true })}
                        className="w-full mt-1 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Delete all {s.count.toLocaleString()} {label.toLowerCase()}
                      </button>
                    ) : (
                      <div className="mt-1 border border-red-200 rounded-lg p-3 bg-red-50">
                        <p className="text-xs text-red-800 mb-2">{warning}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => patch(key, { confirming: false })}
                            className="flex-1 bg-white border text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => startDelete(key)}
                            className="flex-1 bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Yes, delete all
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {s.count === 0 && (
                  <p className="text-sm text-gray-400 text-center py-1">No {label.toLowerCase()} in store</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center space-y-2">
          <a
            href={`/migrate/progress/${jobId}`}
            className="block text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
          >
            Back to migration progress
          </a>
          <a
            href={`/migrate/dedup/${jobId}`}
            className="block text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2"
          >
            Remove duplicate products
          </a>
        </div>
      </div>
    </div>
  )
}
