'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import NextLink from 'next/link'
import {
  Link2, Key, CheckSquare, Play, FileCheck,
  ChevronRight, Check, Lock, Globe, ArrowRight,
  Package, Users, ShoppingCart, Tag, FileText, Search, Shield
} from 'lucide-react'

const G = '#96bf48'
const GD = '#4a7a10'
const GL = '#eef7e0'

const STEPS = [
  {
    id: 'connect',
    icon: Link2,
    label: 'Connect WooCommerce',
    tagline: 'Paste your URL + API keys. 3 minutes.',
    color: '#818cf8',
    screen: <ConnectScreen />,
  },
  {
    id: 'shopify',
    icon: Globe,
    label: 'Connect Shopify',
    tagline: 'Authorize via Shopify OAuth. One click.',
    color: '#22d3ee',
    screen: <ShopifyScreen />,
  },
  {
    id: 'select',
    icon: CheckSquare,
    label: 'Choose what to migrate',
    tagline: 'Pick entity types or select all.',
    color: '#fbbf24',
    screen: <SelectScreen />,
  },
  {
    id: 'migrate',
    icon: Play,
    label: 'Run the migration',
    tagline: 'Watch it move in real time.',
    color: G,
    screen: <RunScreen />,
  },
  {
    id: 'report',
    icon: FileCheck,
    label: 'Download report',
    tagline: 'Full log + SEO redirect map.',
    color: '#f472b6',
    screen: <ReportScreen />,
  },
]

function ConnectScreen() {
  return (
    <div className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Step 1 of 5 — WooCommerce Connection</div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store URL</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 font-mono">
          <Globe className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          https://myboutique.com
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Consumer Key</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 font-mono">
          <Key className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          ck_••••••••••••••••
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Consumer Secret</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 font-mono">
          <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          cs_••••••••••••••••
        </div>
      </div>
      <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-gray-100">
        <motion.div className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <span className="text-xs text-emerald-600 font-semibold">Connected — 2,847 products detected</span>
      </div>
      <div className="flex items-start gap-2 text-[11px] text-gray-400 bg-gray-50 rounded-lg p-3 mt-1">
        <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-300" />
        Your keys are used once to read data and never stored.
      </div>
    </div>
  )
}

function ShopifyScreen() {
  return (
    <div className="space-y-4">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">Step 2 of 5 — Shopify Connection</div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Shopify Store Domain</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400 font-mono">
          <Globe className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
          my-store.myshopify.com
        </div>
      </div>
      <div className="rounded-xl border-2 p-4 text-center" style={{ borderColor: `${G}40`, backgroundColor: GL }}>
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: G }}>
          <span className="text-white font-black text-lg">S</span>
        </div>
        <div className="font-bold text-gray-900 text-sm mb-1">Authorize via Shopify OAuth</div>
        <div className="text-xs text-gray-500 mb-3">You'll be redirected to Shopify to approve read/write access</div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full text-white" style={{ backgroundColor: G }}>
          <Check className="w-3.5 h-3.5" /> Connected to my-store.myshopify.com
        </div>
      </div>
      <div className="flex items-center gap-2.5 pt-2">
        <motion.div className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <span className="text-xs text-emerald-600 font-semibold">Shopify store ready to receive data</span>
      </div>
    </div>
  )
}

const ENTITIES = [
  { icon: Package,      label: 'Products',   count: '2,847', checked: true  },
  { icon: Users,        label: 'Customers',  count: '14,203', checked: true  },
  { icon: ShoppingCart, label: 'Orders',     count: '9,541', checked: true  },
  { icon: Tag,          label: 'Coupons',    count: '312',   checked: true  },
  { icon: FileText,     label: 'Blog Posts', count: '89',    checked: false },
  { icon: Search,       label: 'SEO Data',   count: '3,200', checked: true  },
]

