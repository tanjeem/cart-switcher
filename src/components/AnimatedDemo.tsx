'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Package, Users, ShoppingCart, Tag, FileText, CheckCircle2, ArrowRight } from 'lucide-react'

const GREEN_BG = '#96bf48'
const GREEN_LIGHT = '#f0f7e6'

const STEPS = [
  { icon: Package,      label: 'Products',   count: '2,847',  accent: '#6366f1' },
  { icon: Users,        label: 'Customers',  count: '14,203', accent: '#8b5cf6' },
  { icon: ShoppingCart, label: 'Orders',     count: '9,541',  accent: '#06b6d4' },
  { icon: Tag,          label: 'Coupons',    count: '312',    accent: '#f59e0b' },
  { icon: FileText,     label: 'Blog Posts', count: '89',     accent: '#ec4899' },
]

function Bar({ progress, accent, done }: { progress: number; accent: string; done: boolean }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: done ? GREEN_BG : accent }}
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
    </div>
  )
}

export function AnimatedDemo() {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [current, setCurrent] = useState(0)
  const [progresses, setProgresses] = useState(STEPS.map(() => 0))
  const [done, setDone] = useState<number[]>([])

  useEffect(() => {
    const t = setTimeout(() => setPhase('running'), 900)
    return () => clearTimeout(t)
  }, [])

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
          frame = setTimeout(() => runStep(idx + 1), 380)
          return
        }
        setProgresses(prev => { const n = [...prev]; n[idx] = Math.round(p); return n })
        frame = setTimeout(tick, 75)
      }
      tick()
    }

    runStep(0)
    return () => clearTimeout(frame)
  }, [phase])

  const restart = () => {
    setPhase('idle'); setCurrent(0)
    setProgresses(STEPS.map(() => 0)); setDone([])
    setTimeout(() => setPhase('running'), 400)
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <div className="flex-1 mx-4">
          <div className="bg-gray-100 rounded-md px-3 py-1 text-xs text-gray-400 font-mono max-w-xs mx-auto text-center select-none">
            app.cartswitcher.com/migrate
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-gray-900 font-bold text-base">Migration in Progress</h3>
            <p className="text-gray-400 text-sm mt-0.5">WooCommerce → Shopify</p>
          </div>
          <AnimatePresence mode="wait">
            {phase === 'done' ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: GREEN_LIGHT, color: '#3d6b10' }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: GREEN_BG }} />
                Complete
              </motion.div>
            ) : (
              <motion.div key="live" className="flex items-center gap-2 bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full">
                <motion.span className="w-2 h-2 rounded-full" style={{ backgroundColor: GREEN_BG }}
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                Live
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2.5">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = current === i && phase === 'running'
            const isDone = done.includes(i)
            const isWaiting = !isActive && !isDone && phase === 'running'
            const p = progresses[i]

            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isWaiting ? 0.45 : 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-xl p-3.5 border transition-colors"
                style={{
                  borderColor: isActive ? `${step.accent}30` : '#f3f4f6',
                  backgroundColor: isActive ? `${step.accent}06` : 'white',
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isDone ? GREEN_LIGHT : `${step.accent}15` }}>
                  <Icon className="w-4 h-4" style={{ color: isDone ? GREEN_BG : step.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-800 text-sm font-semibold">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs font-mono">{step.count}</span>
                      {isDone && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 className="w-4 h-4" style={{ color: GREEN_BG }} />
                        </motion.div>
                      )}
                      {isActive && (
                        <span className="text-xs font-bold" style={{ color: step.accent }}>{p}%</span>
                      )}
                    </div>
                  </div>
                  <Bar progress={p} accent={step.accent} done={isDone} />
                </div>
              </motion.div>
            )
          })}
        </div>

        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-5 flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="flex-1 rounded-xl p-4 text-center border" style={{ backgroundColor: GREEN_LIGHT, borderColor: 'rgba(150,191,72,0.3)' }}>
                <div className="text-2xl font-black text-gray-900 tracking-tight">26,992</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: '#3d6b10' }}>Records migrated successfully</div>
              </div>
              <button onClick={restart} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-xs font-semibold transition-colors px-4 py-2">
                Replay <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'running' && (
          <div className="mt-4 flex items-center gap-2 text-gray-400 text-xs font-medium">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            Your WooCommerce store stays live throughout
          </div>
        )}
      </div>
    </div>
  )
}
