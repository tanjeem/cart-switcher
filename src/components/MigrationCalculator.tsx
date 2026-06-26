'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { ArrowRight, Clock, Package, Users, ShoppingCart, Tag, FileText, Zap, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const G = '#96bf48'
const GD = '#4a7a10'
const GL = '#eef7e0'

const PRODUCT_BANDS = [
  { label: 'Under 500',      value: 250,   time: 8  },
  { label: '500 – 2,000',    value: 1000,  time: 18 },
  { label: '2,000 – 5,000',  value: 3500,  time: 32 },
  { label: '5,000 – 15,000', value: 10000, time: 52 },
  { label: '15,000+',        value: 25000, time: 85 },
]

const ORDER_BANDS = [
  { label: 'Under 1,000',    value: 500,   time: 4  },
  { label: '1,000 – 5,000',  value: 2500,  time: 10 },
  { label: '5,000 – 20,000', value: 12500, time: 22 },
  { label: '20,000 – 50,000',value: 35000, time: 40 },
  { label: '50,000+',        value: 75000, time: 65 },
]

type BandIdx = 0 | 1 | 2 | 3 | 4

function recommendedPlan(products: number): { name: string; price: string } {
  if (products <= 2000)  return { name: 'Starter', price: '$79' }
  if (products <= 15000) return { name: 'Growth',  price: '$149' }
  return                        { name: 'Pro',      price: '$249' }
}

