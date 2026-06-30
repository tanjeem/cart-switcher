'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedDemo } from '@/components/AnimatedDemo'
import { InteractiveWalkthrough } from '@/components/InteractiveWalkthrough'
import { MigrationCalculator } from '@/components/MigrationCalculator'
import { useEffect, useState } from 'react'
import {
  Package, Users, ShoppingCart, Tag, FileText, Search,
  ArrowRight, CheckCircle2, X, Check, Star, Clock,
  ChevronDown, Zap, Shield, RefreshCw, TrendingUp,
  MoveRight, Plug, ListChecks, Rocket,
} from 'lucide-react'

const G  = '#96bf48'
const GD = '#4a7a10'
const GL = '#eef7e0'

const up: any = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const sg: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const TESTIMONIALS = [
  {
    name: 'Sarah Chen', role: 'Owner', company: 'Bloom & Botanics', initials: 'SC',
    text: "I put off migrating for two years because I was scared of breaking everything. CartSwitcher moved 3,400 products and 8 years of orders in under an hour. Not a single thing was wrong.",
    stars: 5, products: '3,400 products', time: '52 min', avatarBg: '#ede9fe', avatarColor: '#7c3aed',
  },
  {
    name: 'Marcus Webb', role: 'CTO', company: 'TechParts Direct', initials: 'MW',
    text: "Tried manual CSV export first — two days, still broken. CartSwitcher did it in 40 minutes. The automatic SEO redirect map alone saved us thousands in lost traffic.",
    stars: 5, products: '8,200 products', time: '41 min', avatarBg: GL, avatarColor: GD,
  },
  {
    name: 'Priya Nair', role: 'Shopify Developer', company: 'Freelance', initials: 'PN',
    text: "I've done dozens of WooCommerce migrations for clients. CartSwitcher is the only tool I trust. API-direct means zero data corruption, every time.",
    stars: 5, products: '12+ migrations', time: 'avg 55 min', avatarBg: '#fce7f3', avatarColor: '#be185d',
  },
]

const MIGRATE_ITEMS = [
  { icon: Package,      label: 'Products',   desc: 'Titles, descriptions, variants, SKUs, pricing, inventory, images.', color: '#818cf8' },
  { icon: Users,        label: 'Customers',  desc: 'Contact info, billing & shipping addresses, order history.',        color: '#a78bfa' },
  { icon: ShoppingCart, label: 'Orders',     desc: 'Line items, shipping, payment status, notes, dates.',               color: '#22d3ee' },
  { icon: Tag,          label: 'Coupons',    desc: 'Discount codes, types, usage limits, expiry dates.',                color: '#fbbf24' },
  { icon: FileText,     label: 'Blog Posts', desc: 'Rich text, images, authors, slugs, publish dates.',                 color: '#f472b6' },
  { icon: Search,       label: 'SEO Data',   desc: 'Meta titles, descriptions, URL handles, 301 redirect map.',         color: G         },
]

const COMPARISON = [
  { feature: 'Zero store downtime',         cs: true,  c2c: 'partial', lit: true  },
  { feature: 'Live progress tracking',      cs: true,  c2c: false,     lit: false },
  { feature: 'Auto 301 redirect map',       cs: true,  c2c: 'paid',    lit: true  },
  { feature: 'Per-entity retry on failure', cs: true,  c2c: false,     lit: false },
  { feature: 'Encrypted API transfer',      cs: true,  c2c: true,      lit: true  },
  { feature: 'Orders, coupons & blogs',     cs: true,  c2c: true,      lit: true  },
  { feature: 'Free sandbox test',           cs: true,  c2c: 'partial', lit: 'partial' },
  { feature: 'Done in under 1 hour',        cs: true,  c2c: 'partial', lit: 'partial' },
  { feature: 'Transparent data mapping',    cs: true,  c2c: false,     lit: false },
  { feature: 'Money-back guarantee',        cs: true,  c2c: false,     lit: false },
]

