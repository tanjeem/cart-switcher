'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle2, ArrowRight, Lock, Zap, Shield } from 'lucide-react'
import { PLANS, type PlanKey } from '@/lib/plans'

const G = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

const PLAN_ORDER: PlanKey[] = ['STARTER', 'GROWTH', 'PRO']

function CheckoutInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planParam = (searchParams.get('plan') ?? 'growth').toUpperCase() as PlanKey
  const cancelled = searchParams.get('cancelled') === '1'

  const [selected, setSelected] = useState<PlanKey>(PLAN_ORDER.includes(planParam) ? planParam : 'GROWTH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (PLAN_ORDER.includes(planParam)) setSelected(planParam)
  }, [planParam])

  async function handleCheckout() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      if (data.url) window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const plan = PLANS[selected]

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <a href="/" className="font-black text-xl tracking-tight">Cart<span style={{ color: G }}>Switcher</span></a>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Lock className="w-3.5 h-3.5" /> Secured by Stripe
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[900px] grid lg:grid-cols-2 gap-8 items-start">

          {/* Left — plan picker */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: G }}>Choose your plan</div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">One payment. Migration done.</h1>
              <p className="text-sm text-gray-400 mt-1">7-day money-back guarantee. No subscription ever.</p>
            </div>

            {cancelled && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                Payment was cancelled — your card was not charged.
              </div>
            )}

            {PLAN_ORDER.map(key => {
              const p = PLANS[key]
              const isSelected = selected === key
              return (
                <button key={key} onClick={() => setSelected(key)}
                  className="w-full text-left rounded-2xl border-2 p-5 transition-all"
                  style={{
                    borderColor: isSelected ? G : '#e5e7eb',
                    backgroundColor: isSelected ? GL : 'white',
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors`}
                        style={{ borderColor: isSelected ? G : '#d1d5db', backgroundColor: isSelected ? G : 'white' }}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-black text-gray-900">{p.name}</span>
                      {key === 'GROWTH' && (
                        <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: G }}>Most Popular</span>
                      )}
                    </div>
                    <span className="font-black text-xl text-gray-900">${p.price}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 ml-7">
                    {p.features.slice(0, 3).map(f => (
                      <span key={f} className="text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: isSelected ? G : '#9ca3af' }} />
                        {f}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Right — order summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm space-y-6">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Order summary</div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <div className="font-bold text-gray-900">CartSwitcher {plan.name}</div>
                  <div className="text-xs text-gray-400">One-time payment, lifetime access</div>
                </div>
                <div className="font-black text-xl text-gray-900">${plan.price}</div>
              </div>
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-gray-400">Total today</span>
                <span className="font-black text-gray-900 text-lg">${plan.price}.00</span>
              </div>
            </div>

            <ul className="space-y-2.5">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: G }} />{f}
                </li>
              ))}
            </ul>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
            )}

            <button onClick={handleCheckout} disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: G }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing...</>
                : <>Pay ${plan.price} — Start Migration <ArrowRight className="w-4 h-4" /></>
              }
            </button>

            <div className="space-y-2.5 pt-1 border-t border-gray-100">
              {[
                { icon: <Lock className="w-3.5 h-3.5" />, text: 'Secured by Stripe — PCI DSS compliant' },
                { icon: <Shield className="w-3.5 h-3.5" />, text: '7-day full refund if anything fails' },
                { icon: <Zap className="w-3.5 h-3.5" />, text: 'Instant access after payment' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2 text-xs text-gray-400">
                  <span style={{ color: G }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>}>
      <CheckoutInner />
    </Suspense>
  )
}