function SliderRow({
  label, icon: Icon, bands, value, onChange, color,
}: {
  label: string
  icon: React.ElementType
  bands: { label: string; value: number; time: number }[]
  value: BandIdx
  onChange: (v: BandIdx) => void
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-black text-gray-900">{bands[value].label}</span>
      </div>
      <div className="relative px-1">
        <div className="w-full h-1.5 rounded-full bg-gray-100 relative">
          <div className="h-full rounded-full transition-all duration-200"
            style={{ width: `${(value / (bands.length - 1)) * 100}%`, backgroundColor: color }} />
        </div>
        <input type="range" min={0} max={bands.length - 1} step={1} value={value}
          onChange={e => onChange(Number(e.target.value) as BandIdx)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 -top-2" />
        <div className="flex justify-between mt-1.5">
          {bands.map((b, i) => (
            <button key={i} onClick={() => onChange(i as BandIdx)}
              className="w-2.5 h-2.5 rounded-full border-2 border-white transition-colors -mt-1.5 -ml-1"
              style={{ backgroundColor: i <= value ? color : '#e5e7eb', boxShadow: '0 0 0 1px #e5e7eb' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MigrationCalculator() {
  const [products, setProducts] = useState<BandIdx>(1)
  const [orders,   setOrders]   = useState<BandIdx>(1)
  const [hasCoupons,   setHasCoupons]   = useState(true)
  const [hasBlog,      setHasBlog]      = useState(false)
  const [hasCustomers, setHasCustomers] = useState(true)

  const result = useMemo(() => {
    let mins = PRODUCT_BANDS[products].time + ORDER_BANDS[orders].time
    if (hasCustomers) mins += Math.round(PRODUCT_BANDS[products].value / 500)
    if (hasCoupons)   mins += 3
    if (hasBlog)      mins += 5
    const low  = Math.max(10, Math.round(mins * 0.8))
    const high = Math.round(mins * 1.25)
    const plan = recommendedPlan(PRODUCT_BANDS[products].value)
    return { low, high, plan, totalRecords: PRODUCT_BANDS[products].value + ORDER_BANDS[orders].value }
  }, [products, orders, hasCoupons, hasBlog, hasCustomers])

  const pct = Math.min(100, Math.round(((result.low + result.high) / 2) / 120 * 100))

  return (
    <section className="py-28 border-t border-gray-100 bg-[#fafaf9]">
      <div className="max-w-[1280px] mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}>

          {/* Header */}
          <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            className="text-center mb-12">
            <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Migration calculator</div>
            <h2 className="text-[42px] md:text-[52px] font-black tracking-tighter text-gray-900 leading-[0.95] mb-4">
              How long will your<br />
              <span style={{ color: G }}>migration take?</span>
            </h2>
            <p className="text-gray-500 text-[15px] max-w-md mx-auto leading-relaxed">
              Dial in your store size. We'll tell you exactly how long it takes — and which plan fits.
            </p>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            className="grid lg:grid-cols-[1fr_380px] gap-6">

            {/* Left — inputs */}
            <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm space-y-7">
              <SliderRow label="Products" icon={Package}      bands={PRODUCT_BANDS} value={products} onChange={setProducts} color="#818cf8" />
              <SliderRow label="Orders"   icon={ShoppingCart} bands={ORDER_BANDS}   value={orders}   onChange={setOrders}   color="#22d3ee" />

              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Also migrating?</div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { icon: Users,    label: 'Customers', state: hasCustomers, set: setHasCustomers, color: '#a78bfa' },
                    { icon: Tag,      label: 'Coupons',   state: hasCoupons,   set: setHasCoupons,   color: '#fbbf24' },
                    { icon: FileText, label: 'Blog Posts',state: hasBlog,      set: setHasBlog,      color: '#f472b6' },
                  ].map(item => {
                    const Icon = item.icon
                    return (
                      <button key={item.label} onClick={() => item.set(s => !s)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: item.state ? `${item.color}50` : '#f3f4f6',
                          backgroundColor: item.state ? `${item.color}0a` : 'white',
                        }}>
                        <Icon className="w-4 h-4" style={{ color: item.state ? item.color : '#d1d5db' }} />
                        <span className="text-[11px] font-semibold" style={{ color: item.state ? '#374151' : '#9ca3af' }}>
                          {item.label}
                        </span>
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: item.state ? item.color : '#f3f4f6' }}>
                          {item.state && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right — result */}
            <div className="flex flex-col gap-4">

              {/* Time estimate */}
              <div className="bg-white rounded-2xl border-2 p-6 shadow-sm"
                style={{ borderColor: `${G}40` }}>
                <div className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: G }}>
                  Estimated migration time
                </div>

                {/* Big time display */}
                <AnimatePresence mode="wait">
                  <motion.div key={`${result.low}-${result.high}`}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-baseline gap-2 mb-2">
                    <Clock className="w-5 h-5 mb-1 flex-shrink-0" style={{ color: G }} />
                    <span className="text-[44px] font-black text-gray-900 tracking-tighter leading-none">
                      {result.low}–{result.high}
                    </span>
                    <span className="text-gray-400 text-base font-semibold">min</span>
                  </motion.div>
                </AnimatePresence>

                {/* Speed bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                    <span>Fast</span><span>Average</span><span>Large store</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ backgroundColor: G, boxShadow: `0 0 8px ${G}60` }}
                      animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G }} />
                    ~{result.totalRecords.toLocaleString()} total records
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G }} />
                    Your WooCommerce store stays live throughout
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G }} />
                    Zero manual steps — fully automated
                  </div>
                </div>
              </div>

              {/* Recommended plan */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Recommended plan</div>
                <AnimatePresence mode="wait">
                  <motion.div key={result.plan.name}
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Zap className="w-4 h-4" style={{ color: G }} />
                        <span className="font-black text-gray-900 text-lg">{result.plan.name}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {result.plan.name === 'Starter' ? 'Up to 2,000 products' :
                         result.plan.name === 'Growth'  ? 'Up to 15,000 products' :
                                                          'Unlimited products'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-gray-900">{result.plan.price}</div>
                      <div className="text-[10px] text-gray-400">one-time</div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* CTA */}
              <Link href="/migrate/connect?demo=true"
                className="flex items-center justify-center gap-2.5 text-white font-bold py-4 rounded-2xl text-[15px] hover:opacity-90 hover:scale-[1.01] transition-all shadow-[0_4px_20px_rgba(150,191,72,0.35)]"
                style={{ backgroundColor: G }}>
                Start free — test with 25 products
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-center text-[11px] text-gray-400">
                No credit card · Store stays live · 7-day money-back
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
