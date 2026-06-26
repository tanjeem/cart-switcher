'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowRight, Zap, Shield, Clock } from 'lucide-react'

const G   = '#96bf48'
const GL  = '#eef7e0'
const GD  = '#4a7a10'

// ── Demo data ──────────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'products',  label: 'Products',   icon: '📦', total: 2847,  color: '#6366f1', speed: 180 },
  { key: 'customers', label: 'Customers',  icon: '👥', total: 14203, color: '#8b5cf6', speed: 95  },
  { key: 'orders',    label: 'Orders',     icon: '🧾', total: 9541,  color: '#06b6d4', speed: 120 },
  { key: 'coupons',   label: 'Coupons',    icon: '🏷️', total: 312,   color: '#f59e0b', speed: 400 },
  { key: 'posts',     label: 'Blog Posts', icon: '📝', total: 89,    color: '#ec4899', speed: 300 },
]

const TOTAL_ALL = STEPS.reduce((s, r) => s + r.total, 0)

// Fake live log messages that scroll in during migration
const LOG_LINES = [
  { step: 0, pct: 5,  msg: 'Connected to WooCommerce REST API' },
  { step: 0, pct: 15, msg: 'Reading product catalog...' },
  { step: 0, pct: 40, msg: 'Migrating product variants and images' },
  { step: 0, pct: 70, msg: 'Syncing inventory levels' },
  { step: 0, pct: 95, msg: 'Products complete ✓' },
  { step: 1, pct: 5,  msg: 'Starting customer import' },
  { step: 1, pct: 20, msg: 'Importing customer addresses' },
  { step: 1, pct: 50, msg: 'Linking order history to customers' },
  { step: 1, pct: 80, msg: 'Tagging migrated customers' },
  { step: 1, pct: 95, msg: 'Customers complete ✓' },
  { step: 2, pct: 5,  msg: 'Starting order import' },
  { step: 2, pct: 25, msg: 'Importing line items and payments' },
  { step: 2, pct: 55, msg: 'Mapping shipping methods' },
  { step: 2, pct: 80, msg: 'Linking orders to migrated customers' },
  { step: 2, pct: 95, msg: 'Orders complete ✓' },
  { step: 3, pct: 50, msg: 'Importing discount codes' },
  { step: 3, pct: 95, msg: 'Coupons complete ✓' },
  { step: 4, pct: 50, msg: 'Importing blog articles and images' },
  { step: 4, pct: 95, msg: 'Blog posts complete ✓' },
]

