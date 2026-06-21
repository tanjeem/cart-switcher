'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { MigrationEntities } from '@/types'

const ENTITY_DEFS: { key: keyof MigrationEntities; label: string; icon: string; description: string }[] = [
  { key: 'products',  label: 'Products',   icon: '📦', description: 'All products and variants' },
  { key: 'customers', label: 'Customers',  icon: '👥', description: 'Customer accounts and addresses' },
  { key: 'orders',    label: 'Orders',     icon: '🧾', description: 'Order history' },
  { key: 'coupons',   label: 'Coupons',    icon: '🏷️', description: 'Discount codes' },
  { key: 'posts',     label: 'Blog Posts', icon: '📝', description: 'Blog articles' },
]

const ALL_ON: MigrationEntities = { products: true, customers: true, orders: true, coupons: true, posts: true }

function ConnectForm() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const errorParam = searchParams.get('error')

  const [step, setStep] = useState<'woocommerce' | 'select' | 'shopify'>('woocommerce')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorParam ? `Error: ${errorParam}` : '')

  const [wc, setWc] = useState({ url: '', consumerKey: '', consumerSecret: '' })
  const [shopDomain, setShopDomain] = useState('')
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [entities, setEntities] = useState<MigrationEntities>(ALL_ON)

  const toggleEntity = (key: keyof MigrationEntities) => {
    setEntities(prev => {
      const next = { ...prev, [key]: !prev[key] }
      const anyOn = Object.values(next).some(Boolean)
      return anyOn ? next : prev
    })
  }

  async function validateWC() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/connections/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'woocommerce', ...wc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCounts(data.counts)
      setStep('select')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  async function connectShopify() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/shopify/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: shopDomain,
          wcUrl: wc.url,
          wcKey: wc.consumerKey,
          wcSecret: wc.consumerSecret,
          isDemo,
          entities,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      globalThis.location.href = data.authUrl
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect Shopify')
      setLoading(false)
    }
  }

  let stepIndex = 0
  if (step === 'select') stepIndex = 1
  else if (step === 'shopify') stepIndex = 2

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <a href="/" className="font-bold text-xl">CartSwitcher</a>
          {isDemo && (
            <span className="ml-3 inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200">
              Demo mode
            </span>
          )}
          <h1 className="text-2xl font-bold mt-4 mb-1">Connect your stores</h1>
          <p className="text-gray-500 text-sm">We need read access to WooCommerce and write access to Shopify</p>
        </div>

        <div className="flex items-center gap-2 mb-8 justify-center">
          <StepDot active={stepIndex === 0} done={stepIndex > 0} label="1. WooCommerce" />
          <div className="h-px w-8 bg-gray-200" />
          <StepDot active={stepIndex === 1} done={stepIndex > 1} label="2. What to migrate" />
          <div className="h-px w-8 bg-gray-200" />
          <StepDot active={stepIndex === 2} done={false} label="3. Shopify" />
        </div>

        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          {/* Step 1: WooCommerce */}
          {step === 'woocommerce' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">WooCommerce store</h2>
              <Field
                label="Store URL"
                placeholder="shingaraproduction.com"
                value={wc.url}
                onChange={v => setWc(p => ({ ...p, url: v }))}
              />
              <Field
                label="Consumer Key"
                placeholder="ck_xxxxxxxxxxxxxxxx"
                value={wc.consumerKey}
                onChange={v => setWc(p => ({ ...p, consumerKey: v }))}
              />
              <Field
                label="Consumer Secret"
                placeholder="cs_xxxxxxxxxxxxxxxx"
                value={wc.consumerSecret}
                onChange={v => setWc(p => ({ ...p, consumerSecret: v }))}
                type="password"
              />
              <p className="text-xs text-gray-400">
                Generate API keys in WooCommerce → Settings → Advanced → REST API
              </p>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={validateWC}
                disabled={loading || !wc.url || !wc.consumerKey || !wc.consumerSecret}
                className="w-full bg-black text-white py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
              >
                {loading ? 'Connecting...' : 'Connect WooCommerce'}
              </button>
            </div>
          )}

          {/* Step 2: Select what to migrate */}
          {step === 'select' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">What do you want to migrate?</h2>
              {counts && (
                <p className="text-sm text-gray-500">
                  We found data in your WooCommerce store. Select what to copy to Shopify.
                </p>
              )}
              <div className="space-y-2">
                {ENTITY_DEFS.map(({ key, label, icon, description }) => {
                  const count = counts?.[key] ?? 0
                  const on = entities[key]
                  return (
                    <button
                      key={key}
                      onClick={() => toggleEntity(key)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all
                        ${on
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        }
                      `}
                    >
                      <span className="text-xl">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{label}</div>
                        <div className={`text-xs ${on ? 'text-gray-300' : 'text-gray-400'}`}>{description}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold ${on ? 'text-white' : 'text-gray-600'}`}>
                          {count.toLocaleString()}
                        </div>
                        <div className={`text-xs ${on ? 'text-gray-300' : 'text-gray-400'}`}>items</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'bg-white border-white' : 'border-gray-300'}`}>
                        {on && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setStep('shopify')}
                disabled={!Object.values(entities).some(Boolean)}
                className="w-full bg-black text-white py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 3: Shopify */}
          {step === 'shopify' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('select')} className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
                  ← Back
                </button>
              </div>
              <h2 className="font-semibold text-lg">Shopify store</h2>
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex flex-wrap gap-1.5">
                {ENTITY_DEFS.filter(e => entities[e.key]).map(e => (
                  <span key={e.key} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                    {e.icon} {e.label}
                  </span>
                ))}
              </div>
              <Field
                label="Store domain"
                placeholder="mystore.myshopify.com"
                value={shopDomain}
                onChange={setShopDomain}
              />
              <p className="text-xs text-gray-400">
                You will be redirected to Shopify to approve the connection.
              </p>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={connectShopify}
                disabled={loading || !shopDomain}
                className="w-full bg-[#96bf48] text-white py-2.5 rounded-lg font-medium disabled:opacity-50 hover:bg-[#7da33a] transition-colors"
              >
                {loading ? 'Redirecting to Shopify...' : 'Connect with Shopify →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading...</div>}>
      <ConnectForm />
    </Suspense>
  )
}

function Field({
  label, placeholder, value, onChange, type = 'text',
}: Readonly<{
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
}>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  )
}

function StepDot({ active, done, label }: Readonly<{ active: boolean; done: boolean; label: string }>) {
  let dotColor = 'bg-gray-200'
  if (done) dotColor = 'bg-green-500'
  else if (active) dotColor = 'bg-black'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className={`text-xs ${active ? 'font-medium' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}

function CountBadge({ label, count }: Readonly<{ label: string; count: number }>) {
  return (
    <div className="text-center">
      <div className="font-semibold text-base">{count.toLocaleString()}</div>
      <div>{label}</div>
    </div>
  )
}
