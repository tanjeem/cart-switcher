'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ConnectForm() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const errorParam = searchParams.get('error')

  const [step, setStep] = useState<'woocommerce' | 'shopify'>('woocommerce')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorParam ? `Error: ${errorParam}` : '')

  const [wc, setWc] = useState({ url: '', consumerKey: '', consumerSecret: '' })
  const [shopDomain, setShopDomain] = useState('')
  const [counts, setCounts] = useState<Record<string, number> | null>(null)

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
      setStep('shopify')
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.authUrl
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect Shopify')
      setLoading(false)
    }
  }

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
          <StepDot active={step === 'woocommerce'} done={step === 'shopify'} label="1. WooCommerce" />
          <div className="h-px w-8 bg-gray-200" />
          <StepDot active={step === 'shopify'} done={false} label="2. Shopify" />
        </div>

        <div className="bg-white rounded-2xl border p-6 shadow-sm">
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

          {step === 'shopify' && (
            <div className="space-y-4">
              {counts && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                  <p className="text-sm font-medium text-green-800 mb-2">WooCommerce connected</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-green-700">
                    <CountBadge label="Products" count={counts.products} />
                    <CountBadge label="Orders" count={counts.orders} />
                    <CountBadge label="Customers" count={counts.customers} />
                    <CountBadge label="Coupons" count={counts.coupons} />
                    <CountBadge label="Posts" count={counts.posts} />
                  </div>
                </div>
              )}
              <h2 className="font-semibold text-lg">Shopify store</h2>
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
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
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

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : active ? 'bg-black' : 'bg-gray-200'}`} />
      <span className={`text-xs ${active ? 'font-medium' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}

function CountBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="text-center">
      <div className="font-semibold text-base">{count.toLocaleString()}</div>
      <div>{label}</div>
    </div>
  )
}
