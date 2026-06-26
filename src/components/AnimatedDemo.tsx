'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Package, Users, ShoppingCart, Tag, FileText, CheckCircle2, ArrowRight, Zap } from 'lucide-react'

const G = '#96bf48'

const STEPS = [
  { icon: Package,      label: 'Products',   count: '2,847',  accent: '#818cf8', glow: '#818cf820' },
  { icon: Users,        label: 'Customers',  count: '14,203', accent: '#a78bfa', glow: '#a78bfa20' },
  { icon: ShoppingCart, label: 'Orders',     count: '9,541',  accent: '#22d3ee', glow: '#22d3ee20' },
  { icon: Tag,          label: 'Coupons',    count: '312',    accent: '#fbbf24', glow: '#fbbf2420' },
  { icon: FileText,     label: 'Blog Posts', count: '89',     accent: '#f472b6', glow: '#f472b620' },
]

function GlowBar({ progress, accent, done }: { progress: number; accent: string; done: boolean }) {
  const color = done ? G : accent
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        className="h-full rounded-full relative"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}90` }}
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      />
    </div>
  )
}

export function AnimatedDemo({ dark: _dark = false }: Readonly<{ dark?: boolean }>) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [current, setCurrent] = useState(0)
  const [progresses, setProgresses] = useState(STEPS.map(() => 0))
  const [done, setDone] = useState<number[]>([])
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setPhase('running'), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'running') return
    let frame: ReturnType<typeof setTimeout>

    const runStep = (idx: number) => {
      if (idx >= STEPS.length) { setPhase('done'); return }
      setCurrent(idx)
      let p = 0
      const tick = () => {
        p += Math.random() * 14 + 4
        if (p >= 100) {
          p = 100
          setProgresses(prev => { const n = [...prev]; n[idx] = 100; return n })
          setDone(prev => [...prev, idx])
          frame = setTimeout(() => runStep(idx + 1), 350)
          return
        }
        setProgresses(prev => { const n = [...prev]; n[idx] = Math.round(p); return n })
        frame = setTimeout(tick, 70)
      }
      tick()
    }

    runStep(0)
    return () => clearTimeout(frame)
  }, [phase])

  const restart = () => {
    setPhase('idle'); setCurrent(0); setElapsed(0)
    setProgresses(STEPS.map(() => 0)); setDone([])
    setTimeout(() => setPhase('running'), 400)
  }

  const totalRecords = STEPS.reduce((a, s) => a + parseInt(s.count.replace(/,/g, '')), 0)
  const migratedSoFar = STEPS.reduce((a, s, i) => {
    const n = parseInt(s.count.replace(/,/g, ''))
    return a + Math.round(n * (progresses[i] / 100))
  }, 0)

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="w-full rounded-2xl overflow-hidden select-none"
      style={{
        background: 'linear-gradient(145deg, #111c08 0%, #0d1606 60%, #091003 100%)',
        border: '1px solid rgba(150,191,72,0.18)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(150,191,72,0.06)',
      }}>

      {/* ── Window chrome ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 mx-3">
          <div className="flex items-center gap-1.5 rounded-md px-3 py-1 max-w-[220px] mx-auto justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: G, boxShadow: `0 0 6px ${G}` }} />
            <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              app.cartswitcher.com/migrate
            </span>
          </div>
        </div>
        {/* Live elapsed timer */}
        <div className="text-[10px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {fmtTime(elapsed)}
        </div>
      </div>

      <div className="p-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(150,191,72,0.12)', border: '1px solid rgba(150,191,72,0.2)' }}>
              <Zap className="w-4 h-4" style={{ color: G }} />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Migration in Progress</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                WooCommerce <span style={{ color: 'rgba(255,255,255,0.15)' }}>→</span> Shopify
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'done' ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(150,191,72,0.15)', color: G, border: '1px solid rgba(150,191,72,0.3)' }}>
                <CheckCircle2 className="w-3 h-3" />
                Complete
              </motion.div>
            ) : (
              <motion.div key="live"
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <motion.span className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: G, boxShadow: `0 0 6px ${G}` }}
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                Live
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Progress ring + counter ── */}
        <div className="flex items-center gap-3 mb-4 px-3 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Mini ring */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3" stroke="rgba(255,255,255,0.06)" />
              <motion.circle cx="18" cy="18" r="14" fill="none" strokeWidth="3"
                stroke={G} strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 14}`}
                animate={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - migratedSoFar / totalRecords) }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 4px ${G}80)` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color: G }}>
              {Math.round((migratedSoFar / totalRecords) * 100)}%
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums text-white leading-none">
                {migratedSoFar.toLocaleString()}
              </span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                / {totalRecords.toLocaleString()} records
              </span>
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {phase === 'done' ? 'Migration complete — no errors' : 'Migrating via encrypted API…'}
            </div>
          </div>
        </div>

        {/* ── Steps ── */}
        <div className="space-y-1.5">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = current === i && phase === 'running'
            const isDone = done.includes(i)
            const isWaiting = !isActive && !isDone && phase === 'running'
            const p = progresses[i]

            return (
              <motion.div key={step.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: isWaiting ? 0.35 : 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                style={{
                  backgroundColor: isActive ? step.glow : isDone ? 'rgba(150,191,72,0.05)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? `${step.accent}30` : isDone ? 'rgba(150,191,72,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  boxShadow: isActive ? `0 0 20px ${step.accent}15` : 'none',
                }}>

                {/* Icon */}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isDone ? 'rgba(150,191,72,0.15)' : `${step.accent}18`,
                    boxShadow: isActive ? `0 0 12px ${step.accent}40` : 'none',
                  }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: isDone ? G : step.accent }} />
                </div>

                {/* Label + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)' }}>
                      {step.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.18)' }}>
                        {step.count}
                      </span>
                      {isDone && (
                        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: G, filter: `drop-shadow(0 0 4px ${G}80)` }} />
                        </motion.div>
                      )}
                      {isActive && (
                        <motion.span className="text-[10px] font-bold tabular-nums"
                          style={{ color: step.accent }}
                          animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          {p}%
                        </motion.span>
                      )}
                    </div>
                  </div>
                  <GlowBar progress={p} accent={step.accent} done={isDone} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ── Done / footer ── */}
        <div style={{ minHeight: '52px' }}>
          <AnimatePresence>
            {phase === 'done' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-3 flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: 'rgba(150,191,72,0.08)', border: '1px solid rgba(150,191,72,0.2)' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: G, filter: `drop-shadow(0 0 6px ${G})` }} />
                  <div>
                    <div className="text-xs font-bold text-white">{totalRecords.toLocaleString()} records migrated</div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>0 errors · {fmtTime(elapsed)} total</div>
                  </div>
                </div>
                <button onClick={restart}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <ArrowRight className="w-3 h-3" /> Replay
                </button>
              </motion.div>
            ) : (
              <motion.div className="mt-3 flex items-center gap-2 px-1" style={{ minHeight: '52px' }}
                animate={{ opacity: phase === 'running' ? 1 : 0 }}>
                <motion.div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }}
                  animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Your WooCommerce store stays live throughout
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