function SelectScreen() {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Step 3 of 5 — Choose What to Migrate</div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">5 of 6 selected</span>
        <button className="text-xs font-bold" style={{ color: G }}>Select All</button>
      </div>
      {ENTITIES.map(e => {
        const Icon = e.icon
        return (
          <div key={e.label}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors"
            style={{
              borderColor: e.checked ? `${G}40` : '#f3f4f6',
              backgroundColor: e.checked ? '#f7fdf0' : 'white',
            }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: e.checked ? GL : '#f9fafb' }}>
              <Icon className="w-3.5 h-3.5" style={{ color: e.checked ? G : '#d1d5db' }} />
            </div>
            <span className="flex-1 text-sm font-medium" style={{ color: e.checked ? '#111827' : '#9ca3af' }}>
              {e.label}
            </span>
            <span className="text-xs font-mono text-gray-400">{e.count}</span>
            <div className={`w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 ${e.checked ? '' : 'border border-gray-200'}`}
              style={e.checked ? { backgroundColor: G } : {}}>
              {e.checked && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const LOG_LINES = [
  { t: '00:00', msg: 'Migration started', type: 'info' },
  { t: '00:04', msg: 'Fetching products batch 1/57…', type: 'info' },
  { t: '00:12', msg: '✓ Products 1–50 pushed to Shopify', type: 'ok' },
  { t: '00:18', msg: 'Fetching products batch 2/57…', type: 'info' },
  { t: '00:31', msg: '✓ Products 51–100 pushed', type: 'ok' },
  { t: '00:44', msg: '✓ All 2,847 products complete', type: 'ok' },
  { t: '00:47', msg: 'Starting customers migration…', type: 'info' },
]

function RunScreen() {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Step 4 of 5 — Live Migration</div>
      {[
        { label: 'Products',  pct: 100, done: true  },
        { label: 'Customers', pct: 47,  done: false },
        { label: 'Orders',    pct: 0,   done: false },
      ].map(e => (
        <div key={e.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-600">{e.label}</span>
            <span className="text-xs font-mono" style={{ color: e.done ? G : e.pct > 0 ? '#818cf8' : '#d1d5db' }}>
              {e.done ? '✓ Done' : e.pct > 0 ? `${e.pct}%` : 'Waiting…'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ backgroundColor: e.done ? G : '#818cf8' }}
              initial={{ width: 0 }} animate={{ width: `${e.pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }} />
          </div>
        </div>
      ))}
      <div className="mt-3 rounded-xl bg-gray-950 p-3 font-mono text-[10px] space-y-1 overflow-hidden" style={{ maxHeight: '100px' }}>
        {LOG_LINES.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex gap-2">
            <span className="text-gray-600 flex-shrink-0">{l.t}</span>
            <span style={{ color: l.type === 'ok' ? G : l.type === 'err' ? '#f87171' : '#94a3b8' }}>{l.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ReportScreen() {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Step 5 of 5 — Migration Report</div>
      <div className="rounded-xl p-4 border-2" style={{ borderColor: `${G}40`, backgroundColor: '#f7fdf0' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: G }}>
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-gray-900 text-sm">Migration complete — 0 errors</span>
        </div>
        {[
          { label: 'Products migrated',  val: '2,847' },
          { label: 'Customers',          val: '14,203' },
          { label: 'Orders',             val: '9,541' },
          { label: 'SEO redirects',      val: '3,200' },
          { label: 'Total time',         val: '48 min' },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-green-100 last:border-0">
            <span className="text-xs text-gray-600">{r.label}</span>
            <span className="text-xs font-black" style={{ color: GD }}>{r.val}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center">
          <div className="text-xs font-bold text-gray-700">301 Redirect Map</div>
          <div className="text-[10px] text-gray-400">3,200 URLs mapped</div>
        </div>
        <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center">
          <div className="text-xs font-bold text-gray-700">Full Log</div>
          <div className="text-[10px] text-gray-400">CSV download</div>
        </div>
      </div>
    </div>
  )
}

export function InteractiveWalkthrough() {
  const [active, setActive] = useState(0)

  return (
    <section id="demo" className="py-28 border-t border-gray-100 bg-white">
      <div className="max-w-[1280px] mx-auto px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}>

          {/* Header */}
          <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Interactive demo</div>
              <h2 className="text-[42px] md:text-[52px] font-black tracking-tighter text-gray-900 leading-[0.95]">
                See exactly how<br />
                <span style={{ color: G }}>it works.</span>
              </h2>
              <p className="text-gray-500 text-[15px] mt-4 max-w-lg leading-relaxed">
                Click through each step. This is the real CartSwitcher UI — nothing simplified for the demo.
              </p>
            </div>
            <NextLink href="/migrate/connect?demo=true"
              className="flex-shrink-0 inline-flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 hover:scale-[1.02] transition-all"
              style={{ backgroundColor: G }}>
              Try it live <ArrowRight className="w-4 h-4" />
            </NextLink>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            className="grid lg:grid-cols-[340px_1fr] gap-6">

            {/* Step list */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                const isActive = active === i
                const isDone = i < active
                return (
                  <button key={step.id} onClick={() => setActive(i)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all flex-shrink-0 min-w-[200px] lg:min-w-0 lg:w-full"
                    style={{
                      borderColor: isActive ? step.color : 'transparent',
                      backgroundColor: isActive ? `${step.color}0d` : isDone ? '#fafaf9' : '#fafaf9',
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: isDone ? G : isActive ? step.color : '#f3f4f6',
                      }}>
                      {isDone
                        ? <Check className="w-4 h-4 text-white" />
                        : <Icon className="w-4 h-4" style={{ color: isActive ? 'white' : '#9ca3af' }} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-widest mb-0.5"
                        style={{ color: isActive ? step.color : isDone ? G : '#9ca3af' }}>
                        Step {i + 1}
                      </div>
                      <div className="font-bold text-gray-900 text-sm leading-tight">{step.label}</div>
                      <div className="text-gray-400 text-xs mt-0.5 hidden lg:block">{step.tagline}</div>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 text-gray-300 hidden lg:block" />}
                  </button>
                )
              })}
            </div>

            {/* Screen */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md px-3 py-1 text-[11px] text-gray-400 font-mono max-w-[280px] mx-auto text-center border border-gray-200">
                    app.cartswitcher.com/migrate/{STEPS[active].id}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: i === active ? G : i < active ? `${G}60` : '#e5e7eb' }} />
                  ))}
                </div>
              </div>

              {/* Screen content */}
              <div className="p-6 lg:p-8 min-h-[420px]">
                <AnimatePresence mode="wait">
                  <motion.div key={active}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}>
                    {STEPS[active].screen}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Nav buttons */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setActive(a => Math.max(0, a - 1))}
                  disabled={active === 0}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1.5">
                  ← Previous
                </button>
                <div className="text-xs text-gray-400">Step {active + 1} of {STEPS.length}</div>
                {active < STEPS.length - 1 ? (
                  <button onClick={() => setActive(a => Math.min(STEPS.length - 1, a + 1))}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: STEPS[active].color }}>
                    Next step <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <NextLink href="/migrate/connect?demo=true"
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: G }}>
                    Start for free <ArrowRight className="w-3.5 h-3.5" />
                  </NextLink>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