const FAQ = [
  { q: 'Will my WooCommerce store go down during migration?', a: 'Never. We read from your store via API while it stays fully live. Your customers keep shopping throughout the entire process.' },
  { q: 'What happens to my SEO rankings?', a: "We auto-generate a 301 redirect map for every product, category, and blog URL so Google seamlessly transfers your ranking authority to your new Shopify URLs. This feature costs $59 extra on Cart2Cart — it's included free on every CartSwitcher plan." },
  { q: 'Is my customer data safe?', a: 'We connect via official APIs with encrypted HTTPS. We never store your data permanently — it flows directly from WooCommerce to Shopify and nowhere else. GDPR compliant.' },
  { q: 'How long does it actually take?', a: 'Most stores finish in under an hour. A store with 5,000 products and 10,000 orders typically completes in 45–90 minutes depending on your store\'s complexity.' },
  { q: 'Can I run a test before paying?', a: 'Yes — the free sandbox migrates 25 products, 10 orders, and 10 customers so you can see exactly how your real data looks in Shopify before committing.' },
  { q: 'What if something goes wrong?', a: '7-day full refund, no questions asked. If any entity type fails mid-migration, you can retry just that type — you never restart from scratch.' },
  { q: 'How does CartSwitcher compare to Cart2Cart?', a: "Cart2Cart charges $150–$350 for the same store size and their Shopify App Store rating is 2.3/5. We're faster, cheaper, fully transparent with live progress tracking, and backed by a money-back guarantee." },
]

const ACTIVITY = [
  'Someone in London just migrated 4,200 products',
  'A store in Sydney moved 11,000 orders — 38 min',
  'New migration started in New York',
  'Someone in Toronto migrated 890 products — 12 min',
  'A store in Berlin moved 6,500 customers',
  'New migration started in Melbourne',
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

function ActivityTicker() {
  const [idx, setIdx]         = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % ACTIVITY.length); setVisible(true) }, 400)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="inline-flex items-center gap-2.5 bg-white border border-gray-100 rounded-full px-4 py-2 shadow-sm text-xs text-gray-500 font-medium">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="relative overflow-hidden" style={{ width: '240px', height: '1.2em' }}>
        <AnimatePresence mode="wait">
          {visible && (
            <motion.span key={idx} className="absolute inset-0 whitespace-nowrap"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}>
              {ACTIVITY[idx]}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  )
}

