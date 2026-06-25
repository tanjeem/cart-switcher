'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AnimatedDemo } from '@/components/AnimatedDemo'
import { Package, Users, ShoppingCart, Tag, FileText, Search, ArrowRight, ShieldCheck, Zap, Globe2, CheckCircle2 } from 'lucide-react'

// Animation variants
const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-wise-canvas text-wise-ink selection:bg-wise-primary-pale selection:text-wise-ink-deep overflow-hidden">
      
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 lg:px-12 py-4 bg-wise-canvas/90 backdrop-blur-md border-b border-wise-canvas-soft z-50">
        <span className="font-black text-2xl tracking-tighter text-wise-ink">CartSwitcher</span>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-semibold text-wise-body hover:text-wise-ink transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link
            href="/migrate/connect"
            className="bg-wise-primary text-wise-ink text-base font-semibold px-6 py-3 rounded-[24px] hover:bg-wise-primary-active transition-all"
          >
            Start migration
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-4 bg-wise-canvas-soft border-b border-wise-mute/10">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-8 relative z-10">
          
          <motion.div 
            className="flex-1 w-full"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[9999px] bg-wise-canvas shadow-sm text-sm font-semibold text-wise-ink mb-8">
              <span className="flex h-2 w-2 rounded-[9999px] bg-wise-positive"></span>
              The simplest WooCommerce to Shopify migration
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-6xl md:text-[80px] lg:text-[96px] font-black tracking-tighter mb-6 text-wise-ink leading-[0.95]">
              Migrate to Shopify.
              <br className="hidden lg:block" />
              <span className="text-wise-ink/50"> Without the headache.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-xl md:text-[24px] text-wise-body mb-10 max-w-2xl leading-relaxed font-normal">
              Ditch the buggy plugins and manual CSV uploads. Securely transfer your products, customers, and orders in minutes with zero coding and zero downtime.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/migrate/connect"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-wise-primary text-wise-ink px-8 py-4 rounded-[24px] font-semibold text-[16px] hover:bg-wise-primary-active transition-colors shadow-sm"
              >
                Start Free Migration
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-wise-canvas text-wise-ink px-8 py-4 rounded-[24px] font-semibold text-[16px] hover:bg-white transition-colors border border-wise-ink shadow-sm"
              >
                How it works
              </Link>
            </motion.div>
          </motion.div>

          {/* Animated Process Demo on the Right */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" as any }}
            className="flex-1 w-full lg:max-w-[500px]"
          >
            <AnimatedDemo />
          </motion.div>
        </div>
      </section>

      {/* Trust / Stats Section */}
      <section className="py-16 bg-wise-canvas">
        <div className="max-w-[1200px] mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-[40px] font-black tracking-tight text-wise-ink mb-1">100k+</div>
            <div className="text-sm text-wise-body font-semibold uppercase tracking-wider">Products Migrated</div>
          </div>
          <div>
            <div className="text-[40px] font-black tracking-tight text-wise-ink mb-1">99.9%</div>
            <div className="text-sm text-wise-body font-semibold uppercase tracking-wider">Uptime Guarantee</div>
          </div>
          <div>
            <div className="text-[40px] font-black tracking-tight text-wise-ink mb-1">24/7</div>
            <div className="text-sm text-wise-body font-semibold uppercase tracking-wider">Active Monitoring</div>
          </div>
          <div>
            <div className="text-[40px] font-black tracking-tight text-wise-positive mb-1">Zero</div>
            <div className="text-sm text-wise-body font-semibold uppercase tracking-wider">Data Loss</div>
          </div>
        </div>
      </section>

      {/* Solutions / Features */}
      <section id="features" className="py-24 md:py-32 px-4 relative bg-wise-canvas-soft">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-[1200px] mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <h2 className="text-[40px] md:text-[64px] font-black tracking-tighter mb-6 leading-tight">Engineered for peace of mind.</h2>
            <p className="text-[20px] text-wise-body max-w-2xl mx-auto font-normal">
              We built the perfect migration pipeline so you can focus on selling, not troubleshooting.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div variants={fadeUp} className="flex flex-col p-[32px] bg-wise-canvas rounded-[24px]">
              <div className="w-[48px] h-[48px] rounded-[9999px] bg-wise-primary-pale flex items-center justify-center mb-6 text-wise-positive-deep">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-[24px] font-semibold tracking-tight mb-3 text-wise-ink">100% Secure Transfer</h3>
              <p className="text-wise-body leading-relaxed text-[16px]">We connect directly via official APIs. Your data is encrypted in transit and never stored permanently on our servers.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col p-[32px] bg-wise-canvas rounded-[24px]">
              <div className="w-[48px] h-[48px] rounded-[9999px] bg-wise-primary-pale flex items-center justify-center mb-6 text-wise-positive-deep">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-[24px] font-semibold tracking-tight mb-3 text-wise-ink">Zero Store Downtime</h3>
              <p className="text-wise-body leading-relaxed text-[16px]">Your WooCommerce store stays perfectly live and taking orders while we clone everything in the background.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col p-[32px] bg-wise-canvas rounded-[24px]">
              <div className="w-[48px] h-[48px] rounded-[9999px] bg-wise-primary-pale flex items-center justify-center mb-6 text-wise-positive-deep">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="text-[24px] font-semibold tracking-tight mb-3 text-wise-ink">SEO Preservation</h3>
              <p className="text-wise-body leading-relaxed text-[16px]">We automatically generate 301 redirects for your products and blog posts so you never lose a drop of Google traffic.</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* What Migrates Section */}
      <section className="py-24 md:py-32 px-4 bg-wise-canvas">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-[1200px] mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <h2 className="text-[40px] md:text-[64px] font-black tracking-tighter mb-6 leading-tight">Everything you need, migrated perfectly.</h2>
            <p className="text-[20px] text-wise-body font-normal">If it matters to your business, we move it.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Package, label: 'Products', desc: 'Titles, descriptions, HTML, images, variants, SKUs, pricing, inventory logic.' },
              { icon: Users, label: 'Customers', desc: 'Contact info, billing addresses, shipping addresses, order history mapping.' },
              { icon: ShoppingCart, label: 'Orders', desc: 'Line items, shipping lines, payment status, financial status, notes, dates.' },
              { icon: Tag, label: 'Coupons', desc: 'Discount codes, discount types, usage limits, minimum requirements, expiry dates.' },
              { icon: FileText, label: 'Blog Posts', desc: 'Blog content, rich text, images, authors, slugs, and publish dates.' },
              { icon: Search, label: 'SEO Data', desc: 'Meta titles, meta descriptions, URL handles, and automatic 301 redirect map creation.' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div variants={fadeUp} key={item.label} className="p-[32px] rounded-[24px] bg-wise-canvas-soft">
                  <div className="w-[48px] h-[48px] rounded-[9999px] bg-wise-canvas flex items-center justify-center mb-6 text-wise-ink">
                    <Icon className="w-6 h-6 text-wise-ink" />
                  </div>
                  <h3 className="text-[24px] font-semibold tracking-tight mb-3 text-wise-ink">{item.label}</h3>
                  <p className="text-wise-body font-normal leading-relaxed text-[16px]">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 md:py-32 px-4 bg-wise-canvas-soft">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-[1200px] mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <h2 className="text-[40px] md:text-[64px] font-black tracking-tighter mb-6 leading-tight">Simple, transparent pricing</h2>
            <p className="text-[20px] text-wise-body font-normal">Try it for free. Only pay when you're ready to scale.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Demo Plan */}
            <motion.div variants={fadeUp} className="p-[32px] rounded-[24px] bg-wise-canvas">
              <div className="text-[16px] font-semibold tracking-tight text-wise-ink mb-2">Sandbox Demo</div>
              <div className="text-[40px] font-black mb-6 tracking-tight text-wise-body">Free</div>
              <ul className="space-y-4 mb-8 text-wise-body text-[16px] font-normal">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-mute" /> 10 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-mute" /> 5 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-mute" /> 5 Customers</li>
              </ul>
              <Link href="/migrate/connect?demo=true" className="block text-center w-full py-4 rounded-[24px] bg-wise-canvas-soft text-wise-ink font-semibold hover:bg-[#e0e4dd] transition-colors">
                Run Free Test
              </Link>
            </motion.div>

            {/* Starter Plan - Highlighted Dark */}
            <motion.div variants={fadeUp} className="p-[48px] rounded-[24px] bg-wise-ink text-wise-primary relative md:-my-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-wise-primary text-wise-ink text-xs font-bold px-4 py-1.5 rounded-[9999px] uppercase tracking-widest shadow-sm">
                Most Popular
              </div>
              <div className="text-[16px] font-semibold tracking-tight text-wise-canvas-soft mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[47px] font-black tracking-tight text-wise-primary">$49</span>
                <span className="text-wise-canvas-soft font-normal text-[16px]">/one-time</span>
              </div>
              <ul className="space-y-4 mb-10 text-wise-canvas text-[16px] font-normal">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-primary" /> Up to 500 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-primary" /> Up to 1,000 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-primary" /> Unlimited Customers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-primary" /> Priority Support</li>
              </ul>
              <Link href="/migrate/connect" className="block text-center w-full py-4 rounded-[24px] bg-wise-primary text-wise-ink font-semibold hover:bg-wise-primary-active transition-all">
                Get Started
              </Link>
            </motion.div>

            {/* Growth Plan */}
            <motion.div variants={fadeUp} className="p-[32px] rounded-[24px] bg-wise-canvas">
              <div className="text-[16px] font-semibold tracking-tight text-wise-ink mb-2">Growth</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[40px] font-black tracking-tight text-wise-ink">$99</span>
                <span className="text-wise-body font-normal text-[16px]">/one-time</span>
              </div>
              <ul className="space-y-4 mb-8 text-wise-body text-[16px] font-normal">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-positive" /> Up to 5,000 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-positive" /> Up to 10,000 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-positive" /> Unlimited Customers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-wise-positive" /> White-glove setup</li>
              </ul>
              <Link href="/migrate/connect" className="block text-center w-full py-4 rounded-[24px] bg-wise-canvas-soft text-wise-ink font-semibold hover:bg-[#e0e4dd] transition-colors">
                Get Started
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-wise-ink text-wise-canvas-soft py-16 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-black text-2xl tracking-tighter text-wise-primary">CartSwitcher</span>
          </div>
          <div className="text-wise-mute font-normal text-sm">
            © {new Date().getFullYear()} CartSwitcher. Built for Shopify Merchants.
          </div>
          <div className="flex gap-6 text-sm text-wise-canvas-soft font-semibold">
            <Link href="#" className="hover:text-wise-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-wise-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-wise-primary transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
