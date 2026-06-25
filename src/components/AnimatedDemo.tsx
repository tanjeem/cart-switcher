'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { ShoppingCart, Package, Users, Tag, FileText, CheckCircle2 } from 'lucide-react'

const DATA_TYPES = [
  { icon: Package, label: 'Products', color: 'bg-blue-500' },
  { icon: Users, label: 'Customers', color: 'bg-purple-500' },
  { icon: ShoppingCart, label: 'Orders', color: 'bg-green-500' },
  { icon: Tag, label: 'Coupons', color: 'bg-orange-500' },
  { icon: FileText, label: 'Blog Posts', color: 'bg-pink-500' },
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
    <div className="w-full max-w-4xl mx-auto bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#96bf48]/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />

      <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
        
        {/* Source: WooCommerce */}
        <div className="flex flex-col items-center gap-4 z-10 w-full md:w-1/3">
          <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 100 100" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 90c-22.1 0-40-17.9-40-40S27.9 10 50 10s40 17.9 40 40-17.9 40-40 40zm-15-55v25l15 10 15-10V35L50 25 35 35z" fill="#7F54B3"/>
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-white font-semibold text-lg">WooCommerce</h3>
            <p className="text-gray-400 text-sm">Your existing store</p>
          </div>
        </div>

        {/* Transfer Animation Middle */}
        <div className="flex-1 h-32 relative flex items-center justify-center min-w-[200px] z-10 hidden md:flex">
          {/* Path line */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 -translate-y-1/2" />
          
          {/* Animated items */}
          <div className="relative w-full h-full flex items-center">
            {DATA_TYPES.map((type, index) => {
              const isActive = index === activeType
              const Icon = type.icon
              return (
                <motion.div
                  key={type.label}
                  className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-3 bg-gray-800/80 backdrop-blur border border-gray-700 px-4 py-2 rounded-full"
                  initial={{ x: '0%', opacity: 0, scale: 0.8 }}
                  animate={{
                    x: isActive ? ['0%', '100%', '300%'] : '0%',
                    opacity: isActive ? [0, 1, 1, 0] : 0,
                    scale: isActive ? [0.8, 1, 1, 0.8] : 0.8,
                  }}
                  transition={{
                    duration: 2.4,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.8, 1],
                    repeat: isActive ? Infinity : 0,
                    repeatDelay: (DATA_TYPES.length - 1) * 2.5
                  }}
                  style={{ zIndex: isActive ? 20 : 0 }}
                >
                  <div className={`w-8 h-8 rounded-full ${type.color} flex items-center justify-center text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-white font-medium text-sm whitespace-nowrap hidden lg:block">Migrating {type.label}...</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Target: Shopify */}
        <div className="flex flex-col items-center gap-4 z-10 w-full md:w-1/3">
          <div className="w-24 h-24 rounded-2xl bg-[#96bf48] flex items-center justify-center shadow-lg shadow-[#96bf48]/20">
            <svg viewBox="0 0 100 100" className="w-14 h-14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M85 20l-15-5-5-15h-30l-5 15-15 5 10 25-5 40h60l-5-40 10-25z" fill="#fff"/>
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-white font-semibold text-lg">Shopify</h3>
            <p className="text-[#96bf48] text-sm">Your new home</p>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400">
        <div className="flex items-center gap-1.5 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
          <CheckCircle2 className="w-4 h-4 text-[#96bf48]" />
          Zero downtime
        </div>
        <div className="flex items-center gap-1.5 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
          <CheckCircle2 className="w-4 h-4 text-[#96bf48]" />
          No coding required
        </div>
        <div className="flex items-center gap-1.5 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
          <CheckCircle2 className="w-4 h-4 text-[#96bf48]" />
          SEO preserved
        </div>
      </div>
    </div>
  )
}
