'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ShoppingCart, Package, Users, Tag, FileText, CheckCircle2 } from 'lucide-react'

const DATA_TYPES = [
  { icon: Package, label: 'Products', color: 'bg-[#9fe870]', textColor: 'text-[#163300]' },
  { icon: Users, label: 'Customers', color: 'bg-[#ffc091]', textColor: 'text-[#4a3b1c]' },
  { icon: ShoppingCart, label: 'Orders', color: 'bg-[#38c8ff]', textColor: 'text-[#0e0f0c]' },
  { icon: Tag, label: 'Coupons', color: 'bg-[#cdffad]', textColor: 'text-[#163300]' },
  { icon: FileText, label: 'Blog Posts', color: 'bg-[#e2f6d5]', textColor: 'text-[#163300]' },
]

export function AnimatedDemo() {
  const [activeType, setActiveType] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveType((prev) => (prev + 1) % DATA_TYPES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto bg-wise-canvas border border-wise-mute/20 rounded-[24px] p-8 shadow-sm relative overflow-hidden">
      
      <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
        
        {/* Source: WooCommerce */}
        <div className="flex flex-col items-center gap-4 z-10 w-full md:w-1/3">
          <div className="w-24 h-24 rounded-[24px] bg-wise-canvas-soft flex items-center justify-center relative">
            <svg viewBox="0 0 100 100" className="w-12 h-12 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 90c-22.1 0-40-17.9-40-40S27.9 10 50 10s40 17.9 40 40-17.9 40-40 40zm-15-55v25l15 10 15-10V35L50 25 35 35z" fill="#0e0f0c"/>
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-wise-ink font-bold text-lg tracking-tight">WooCommerce</h3>
            <p className="text-wise-body text-sm font-medium">Existing store</p>
          </div>
        </div>

        {/* Transfer Animation Middle */}
        <div className="flex-1 h-32 relative flex items-center justify-center min-w-[200px] z-10 hidden md:flex">
          {/* Path line */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-wise-canvas-soft via-wise-mute/30 to-wise-canvas-soft -translate-y-1/2" />
          
          {/* Animated items */}
          <div className="relative w-full h-full flex items-center">
            {DATA_TYPES.map((type, index) => {
              const isActive = index === activeType
              const Icon = type.icon
              return (
                <motion.div
                  key={type.label}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-3 ${type.color} px-4 py-2 rounded-[24px]`}
                  initial={{ x: '0%', opacity: 0, scale: 0.8 }}
                  animate={{
                    x: isActive ? ['0%', '100%', '300%'] : '0%',
                    opacity: isActive ? [0, 1, 1, 0] : 0,
                    scale: isActive ? [0.8, 1, 1, 0.8] : 0.8,
                  }}
                  transition={{
                    duration: 2.4,
                    ease: "easeOut" as any,
                    times: [0, 0.2, 0.8, 1],
                    repeat: isActive ? Infinity : 0,
                    repeatDelay: (DATA_TYPES.length - 1) * 2.5
                  }}
                  style={{ zIndex: isActive ? 20 : 0 }}
                >
                  <div className={`flex items-center justify-center ${type.textColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`${type.textColor} font-bold tracking-tight text-sm whitespace-nowrap hidden lg:block`}>Moving {type.label}...</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Target: Shopify */}
        <div className="flex flex-col items-center gap-4 z-10 w-full md:w-1/3">
          <div className="w-24 h-24 rounded-[24px] bg-wise-primary flex items-center justify-center shadow-sm relative">
            <svg viewBox="0 0 100 100" className="w-12 h-12 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M85 20l-15-5-5-15h-30l-5 15-15 5 10 25-5 40h60l-5-40 10-25z" fill="#0e0f0c"/>
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-wise-ink font-bold text-lg tracking-tight">Shopify</h3>
            <p className="text-wise-positive-deep text-sm font-semibold">Your new home</p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
        <div className="flex items-center gap-1.5 bg-wise-canvas-soft text-wise-ink px-4 py-2 rounded-[24px]">
          <CheckCircle2 className="w-4 h-4 text-wise-positive" />
          Zero downtime
        </div>
        <div className="flex items-center gap-1.5 bg-wise-canvas-soft text-wise-ink px-4 py-2 rounded-[24px]">
          <CheckCircle2 className="w-4 h-4 text-wise-positive" />
          No coding required
        </div>
        <div className="flex items-center gap-1.5 bg-wise-canvas-soft text-wise-ink px-4 py-2 rounded-[24px]">
          <CheckCircle2 className="w-4 h-4 text-wise-positive" />
          SEO preserved
        </div>
      </div>
    </div>
  )
}
