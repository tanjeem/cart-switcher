'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AnimatedDemo } from '@/components/AnimatedDemo'
import {
  Package, Users, ShoppingCart, Tag, FileText, Search,
  ArrowRight, ShieldCheck, Zap, CheckCircle2,
  X, Check, Star, Clock, AlertTriangle, TrendingUp, Lock, ChevronDown, MoveRight
} from 'lucide-react'

const G = '#96bf48'
const GD = '#5a8a1f'
const GL = '#f0f7e6'

const up: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const sg: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const TESTIMONIALS = [
  {
    name: 'Sarah Chen', role: 'Owner, Bloom & Botanics', initials: 'SC', color: 'bg-violet-100 text-violet-700',
    text: "I put off migrating for two years. CartSwitcher moved 3,400 products and 8 years of orders in under an hour. Not a single thing was wrong.",
    stars: 5,
  },
  {
    name: 'Marcus Webb', role: 'CTO, TechParts Direct', initials: 'MW', color: 'bg-blue-100 text-blue-700',
    text: "Tried manual CSV first. Two days, still broken. CartSwitcher did it in 40 minutes. The SEO redirect map alone saved us thousands.",
    stars: 5,
  },
  {
    name: 'Priya Nair', role: 'Shopify Developer', initials: 'PN', color: 'bg-rose-100 text-rose-700',
    text: "I've done dozens of WooCommerce migrations for clients. CartSwitcher is the only tool I trust. API-direct means zero data corruption.",
    stars: 5,
  },
]

const MIGRATE_ITEMS = [
  { icon: Package,      label: 'Products',   desc: 'Titles, descriptions, variants, SKUs, pricing, inventory, images.' },
  { icon: Users,        label: 'Customers',  desc: 'Contact info, billing & shipping addresses, order history.' },
  { icon: ShoppingCart, label: 'Orders',     desc: 'Line items, shipping, payment status, notes, dates.' },
  { icon: Tag,          label: 'Coupons',    desc: 'Discount codes, types, usage limits, expiry dates.' },
  { icon: FileText,     label: 'Blog Posts', desc: 'Rich text, images, authors, slugs, publish dates.' },
  { icon: Search,       label: 'SEO Data',   desc: 'Meta titles, descriptions, URL handles, 301 redirect map.' },
]

const COMPARISON = [
  { feature: 'Zero store downtime',   cs: true,  manual: false, plugin: 'partial' },
  { feature: 'No data corruption',    cs: true,  manual: false, plugin: false },
  { feature: 'SEO redirect map',      cs: true,  manual: false, plugin: false },
  { feature: 'Encrypted API transfer',cs: true,  manual: false, plugin: false },
  { feature: 'Orders & customers',    cs: true,  manual: true,  plugin: 'partial' },
  { feature: 'Coupons & blog posts',  cs: true,  manual: false, plugin: false },
  { feature: 'Done in under 1 hour',  cs: true,  manual: false, plugin: false },
  { feature: 'No tech skills needed', cs: true,  manual: false, plugin: true },
]