type Phase = 'intro' | 'running' | 'done'

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DemoPreviewPage() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentStep, setCurrentStep] = useState(0)
  const [progresses, setProgresses] = useState(STEPS.map(() => 0))
  const [doneMask, setDoneMask] = useState<boolean[]>(STEPS.map(() => false))
  const [logs, setLogs] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const logEndRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(0)
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Elapsed timer
  useEffect(() => {
    if (phase !== 'running') return
    startTimeRef.current = Date.now()
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function reset() {
    if (animRef.current) clearTimeout(animRef.current)
    setPhase('intro')
    setCurrentStep(0)
    setProgresses(STEPS.map(() => 0))
    setDoneMask(STEPS.map(() => false))
    setLogs([])
    setElapsed(0)
  }

  function start() {
    reset()
    // Small delay so reset visuals clear first
    setTimeout(() => {
      setPhase('running')
      runStep(0, STEPS.map(() => 0), STEPS.map(() => false), [])
    }, 80)
  }

  function runStep(
    idx: number,
    progs: number[],
    done: boolean[],
    currentLogs: string[],
  ) {
    if (idx >= STEPS.length) {
      setPhase('done')
      return
    }

    const step = STEPS[idx]
    setCurrentStep(idx)
    let p = 0

    const tick = () => {
      // Inject log lines at appropriate percentages
      const newLog = LOG_LINES.find(l => l.step === idx && Math.abs(l.pct - p) < 6 && !currentLogs.includes(l.msg))
      if (newLog) {
        currentLogs = [...currentLogs, newLog.msg]
        setLogs([...currentLogs])
      }

      const increment = (Math.random() * 3 + 1.5) * (step.speed / 100)
      p = Math.min(100, p + increment)

      const newProgs = [...progs]
      newProgs[idx] = Math.round(p)
      progs = newProgs
      setProgresses([...newProgs])

      if (p >= 100) {
        const newDone = [...done]
        newDone[idx] = true
        done = newDone
        setDoneMask([...newDone])
        animRef.current = setTimeout(() => runStep(idx + 1, progs, done, currentLogs), 320)
        return
      }

      animRef.current = setTimeout(tick, 60)
    }

    tick()
  }

  const doneAll   = progresses.reduce((s, p, i) => s + Math.round((p / 100) * STEPS[i].total), 0)
  const overallPct = Math.round((doneAll / TOTAL_ALL) * 100)

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <a href="/" className="font-black text-xl tracking-tight">
          Cart<span style={{ color: G }}>Switcher</span>
        </a>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
            Demo preview
          </span>
          <a href="/migrate/connect?demo=true"
            className="flex items-center gap-1.5 text-sm font-bold text-white px-4 py-2 rounded-full transition-all hover:opacity-90"
            style={{ backgroundColor: G }}>
            Start real migration <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1200px] w-full mx-auto px-6 py-10 gap-8">

        {/* ── Left: main progress panel ── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Header */}
          <div>
            <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: G }}>
              {phase === 'done' ? 'Migration complete' : phase === 'running' ? 'Migration in progress' : 'Migration preview'}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              {phase === 'done' ? 'All done. Your store is on Shopify.' : 'WooCommerce → Shopify'}
            </h1>
            {phase === 'running' && (
              <p className="text-sm text-gray-400 mt-1">Keep this tab open — your store is being migrated</p>
            )}
          </div>

          {/* Status row */}
          <div className="flex items-center gap-3 flex-wrap">
            {phase === 'intro' && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">Ready to start</span>
            )}
            {phase === 'running' && (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                  </span>
                  Running
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTime(elapsed)} elapsed
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: GL, color: GD }}>
                  {overallPct}% complete
                </span>
              </>
            )}
            {phase === 'done' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </span>
            )}
          </div>

          {/* Overall progress bar */}
          {phase !== 'intro' && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Overall progress</span>
                <span className="font-bold text-gray-700">{doneAll.toLocaleString()} / {TOTAL_ALL.toLocaleString()} records</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: G }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Per-entity rows */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            {phase === 'intro' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: GL }}>
                  <Zap className="w-6 h-6" style={{ color: G }} />
                </div>
                <div className="text-center">
                  <div className="font-black text-gray-900 text-base mb-1">See how migration works</div>
                  <p className="text-sm text-gray-400 max-w-xs">Watch a live simulation of all your data moving from WooCommerce to Shopify — products, customers, orders, and more.</p>
                </div>
                <button
                  onClick={start}
                  className="flex items-center gap-2 text-white font-bold px-6 py-3 rounded-full transition-all hover:opacity-90 hover:scale-[1.02] text-sm"
                  style={{ backgroundColor: G }}
                >
                  Run demo migration <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {phase !== 'intro' && STEPS.map((step, i) => {
              const p = progresses[i]
              const isDone = doneMask[i]
              const isActive = currentStep === i && phase === 'running'
              const isWaiting = i > currentStep && phase === 'running'
              const count = Math.round((p / 100) * step.total)

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: isWaiting ? 0.4 : 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                        style={{ backgroundColor: isDone ? GL : isActive ? `${step.color}15` : '#f9fafb' }}>
                        {step.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{step.label}</div>
                        {isActive && (
                          <div className="text-[10px] font-bold animate-pulse" style={{ color: step.color }}>
                            migrating...
                          </div>
                        )}
                        {isDone && (
                          <div className="text-[10px] font-bold" style={{ color: GD }}>complete</div>
                        )}
                        {isWaiting && (
                          <div className="text-[10px] text-gray-300">waiting</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-gray-700">
                        {isDone
                          ? step.total.toLocaleString()
                          : isActive || p > 0
                            ? count.toLocaleString()
                            : <span className="text-gray-300">—</span>
                        }
                        <span className="text-xs font-normal text-gray-400 ml-1">/ {step.total.toLocaleString()}</span>
                      </span>
                      {isDone && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: G }} />}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: isDone ? G : step.color }}
                      animate={{ width: `${p}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Done state */}
          <AnimatePresence>
            {phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6 border-2 text-center"
                style={{ borderColor: `${G}50`, backgroundColor: GL }}
              >
                <div className="text-3xl mb-2">🎉</div>
                <div className="text-xl font-black text-gray-900 mb-1">{TOTAL_ALL.toLocaleString()} records migrated</div>
                <div className="text-sm font-semibold mb-4" style={{ color: GD }}>
                  Completed in {formatTime(elapsed)} · Zero data loss
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <a href="/migrate/connect?demo=true"
                    className="flex items-center gap-2 text-white font-bold px-6 py-3 rounded-full text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
                    style={{ backgroundColor: G }}>
                    Migrate my real store <ArrowRight className="w-4 h-4" />
                  </a>
                  <button onClick={start}
                    className="flex items-center gap-2 font-bold px-6 py-3 rounded-full text-sm border-2 border-gray-200 hover:border-gray-400 text-gray-600 transition-all">
                    Replay demo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Restart while running */}
          {phase === 'running' && (
            <div className="flex justify-center">
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Reset demo
              </button>
            </div>
          )}
        </div>

        {/* ── Right: live log + stats ── */}
        <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-5">

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest mb-4 text-gray-400">What gets migrated</div>
            <div className="space-y-3">
              {STEPS.map((step, i) => {
                const isDone = doneMask[i]
                const isActive = currentStep === i && phase === 'running'
                const count = Math.round((progresses[i] / 100) * step.total)
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: isDone ? GL : '#f9fafb' }}>
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">{step.label}</span>
                        <span className="text-sm font-bold tabular-nums text-gray-900">
                          {phase === 'intro' ? step.total.toLocaleString() : isDone ? step.total.toLocaleString() : isActive ? count.toLocaleString() : phase === 'done' ? step.total.toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full"
                          style={{ backgroundColor: isDone ? G : step.color }}
                          animate={{ width: phase === 'intro' ? '0%' : `${progresses[i]}%` }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Live log */}
          <div className="bg-[#0d1117] rounded-2xl border border-gray-800 flex flex-col overflow-hidden shadow-sm flex-1" style={{ minHeight: 200 }}>
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-800">
              <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
              <div className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
              <div className="w-2 h-2 rounded-full bg-[#28c840]" />
              <span className="text-[10px] text-gray-500 font-mono ml-2">migration.log</span>
              {phase === 'running' && (
                <span className="ml-auto flex items-center gap-1">
                  <motion.div className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: G }}
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }} />
                  <span className="text-[9px] font-bold" style={{ color: G }}>LIVE</span>
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono" style={{ maxHeight: 280 }}>
              {phase === 'intro' && (
                <div className="text-[10px] text-gray-600 italic">Waiting for migration to start...</div>
              )}
              {logs.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] leading-relaxed flex items-start gap-1.5"
                >
                  <span className="text-gray-600 flex-shrink-0 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <span className={line.includes('✓') ? 'font-bold' : 'text-gray-400'}
                    style={line.includes('✓') ? { color: G } : {}}>
                    {line}
                  </span>
                </motion.div>
              ))}
              {phase === 'done' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[10px] font-bold mt-1" style={{ color: G }}>
                  ✓ Migration complete — all records verified
                </motion.div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Trust panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
            {[
              { icon: <Shield className="w-4 h-4" style={{ color: G }} />, title: 'Store stays live', body: 'Your WooCommerce store keeps running throughout. Zero downtime.' },
              { icon: <CheckCircle2 className="w-4 h-4" style={{ color: G }} />, title: 'Integrity check', body: 'Every record is verified after import. Nothing gets skipped.' },
              { icon: <Zap className="w-4 h-4" style={{ color: G }} />, title: 'One-click retry', body: 'If anything fails, retry just the failed items — not the whole job.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GL }}>
                  {item.icon}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-gray-800">{item.title}</div>
                  <div className="text-[11px] text-gray-400 leading-relaxed">{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