function DemoPanel() {
  return (
    <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="w-full self-end">
      <div className="relative">
        <div className="absolute -inset-6 rounded-3xl blur-3xl opacity-25 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 60% 50%, ${G}, transparent 70%)` }} />
        <div className="relative drop-shadow-2xl">
          <AnimatedDemo dark={true} />
        </div>
      </div>
    </motion.div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-3.5 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <span className="font-black text-xl tracking-tight">
          Cart<span style={{ color: G }}>Switcher</span>
        </span>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-400">
          <a href="#demo"         className="hover:text-gray-900 transition-colors">Demo</a>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#pricing"      className="hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#faq"          className="hover:text-gray-900 transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors hidden sm:block">Sign in</Link>
          <Link href="/migrate/connect?demo=true"
            className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2.5 rounded-full transition-all hover:opacity-90 hover:scale-[1.02] shadow-[0_2px_12px_rgba(150,191,72,0.4)]"
            style={{ backgroundColor: G }}>
            Try Free <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-16 overflow-hidden relative bg-white">
        {/* Dot-grid background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          }} />
        {/* Top line */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${G}80 50%, transparent 100%)` }} />

        <div className="max-w-[1280px] mx-auto px-6 pt-14 pb-0 grid lg:grid-cols-2 gap-10 lg:gap-6 items-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={sg} className="min-w-0">

            <motion.div variants={up} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold mb-6 tracking-wide"
              style={{ borderColor: 'rgba(150,191,72,0.4)', backgroundColor: GL, color: GD }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: G }} />
              WooCommerce is holding you back. Shopify won't.
            </motion.div>

            <motion.h1 variants={up} className="font-black tracking-tighter leading-[0.9] text-gray-900 mb-5"
              style={{ fontSize: 'clamp(48px, 5.5vw, 76px)' }}>
              Stop losing sales<br />
              on slow WooCommerce.<br />
              <span className="relative inline-block" style={{ color: G }}>
                Move tonight.
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 8" fill="none">
                  <path d="M2 6 Q150 1 298 6" stroke="#96bf48" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>
            </motion.h1>

            <motion.p variants={up} className="text-[17px] text-gray-500 leading-relaxed mb-3 max-w-[480px]">
              Every product, customer, order, coupon and blog post — migrated automatically in under an hour. Your WooCommerce store stays live the whole time.
            </motion.p>

            <motion.div variants={up} className="mb-7"><ActivityTicker /></motion.div>

            <motion.div variants={up} className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link href="/migrate/connect?demo=true"
                className="group flex items-center justify-center gap-2.5 text-white px-7 py-3.5 rounded-full font-bold text-[15px] transition-all hover:opacity-90 hover:shadow-[0_8px_28px_rgba(150,191,72,0.45)] hover:scale-[1.02]"
                style={{ backgroundColor: G }}>
                Migrate My Store Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="#pricing"
                className="flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 px-7 py-3.5 rounded-full font-semibold text-[15px] transition-all">
                See pricing
              </Link>
            </motion.div>

            <motion.div variants={up} className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400 font-medium">
              {['No credit card to test', '25 products free', '7-day money-back', 'Store stays live'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: G }} />{t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <DemoPanel />
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-10 border-t border-gray-100 mt-6 bg-[#fafaf9]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '35,000+', label: 'Stores migrate yearly',  sub: 'WooCommerce → Shopify',       icon: <TrendingUp className="w-4 h-4" />, color: '#818cf8' },
              { value: '<1 hr',   label: 'Average migration',      sub: 'start to finish',              icon: <Clock className="w-4 h-4" />,       color: G         },
              { value: '$0',      label: 'Data lost',              sub: 'zero corruption guarantee',    icon: <Shield className="w-4 h-4" />,      color: '#22d3ee' },
              { value: '½ price', label: 'vs Cart2Cart',           sub: 'same result, half the cost',   icon: <Zap className="w-4 h-4" />,         color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-2xl font-black tracking-tighter leading-none text-gray-900">{s.value}</div>
                  <div className="text-gray-700 font-semibold text-xs mt-0.5">{s.label}</div>
                  <div className="text-gray-400 text-[10px]">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE WALKTHROUGH ── */}
      <InteractiveWalkthrough />

      {/* ── MIGRATION CALCULATOR ── */}
      <MigrationCalculator />

      {/* ── PAIN SECTION ── */}
      <section className="py-24 border-t border-gray-100 bg-white relative overflow-hidden">
        {/* subtle gradient wash */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{ background: `radial-gradient(circle at 100% 0%, ${GL} 0%, transparent 65%)` }} />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="text-center max-w-2xl mx-auto mb-14">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>The real cost of waiting</div>
              <h2 className="text-[42px] md:text-[52px] font-black tracking-tighter text-gray-900 leading-[0.95]">
                Every day on WooCommerce<br />
                <span className="text-gray-300">is a day behind.</span>
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: '🐌', title: 'Slow checkout = lost sales', accent: '#f87171',
                  body: "Shopify's checkout converts 15–36% better than WooCommerce on average. Slow load times directly kill revenue.",
                  stat: '36%', statLabel: 'better Shopify checkout CVR',
                },
                {
                  icon: '🔧', title: 'Plugins breaking constantly', accent: '#fbbf24',
                  body: 'The average WooCommerce store runs 20+ plugins. Every update is a risk. Shopify is a managed platform — it just works.',
                  stat: '20+', statLabel: 'plugins = 20 failure points',
                },
                {
                  icon: '📉', title: "You're losing to competitors", accent: '#818cf8',
                  body: '35,000 stores migrated to Shopify last year. Your competitors are on a faster platform. The gap compounds every month.',
                  stat: '35k', statLabel: 'stores migrated last year',
                },
              ].map(item => (
                <motion.div key={item.title} variants={up}
                  className="rounded-2xl p-7 border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-shadow group relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                    style={{ backgroundColor: item.accent }} />
                  <div className="text-3xl mb-5">{item.icon}</div>
                  <div className="text-2xl font-black tracking-tighter mb-0.5" style={{ color: item.accent }}>{item.stat}</div>
                  <div className="text-[11px] font-semibold text-gray-400 mb-4 uppercase tracking-wider">{item.statLabel}</div>
                  <div className="font-bold text-gray-900 text-[16px] mb-2">{item.title}</div>
                  <div className="text-gray-500 text-sm leading-relaxed">{item.body}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 border-t border-gray-100 bg-[#fafaf9] relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] pointer-events-none"
          style={{ background: `radial-gradient(circle at 0% 100%, ${GL} 0%, transparent 65%)` }} />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="max-w-xl mb-14">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>How it works</div>
              <h2 className="text-[42px] md:text-[52px] font-black tracking-tighter text-gray-900 leading-[0.95]">
                Three steps.<br />One hour. Done.
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5 relative">
              {/* Connector line desktop */}
              <div className="hidden md:block absolute top-[52px] left-[33%] right-[33%] h-px z-0"
                style={{ background: `linear-gradient(90deg, ${G}40, ${G}80, ${G}40)` }} />

              {[
                { n: '01', Icon: Plug,       title: 'Connect your stores',    body: "Enter your WooCommerce URL and API keys, connect your Shopify store. Takes 3 minutes. Nothing to install.", accent: '#818cf8' },
                { n: '02', Icon: ListChecks, title: 'Choose what to migrate', body: "Select products, customers, orders, coupons, blog posts, SEO — or just hit Select All. You're in control.", accent: G       },
                { n: '03', Icon: Rocket,     title: 'Watch it happen live',   body: 'Hit migrate and watch your data move in real time. Progress bars, live logs, ETA. Store stays live throughout.', accent: '#22d3ee' },
              ].map((item, i) => (
                <motion.div key={item.n} variants={up}
                  className="relative bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow overflow-hidden z-10">
                  {/* top accent */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: item.accent }} />
                  {/* big ghost number */}
                  <div className="absolute -bottom-4 -right-1 text-[100px] font-black leading-none select-none pointer-events-none"
                    style={{ color: `${item.accent}0e` }}>{item.n}</div>

                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-sm"
                      style={{ backgroundColor: `${item.accent}15` }}>
                      <item.Icon className="w-5 h-5" style={{ color: item.accent }} />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: item.accent }}>{item.n}</span>
                      <span className="font-black text-gray-900 text-lg tracking-tight">{item.title}</span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden md:flex absolute -right-3.5 top-12 z-20 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center">
                      <MoveRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div variants={up} className="mt-8 text-center">
              <Link href="/migrate/connect?demo=true"
                className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-full hover:opacity-90 hover:scale-[1.02] transition-all text-sm shadow-[0_4px_20px_rgba(150,191,72,0.35)]"
                style={{ backgroundColor: G }}>
                Try it free — no card needed <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── WHAT MIGRATES ── */}
      <section className="py-24 border-t border-gray-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}
            className="flex flex-col lg:flex-row gap-16 items-start">
            <motion.div variants={up} className="lg:sticky lg:top-28 flex-shrink-0 lg:w-[320px]">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Complete transfer</div>
              <h2 className="text-[42px] font-black tracking-tighter text-gray-900 leading-[0.95] mb-5">
                Every piece<br />of your store,<br />
                <span style={{ color: G }}>moved.</span>
              </h2>
              <p className="text-gray-500 text-[15px] leading-relaxed mb-7">
                Not just products. Every customer, order, coupon, and blog post — with full SEO preservation.
              </p>
              <Link href="/migrate/connect?demo=true"
                className="inline-flex items-center gap-2 text-white text-sm font-bold px-5 py-3 rounded-full hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(150,191,72,0.3)]"
                style={{ backgroundColor: G }}>
                See it migrate live <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
            <div className="flex-1 grid sm:grid-cols-2 gap-3">
              {MIGRATE_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <motion.div key={item.label} variants={up}
                    className="flex items-start gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white group relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-0.5 rounded-l-xl" style={{ backgroundColor: item.color }} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${item.color}12`, color: item.color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="pt-0.5">
                      <div className="font-bold text-gray-900 text-[15px] mb-1">{item.label}</div>
                      <div className="text-gray-500 text-xs leading-relaxed">{item.desc}</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 border-t border-gray-100 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #fafaf9 0%, white 100%)' }}>
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }} />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Real merchants</div>
                <h2 className="text-[42px] font-black tracking-tighter text-gray-900 leading-tight">
                  Merchants who<br />made the switch.
                </h2>
              </div>
              <div className="flex items-center gap-2 pb-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                <span className="ml-2 text-sm font-semibold text-gray-500">5.0 · 47 reviews</span>
              </div>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5 items-start">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={t.name} variants={up}
                  className={`rounded-2xl p-7 flex flex-col gap-5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${
                    i === 1 ? 'shadow-[0_16px_48px_rgba(150,191,72,0.2)]' : 'bg-white border border-gray-100 shadow-sm hover:shadow-lg'
                  }`}
                  style={i === 1 ? { borderColor: `${G}50`, backgroundColor: '#f7fdf0', border: `2px solid ${G}50` } : {}}>
                  {/* quote mark */}
                  <div className="absolute top-5 right-6 text-[80px] font-black leading-none select-none pointer-events-none"
                    style={{ color: i === 1 ? `${G}15` : '#f3f4f640', fontFamily: 'Georgia, serif' }}>"</div>

                  <div className="flex gap-0.5 relative z-10">
                    {Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-gray-700 text-[15px] leading-relaxed flex-1 relative z-10">&ldquo;{t.text}&rdquo;</p>

                  {/* Stats pills */}
                  <div className="flex gap-2 relative z-10">
                    <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: i === 1 ? '#e8f5d0' : '#f3f4f6' }}>
                      <div className="text-xs font-black" style={{ color: i === 1 ? GD : '#374151' }}>{t.products}</div>
                      <div className="text-[10px] text-gray-400">migrated</div>
                    </div>
                    <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: i === 1 ? '#e8f5d0' : '#f3f4f6' }}>
                      <div className="text-xs font-black" style={{ color: i === 1 ? GD : '#374151' }}>{t.time}</div>
                      <div className="text-[10px] text-gray-400">duration</div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 pt-4 border-t relative z-10 ${i === 1 ? 'border-green-100' : 'border-gray-100'}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ring-2 ring-white shadow-sm"
                      style={{ backgroundColor: t.avatarBg, color: t.avatarColor }}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{t.role} · {t.company}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── ALTERNATIVES ── */}
      <section className="py-24 border-t border-gray-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="max-w-2xl mb-14">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Why not the alternatives?</div>
              <h2 className="text-[42px] md:text-[52px] font-black tracking-tighter text-gray-900 leading-[0.95]">
                Other ways<br />
                <span className="text-gray-300">will cost you more.</span>
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                { title: 'DIY plugins',       cost: '~$200/yr + your time', icon: '🔧',
                  points: ['Crashes halfway through', 'Corrupts product metadata', 'Breaks variant images', 'Still needs manual cleanup'] },
                { title: 'Manual CSV export', cost: '3–5 days of work',     icon: '📊',
                  points: ['No order history', 'Images must be re-uploaded', 'SEO rankings tank', 'Customer addresses lost'] },
                { title: 'Hire a developer',  cost: '$2,000–$10,000',       icon: '👨‍💻',
                  points: ['2–4 week timeline', 'Misses coupon codes', 'No data guarantee', 'Costs balloon fast'] },
              ].map(alt => (
                <motion.div key={alt.title} variants={up} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{alt.icon}</span>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{alt.title}</div>
                        <div className="text-red-500 text-xs font-semibold">{alt.cost}</div>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </div>
                  </div>
                  <ul className="px-5 py-4 space-y-2.5">
                    {alt.points.map(p => (
                      <li key={p} className="flex items-start gap-2.5 text-xs text-gray-500">
                        <X className="w-3 h-3 text-red-300 flex-shrink-0 mt-0.5" />{p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
            <motion.div variants={up}
              className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between border-2"
              style={{ backgroundColor: GL, borderColor: `${G}50` }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: G }}>✓</div>
                <div>
                  <div className="font-black text-gray-900 text-lg tracking-tight">CartSwitcher — from $79, one time.</div>
                  <div className="text-gray-600 text-sm">Half the price of Cart2Cart. Full refund if anything fails. Done in under an hour.</div>
                </div>
              </div>
              <Link href="/dashboard"
                className="flex-shrink-0 flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-all shadow-md"
                style={{ backgroundColor: G }}>
                Migrate My Store <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-24 border-t border-gray-100 bg-[#fafaf9]">
        <div className="max-w-[900px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="text-center mb-12">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Side by side</div>
              <h2 className="text-[42px] font-black tracking-tighter text-gray-900">We built what they didn't.</h2>
              <p className="text-gray-400 text-sm mt-3">Cart2Cart has a 2.3★ Shopify App Store rating. LitExtension support runs on Asia-Pacific hours.<br />We fixed both.</p>
            </motion.div>
            <motion.div variants={up} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-4 border-b border-gray-200" style={{ background: '#f7fdf0' }}>
                <div className="p-4 text-gray-400 text-xs font-bold uppercase tracking-wider">Feature</div>
                <div className="p-4 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-sm" style={{ backgroundColor: G }}>
                    CartSwitcher
                  </span>
                </div>
                <div className="p-4 text-center text-gray-500 text-xs font-bold">Cart2Cart<br /><span className="text-amber-500 font-semibold">2.3★</span></div>
                <div className="p-4 text-center text-gray-500 text-xs font-bold">LitExtension</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-4 border-b border-gray-100 last:border-0 ${i % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                  <div className="p-4 text-gray-700 text-sm font-medium">{row.feature}</div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: GL }}>
                      <Check className="w-3 h-3" style={{ color: G }} />
                    </div>
                  </div>
                  {[row.c2c, row.lit].map((val, j) => (
                    <div key={j} className="p-4 flex items-center justify-center">
                      {val === true
                        ? <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center"><Check className="w-3 h-3 text-gray-400" /></div>
                        : val === 'partial' || val === 'paid'
                        ? <div className="flex flex-col items-center gap-0.5">
                            <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center"><span className="text-amber-500 text-[10px] font-black">~</span></div>
                            {val === 'paid' && <span className="text-[9px] text-amber-600 font-bold">$59 extra</span>}
                          </div>
                        : <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center"><X className="w-3 h-3 text-red-400" /></div>}
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 border-t border-gray-100 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${GL} 0%, transparent 70%)` }} />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}>
            <motion.div variants={up} className="text-center mb-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Pricing</div>
              <h2 className="text-[42px] md:text-[52px] font-black tracking-tighter text-gray-900 leading-[0.95] mb-4">
                Pay once. Own it forever.
              </h2>
              <p className="text-gray-500 text-[15px] max-w-lg mx-auto leading-relaxed">
                No monthly fees. No per-record charges. One flat payment — and a full refund if anything fails.
              </p>
            </motion.div>

            <motion.div variants={up} className="flex items-center justify-center gap-2 mb-10">
              <div className="h-px flex-1 max-w-[120px] bg-gray-100" />
              <div className="flex items-center gap-3 text-xs text-gray-400 font-medium px-4 py-2 rounded-full bg-gray-50 border border-gray-100">
                <span>Cart2Cart charges <span className="font-bold text-gray-600">$150–$350</span> for the same job</span>
                <span className="text-gray-200">·</span>
                <span>LitExtension starts at <span className="font-bold text-gray-600">$149</span></span>
              </div>
              <div className="h-px flex-1 max-w-[120px] bg-gray-100" />
            </motion.div>

            <motion.div variants={up} className="grid md:grid-cols-4 gap-4 items-start">

              {/* Sandbox */}
              <div className="p-6 rounded-2xl border-2 border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Sandbox</div>
                <div className="text-[38px] font-black text-gray-300 tracking-tight leading-none mb-1">Free</div>
                <div className="text-gray-400 text-xs mb-5">Try with your real data first</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {['25 Products', '10 Orders', '10 Customers', 'Full flow preview', 'No credit card'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-500 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/migrate/connect?demo=true"
                  className="block text-center w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
                  Run Free Test
                </Link>
              </div>

              {/* Starter */}
              <div className="p-6 rounded-2xl border-2 border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Starter</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[38px] font-black text-gray-900 tracking-tight leading-none">$79</span>
                  <span className="text-gray-400 text-sm">one-time</span>
                </div>
                <div className="text-xs text-gray-400 mb-5">Small to medium stores</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {[
                    { text: 'Up to 2,000 Products',   color: '#818cf8' },
                    { text: 'Up to 5,000 Orders',      color: '#22d3ee' },
                    { text: 'Unlimited Customers',     color: '#a78bfa' },
                    { text: 'Coupons & Blog Posts',    color: '#fbbf24' },
                    { text: 'Auto SEO redirect map',   color: G         },
                    { text: 'Email support',            color: G         },
                    { text: '7-day money-back',         color: G         },
                  ].map(f => (
                    <li key={f.text} className="flex items-center gap-2 text-gray-600 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color }} />{f.text}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard"
                  className="block text-center w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all">
                  Migrate My Store
                </Link>
              </div>

              {/* Growth — hero */}
              <div className="relative p-6 rounded-2xl border-2 flex flex-col"
                style={{ borderColor: G, backgroundColor: '#f7fdf0', boxShadow: `0 20px 60px rgba(150,191,72,0.25), 0 0 0 1px ${G}30` }}>
                <div className="absolute -top-px left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-4 py-1 rounded-b-xl uppercase tracking-widest"
                  style={{ backgroundColor: G }}>Most Popular</div>
                {/* savings badge */}
                <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full flex items-center justify-center text-center shadow-lg"
                  style={{ backgroundColor: '#fbbf24' }}>
                  <div className="text-white text-[9px] font-black leading-tight">SAVE<br />$130</div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: GD }}>Growth</div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-[38px] font-black text-gray-900 tracking-tight leading-none">$149</span>
                  <span className="text-gray-400 text-sm">one-time</span>
                </div>
                <div className="text-[11px] text-gray-400 line-through mb-4">Cart2Cart charges $280+ for this</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {[
                    { text: 'Up to 15,000 Products',      color: '#818cf8' },
                    { text: 'Up to 50,000 Orders',         color: '#22d3ee' },
                    { text: 'Unlimited Customers',         color: '#a78bfa' },
                    { text: 'Coupons & Blog Posts',        color: '#fbbf24' },
                    { text: 'Auto SEO redirect map',       color: G         },
                    { text: 'Priority email support',      color: G         },
                    { text: 'White-glove onboarding call', color: G         },
                    { text: '7-day money-back',            color: G         },
                  ].map(f => (
                    <li key={f.text} className="flex items-center gap-2 text-gray-700 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color }} />{f.text}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard"
                  className="block text-center w-full py-3 rounded-xl text-white font-bold text-sm hover:opacity-90 hover:scale-[1.01] transition-all shadow-md"
                  style={{ backgroundColor: G }}>
                  Migrate My Store →
                </Link>
              </div>

              {/* Pro */}
              <div className="p-6 rounded-2xl border-2 border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Pro</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[38px] font-black text-gray-900 tracking-tight leading-none">$249</span>
                  <span className="text-gray-400 text-sm">one-time</span>
                </div>
                <div className="text-xs text-gray-400 mb-5">Unlimited — agencies & large stores</div>
                <ul className="space-y-2 mb-6 flex-1">
                  {[
                    { text: 'Unlimited Products',      color: '#818cf8' },
                    { text: 'Unlimited Orders',         color: '#22d3ee' },
                    { text: 'Unlimited Customers',      color: '#a78bfa' },
                    { text: 'Coupons & Blog Posts',     color: '#fbbf24' },
                    { text: 'Auto SEO redirect map',    color: G         },
                    { text: 'Priority support + SLA',   color: G         },
                    { text: 'White-glove onboarding',   color: G         },
                    { text: 'Re-migration included',    color: G         },
                    { text: '7-day money-back',         color: G         },
                  ].map(f => (
                    <li key={f.text} className="flex items-center gap-2 text-gray-600 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color }} />{f.text}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard"
                  className="block text-center w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all">
                  Migrate My Store
                </Link>
              </div>

            </motion.div>

            {/* Trust row */}
            <motion.div variants={up} className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Shield className="w-4 h-4" />,    title: 'Secure checkout',  sub: 'Encrypted payment',        color: '#818cf8' },
                { icon: <RefreshCw className="w-4 h-4" />, title: '7-day refund',     sub: 'No questions asked',       color: '#22d3ee' },
                { icon: <Zap className="w-4 h-4" />,       title: 'No recurring fees',sub: 'Pay once, done',           color: '#fbbf24' },
                { icon: <Clock className="w-4 h-4" />,     title: 'Support 24h',      sub: 'Email response guarantee', color: G         },
              ].map(t => (
                <div key={t.title} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${t.color}12`, color: t.color }}>
                    {t.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-700">{t.title}</div>
                    <div className="text-[10px] text-gray-400">{t.sub}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 border-t border-gray-100 bg-[#fafaf9]">
        <div className="max-w-[1280px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}
            className="flex flex-col lg:flex-row gap-16">
            <motion.div variants={up} className="lg:w-[320px] flex-shrink-0">
              <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>FAQ</div>
              <h2 className="text-[42px] font-black tracking-tighter text-gray-900 leading-[0.95] mb-5">
                Questions<br />answered.
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">Something else on your mind?</p>
              <a href="mailto:support@cartswitcher.com"
                className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full border-2 transition-all hover:scale-[1.02] shadow-sm"
                style={{ color: GD, borderColor: G, backgroundColor: GL }}>
                Email support →
              </a>
            </motion.div>
            <motion.div variants={up} className="flex-1 bg-white rounded-2xl border border-gray-100 px-7 shadow-sm">
              {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 text-white relative overflow-hidden" style={{ backgroundColor: '#0d1a06' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(150,191,72,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(150,191,72,0.15) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 100%, ${G}30 0%, transparent 70%)` }} />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${G}70, transparent)` }} />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={sg}
          className="max-w-[640px] mx-auto px-6 text-center relative z-10">

          <motion.div variants={up} className="inline-flex items-center gap-2 text-xs font-bold border border-white/15 bg-white/[0.07] text-white/50 px-4 py-2 rounded-full mb-10">
            <TrendingUp className="w-3.5 h-3.5" />
            ~35,000 WooCommerce stores switch to Shopify every year
          </motion.div>

          <motion.h2 variants={up} className="font-black tracking-tighter text-white leading-[0.9] mb-6"
            style={{ fontSize: 'clamp(44px, 7vw, 72px)' }}>
            Your store deserves<br />better than WooCommerce.<br />
            <span style={{ color: G }}>Move it tonight.</span>
          </motion.h2>

          <motion.p variants={up} className="text-white/50 text-lg mb-6 leading-relaxed max-w-[480px] mx-auto">
            Test free with 25 real products. No credit card. Pay only when you&apos;re ready.
          </motion.p>

          <motion.div variants={up} className="inline-flex items-center gap-2.5 border border-white/15 bg-white/[0.07] rounded-2xl px-5 py-3 mb-8">
            <span className="text-xl">↩️</span>
            <div className="text-left">
              <div className="text-white text-sm font-bold">7-day money-back guarantee</div>
              <div className="text-white/40 text-xs">If anything fails, we refund you. No questions, no forms.</div>
            </div>
          </motion.div>

          <motion.div variants={up} className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Link href="/migrate/connect?demo=true"
              className="group flex items-center justify-center gap-2.5 text-white px-8 py-4 rounded-full font-bold text-base hover:opacity-90 hover:shadow-[0_8px_32px_rgba(150,191,72,0.45)] hover:scale-[1.02] transition-all"
              style={{ backgroundColor: G }}>
              Migrate My Store Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="#pricing"
              className="flex items-center justify-center gap-2.5 border border-white/15 text-white/50 hover:text-white hover:border-white/30 px-8 py-4 rounded-full font-semibold text-base transition-all">
              See pricing
            </Link>
          </motion.div>

          <motion.div variants={up}><ActivityTicker /></motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <span className="font-black text-xl tracking-tight">Cart<span style={{ color: G }}>Switcher</span></span>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed max-w-sm">
                The fastest way to move your WooCommerce store to Shopify. Automated, API-direct, zero downtime.
              </p>
              <div className="flex gap-3 mt-5">
                {[
                  { icon: <Shield className="w-3.5 h-3.5" />, text: 'GDPR Compliant' },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: '7-day refund' },
                ].map(b => (
                  <div key={b.text} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5">
                    <span style={{ color: G }}>{b.icon}</span>{b.text}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Product</div>
              <ul className="space-y-2.5">
                {[
                  { label: 'How it works',  href: '#how-it-works' },
                  { label: 'Pricing',       href: '#pricing' },
                  { label: 'Free sandbox',  href: '/migrate/connect?demo=true' },
                  { label: 'Dashboard',     href: '/dashboard' },
                ].map(l => (
                  <li key={l.label}><Link href={l.href} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Support</div>
              <ul className="space-y-2.5">
                {[
                  { label: 'FAQ',             href: '#faq' },
                  { label: 'Email support',   href: 'mailto:support@cartswitcher.com' },
                  { label: 'Privacy policy',  href: '/privacy' },
                  { label: 'Terms of service',href: '/terms' },
                ].map(l => (
                  <li key={l.label}><a href={l.href} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-400 text-sm">© {new Date().getFullYear()} CartSwitcher. Built for merchants moving to Shopify.</div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              All systems operational
            </div>
          </div>
        </div>
      </footer>

    </main>
  )
}