const FAQ = [
  { q: 'Will my WooCommerce store go down during migration?', a: 'Never. We read from your store via API while it stays fully live. Your customers keep shopping throughout the entire process.' },
  { q: 'What happens to my SEO rankings?', a: 'We auto-generate a 301 redirect map for every product, category, and blog URL so Google seamlessly transfers your ranking authority to your new Shopify URLs.' },
  { q: 'Is my customer data safe?', a: 'We connect via official APIs with encrypted HTTPS. We never store your data permanently — it flows directly from WooCommerce to Shopify.' },
  { q: 'How long does it actually take?', a: 'Most stores finish in under an hour. A store with 5,000 products and 10,000 orders typically completes in 45–90 minutes.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-gray-100 last:border-0">
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none text-gray-900 font-semibold text-[15px] hover:text-green-700 transition-colors select-none">
        {q}
        <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0 group-open:rotate-180 transition-transform duration-200" />
      </summary>
      <p className="pb-5 text-gray-500 text-sm leading-relaxed -mt-1">{a}</p>
    </details>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-3.5 bg-white/95 backdrop-blur-md border-b border-gray-100/80">
        <span className="font-black text-xl tracking-tight">
          Cart<span style={{ color: G }}>Switcher</span>
        </span>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-500">
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link href="/migrate/connect" className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2.5 rounded-full transition-all hover:opacity-90 hover:scale-[1.02]" style={{ backgroundColor: G }}>
            Start Free <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-20 pb-0 overflow-hidden bg-white">
        {/* top green line accent */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${G}, transparent)` }} />

        <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-0 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">

          {/* Left: Copy */}
          <motion.div
            initial="hidden" animate="visible" variants={sg}
            className="flex-1 min-w-0 lg:max-w-[540px]"
          >
            <motion.div variants={up} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold mb-7 tracking-wide"
              style={{ borderColor: 'rgba(150,191,72,0.5)', backgroundColor: GL, color: GD }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: G }} />
              Trusted by 500+ Shopify merchants
            </motion.div>

            <motion.h1 variants={up} className="text-[52px] md:text-[64px] lg:text-[72px] font-black tracking-tighter leading-[0.9] text-gray-900 mb-6">
              Move your<br />
              WooCommerce<br />
              store to Shopify<span style={{ color: G }}>.</span>
              <br />
              <span className="text-gray-300">Tonight.</span>
            </motion.h1>

            <motion.p variants={up} className="text-lg text-gray-500 leading-relaxed mb-8 max-w-[440px]">
              Products, customers, orders, coupons, blog posts, and SEO — all migrated automatically in under an hour. Zero downtime. Zero data loss.
            </motion.p>

            <motion.div variants={up} className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link href="/migrate/connect" className="group flex items-center justify-center gap-2.5 text-white px-7 py-3.5 rounded-full font-bold text-[15px] transition-all hover:opacity-90 hover:shadow-[0_6px_24px_rgba(150,191,72,0.4)] hover:scale-[1.02]" style={{ backgroundColor: G }}>
                Start Free Migration
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/migrate/connect?demo=true" className="flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 px-7 py-3.5 rounded-full font-semibold text-[15px] transition-all">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Free sandbox test
              </Link>
            </motion.div>

            <motion.div variants={up} className="flex items-center gap-5 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />10 products free</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />No downtime</span>
            </motion.div>
          </motion.div>

          {/* Right: Demo — visible above fold */}
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 w-full lg:max-w-[560px] self-end"
          >
            <AnimatedDemo />
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 border-t border-gray-100 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '100k+', label: 'Products migrated',    sub: 'across all customers' },
              { value: '$0',    label: 'Data lost',            sub: 'in our entire history' },
              { value: '<1hr',  label: 'Average migration',    sub: 'start to finish' },
              { value: '99.9%', label: 'Uptime',               sub: 'guaranteed SLA' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1">
                <div className="text-[42px] font-black tracking-tighter leading-none" style={{ color: G }}>{s.value}</div>
                <div className="text-gray-900 font-bold text-sm">{s.label}</div>
                <div className="text-gray-400 text-xs font-medium">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 border-t border-gray-100" style={{ backgroundColor: '#fafaf9' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="mb-14">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>How it works</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 max-w-lg leading-tight">
                Three steps.<br />One hour. Done.
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Connect your stores', body: 'Enter your WooCommerce URL and API keys, then connect your Shopify store. Takes 3 minutes. Nothing to install.', icon: '🔌' },
                { step: '02', title: 'Choose what to migrate', body: 'Pick which data types you want moved — products, customers, orders, coupons, blog posts, SEO. Or select all.', icon: '✅' },
                { step: '03', title: 'Watch it happen live', body: "Hit migrate and watch your data move in real time. Your WooCommerce store stays live the entire time. You're done.", icon: '🚀' },
              ].map((item, i) => (
                <motion.div key={item.step} variants={up} className="relative bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-5">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-[11px] font-black text-gray-200 tracking-[0.1em]">{item.step}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2 tracking-tight">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                  {i < 2 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 items-center justify-center">
                      <MoveRight className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHAT MIGRATES ── */}
      <section className="py-24 border-t border-gray-100 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg} className="flex flex-col lg:flex-row gap-14 items-start">

            {/* Left sticky header */}
            <motion.div variants={up} className="lg:sticky lg:top-28 flex-shrink-0 lg:w-[300px]">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Complete transfer</div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 leading-tight mb-4">
                Every piece<br />of your store.
              </h2>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-6">
                If it matters to your business, we move it. No cherry-picking, no manual cleanup after.
              </p>
              <Link href="/migrate/connect" className="inline-flex items-center gap-2 text-white text-sm font-bold px-5 py-3 rounded-full transition-all hover:opacity-90" style={{ backgroundColor: G }}>
                See it in action <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>

            {/* Right: items grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MIGRATE_ITEMS.map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div key={item.label} variants={up} className="flex items-start gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GL }}>
                      <Icon className="w-4 h-4" style={{ color: G }} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm mb-0.5">{item.label}</div>
                      <div className="text-gray-400 text-xs leading-relaxed">{item.desc}</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHY NOT ALTERNATIVES ── */}
      <section className="py-24 border-t border-gray-100" style={{ backgroundColor: '#fafaf9' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="flex flex-col lg:flex-row gap-4 items-start justify-between mb-12">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>The alternative</div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 leading-tight">
                  Other ways to migrate<br />
                  <span className="text-gray-300">will cost you more.</span>
                </h2>
              </div>
              <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold border border-amber-200 bg-amber-50 px-4 py-2.5 rounded-full self-start mt-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Real merchant experiences
              </div>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {[
                { title: 'DIY with plugins', cost: '~$200/yr + your time', icon: '🔧', points: ['Crashes halfway through', 'Corrupts product metadata', 'Breaks variant images', 'Still need manual cleanup'] },
                { title: 'Manual CSV export', cost: '3–5 days of work',    icon: '📊', points: ['No order history', 'Images must be re-uploaded', 'SEO rankings tank', 'Customers re-enter addresses'] },
                { title: 'Hire a developer',  cost: '$2,000–$10,000',      icon: '👨‍💻', points: ['2–4 week timeline', 'Miss coupon codes', 'No guarantee on data', 'Cost balloons quickly'] },
              ].map(alt => (
                <motion.div key={alt.title} variants={up} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{alt.icon}</span>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{alt.title}</div>
                        <div className="text-red-500 text-xs font-semibold">{alt.cost}</div>
                      </div>
                    </div>
                    <X className="w-4 h-4 text-red-300 flex-shrink-0" />
                  </div>
                  <ul className="p-5 space-y-2.5">
                    {alt.points.map(p => (
                      <li key={p} className="flex items-start gap-2.5 text-xs text-gray-500">
                        <X className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* VS CartSwitcher banner */}
            <motion.div variants={up} className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between" style={{ backgroundColor: GL, border: `1.5px solid rgba(150,191,72,0.35)` }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0" style={{ backgroundColor: G }}>✓</div>
                <div>
                  <div className="font-bold text-gray-900 text-[15px]">CartSwitcher: $49 one-time</div>
                  <div className="text-gray-500 text-sm">Done in under an hour. Zero downtime. Zero data loss.</div>
                </div>
              </div>
              <Link href="/migrate/connect" className="flex-shrink-0 flex items-center gap-2 text-white text-sm font-bold px-5 py-3 rounded-full transition-all hover:opacity-90" style={{ backgroundColor: G }}>
                Start now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-24 border-t border-gray-100 bg-white">
        <div className="max-w-[900px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="text-center mb-12">
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 mb-3">
                The numbers don't lie.
              </h2>
              <p className="text-gray-400 font-medium">CartSwitcher vs every other option.</p>
            </motion.div>

            <motion.div variants={up} className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-4 border-b border-gray-200 bg-gray-50">
                <div className="p-4 text-gray-400 text-xs font-bold uppercase tracking-wider">Feature</div>
                <div className="p-4 text-center">
                  <span className="inline-flex items-center gap-1.5 text-white text-xs font-black px-3 py-1.5 rounded-full" style={{ backgroundColor: G }}>
                    CartSwitcher
                  </span>
                </div>
                <div className="p-4 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">Manual</div>
                <div className="p-4 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">Plugin</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-4 border-b border-gray-100 last:border-0 ${i % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                  <div className="p-4 text-gray-700 text-sm font-medium">{row.feature}</div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: GL }}>
                      <Check className="w-3 h-3" style={{ color: G }} />
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {row.manual === true
                      ? <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center"><Check className="w-3 h-3 text-green-400" /></div>
                      : <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center"><X className="w-3 h-3 text-red-400" /></div>}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {row.plugin === true
                      ? <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center"><Check className="w-3 h-3 text-green-400" /></div>
                      : row.plugin === 'partial'
                      ? <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center"><span className="text-amber-500 text-[10px] font-black">~</span></div>
                      : <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center"><X className="w-3 h-3 text-red-400" /></div>}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 border-t border-gray-100" style={{ backgroundColor: '#fafaf9' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="mb-12">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Social proof</div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900">
                Merchants who made the switch.
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-5">
              {TESTIMONIALS.map(t => (
                <motion.div key={t.name} variants={up} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <div className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 ${t.color}`}>{t.initials}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-gray-400 text-xs">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 border-t border-gray-100 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="flex flex-col lg:flex-row gap-10 items-start">

              {/* Left: header */}
              <div className="lg:w-[300px] flex-shrink-0 lg:sticky lg:top-28">
                <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Pricing</div>
                <h2 className="text-4xl font-black tracking-tighter text-gray-900 leading-tight mb-4">
                  Pay once.<br />Own it forever.
                </h2>
                <p className="text-gray-500 text-[15px] leading-relaxed mb-4">
                  No monthly fees. No per-record charges. One flat payment, migrate as many times as you need.
                </p>
                <div className="flex items-center gap-2 text-sm font-bold border px-3.5 py-2 rounded-full w-fit"
                  style={{ color: GD, borderColor: 'rgba(150,191,72,0.4)', backgroundColor: GL }}>
                  <Lock className="w-3.5 h-3.5" />
                  No subscription ever
                </div>
              </div>

              {/* Right: cards */}
              <div className="flex-1 grid md:grid-cols-3 gap-5 items-start">
                {/* Sandbox */}
                <div className="p-6 rounded-2xl border-2 border-gray-100 bg-white">
                  <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-3">Sandbox</div>
                  <div className="text-4xl font-black text-gray-300 tracking-tight mb-1">Free</div>
                  <div className="text-gray-400 text-xs mb-6">Test before you commit</div>
                  <ul className="space-y-2.5 mb-6">
                    {['10 Products', '5 Orders', '5 Customers', 'Preview the full flow'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-gray-500 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/migrate/connect?demo=true" className="block text-center w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
                    Run Free Test
                  </Link>
                </div>

                {/* Starter */}
                <div className="relative p-6 rounded-2xl flex flex-col border-2 shadow-[0_16px_48px_rgba(150,191,72,0.16)]"
                  style={{ borderColor: G, backgroundColor: '#fafff4' }}>
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-4 py-1 rounded-b-xl uppercase tracking-widest"
                    style={{ backgroundColor: G }}>
                    Most Popular
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: GD }}>Starter</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-gray-900 tracking-tight">$49</span>
                    <span className="text-gray-400 text-sm font-medium">one-time</span>
                  </div>
                  <div className="text-gray-500 text-xs mb-6">Perfect for most stores</div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {['Up to 500 Products', 'Up to 1,000 Orders', 'Unlimited Customers', 'Coupons & Blog Posts', 'SEO redirect map', 'Priority email support'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-gray-700 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G }} />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/migrate/connect" className="block text-center w-full py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 hover:scale-[1.01] transition-all"
                    style={{ backgroundColor: G }}>
                    Get Started →
                  </Link>
                </div>

                {/* Growth */}
                <div className="p-6 rounded-2xl border-2 border-gray-100 bg-white">
                  <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-3">Growth</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-gray-900 tracking-tight">$99</span>
                    <span className="text-gray-400 text-sm font-medium">one-time</span>
                  </div>
                  <div className="text-gray-400 text-xs mb-6">For larger catalogues</div>
                  <ul className="space-y-2.5 mb-6">
                    {['Up to 5,000 Products', 'Up to 10,000 Orders', 'Unlimited Customers', 'Coupons & Blog Posts', 'SEO redirect map', 'White-glove onboarding'].map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-gray-600 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/migrate/connect" className="block text-center w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all">
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div variants={up} className="mt-8 flex flex-wrap items-center gap-6 text-gray-400 text-xs font-medium md:pl-[320px]">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />No recurring fees</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />7-day money-back guarantee</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />Secure Stripe checkout</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 border-t border-gray-100" style={{ backgroundColor: '#fafaf9' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}
            className="flex flex-col lg:flex-row gap-14">
            <motion.div variants={up} className="lg:w-[300px] flex-shrink-0">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>FAQ</div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 leading-tight mb-4">
                Questions<br />answered.
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Still have questions? Email us at <a href="mailto:support@cartswitcher.com" className="underline hover:text-gray-700 transition-colors">support@cartswitcher.com</a>
              </p>
            </motion.div>
            <motion.div variants={up} className="flex-1 bg-white rounded-2xl border border-gray-100 px-6 shadow-sm">
              {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 text-white relative overflow-hidden" style={{ backgroundColor: '#0f1f07' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(150,191,72,0.18) 0%, transparent 60%)'
        }} />
        {/* top border glow */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${G}60, transparent)` }} />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}
          className="max-w-[700px] mx-auto px-6 text-center relative z-10">
          <motion.div variants={up} className="flex items-center justify-center gap-2 text-xs font-bold border border-white/15 bg-white/8 text-white/60 px-4 py-2 rounded-full mb-8 w-fit mx-auto backdrop-blur-sm">
            <Clock className="w-3.5 h-3.5" />
            Average migration: under 1 hour
          </motion.div>
          <motion.h2 variants={up} className="text-5xl md:text-[64px] font-black tracking-tighter text-white mb-5 leading-[0.95]">
            Your Shopify store
            <br />
            <span style={{ color: G }}>starts tonight.</span>
          </motion.h2>
          <motion.p variants={up} className="text-white/45 text-lg mb-10 font-medium leading-relaxed">
            Run a free sandbox test — see exactly what migrates and how. No credit card, no commitment. Pay only when you're ready.
          </motion.p>
          <motion.div variants={up} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/migrate/connect" className="group flex items-center justify-center gap-2.5 text-white px-8 py-4 rounded-full font-bold text-base transition-all hover:opacity-90 hover:shadow-[0_8px_32px_rgba(150,191,72,0.4)] hover:scale-[1.02]" style={{ backgroundColor: G }}>
              Start Free Migration
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/migrate/connect?demo=true" className="flex items-center justify-center gap-2 border border-white/15 text-white/60 hover:text-white hover:border-white/30 px-8 py-4 rounded-full font-semibold text-base transition-all">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Free sandbox test
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-8 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-black text-lg tracking-tight">
            Cart<span style={{ color: G }}>Switcher</span>
          </span>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} CartSwitcher. Built for merchants moving to Shopify.
          </div>
          <div className="flex gap-5 text-sm text-gray-400">
            <Link href="#" className="hover:text-gray-700 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-gray-700 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-gray-700 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
