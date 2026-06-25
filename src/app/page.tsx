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
    <main className="min-h-screen flex flex-col bg-[#FAFAFA] text-gray-900 selection:bg-[#96bf48]/20 selection:text-gray-900 overflow-hidden">
      
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 lg:px-12 py-4 bg-white/70 backdrop-blur-md border-b border-gray-200/50 z-50">
        <span className="font-bold text-xl tracking-tight text-gray-900">CartSwitcher</span>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link
            href="/migrate/connect"
            className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-gray-800 transition-all hover:shadow-md"
          >
            Start migration
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-4 flex flex-col items-center justify-center text-center">
        {/* Soft radial background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] bg-gradient-to-tr from-[#96bf48]/5 via-transparent to-blue-500/5 blur-[100px] -z-10 rounded-full" />
        
        <motion.div 
          className="max-w-4xl mx-auto z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200/60 shadow-sm text-sm font-medium text-gray-600 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-[#96bf48]"></span>
            The simplest WooCommerce to Shopify migration
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-600 pb-2">
            Migrate to Shopify.
            <br className="hidden md:block" />
            <span className="text-gray-400"> Without the headache.</span>
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Ditch the buggy plugins and manual CSV uploads. Securely transfer your products, customers, and orders in minutes with zero coding and zero downtime.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/migrate/connect"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-gray-800 transition-all hover:scale-105 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            >
              Start Free Migration <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Animated Process Demo */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" as any }}
          className="w-full px-4 relative z-10"
        >
          <AnimatedDemo />
        </motion.div>
      </section>

      {/* Trust / Stats Section */}
      <section className="py-16 border-y border-gray-200/50 bg-white">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold tracking-tight text-gray-900 mb-1">100k+</div>
            <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Products Migrated</div>
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight text-gray-900 mb-1">99.9%</div>
            <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Uptime Guarantee</div>
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight text-gray-900 mb-1">24/7</div>
            <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Active Monitoring</div>
          </div>
          <div>
            <div className="text-4xl font-bold tracking-tight text-[#96bf48] mb-1">Zero</div>
            <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Data Loss</div>
          </div>
        </div>
      </section>

      {/* Solutions / Features */}
      <section className="py-32 px-4 relative bg-[#FAFAFA]">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Engineered for peace of mind.</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
              We built the perfect migration pipeline so you can focus on selling, not troubleshooting.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div variants={fadeUp} className="flex flex-col items-center text-center p-8 bg-white rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-2xl bg-[#96bf48]/10 flex items-center justify-center mb-6 text-[#96bf48]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">100% Secure Transfer</h3>
              <p className="text-gray-500 leading-relaxed font-medium">We connect directly via official APIs. Your data is encrypted in transit and never stored permanently on our servers.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col items-center text-center p-8 bg-white rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">Zero Store Downtime</h3>
              <p className="text-gray-500 leading-relaxed font-medium">Your WooCommerce store stays perfectly live and taking orders while we clone everything in the background.</p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col items-center text-center p-8 bg-white rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500">
                <Globe2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">SEO Preservation</h3>
              <p className="text-gray-500 leading-relaxed font-medium">We automatically generate 301 redirects for your products and blog posts so you never lose a drop of Google traffic.</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* What Migrates Section */}
      <section className="py-32 px-4 bg-white border-t border-gray-100">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Everything you need, migrated perfectly.</h2>
            <p className="text-xl text-gray-500 font-medium">If it matters to your business, we move it.</p>
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
                <motion.div variants={fadeUp} key={item.label} className="p-8 rounded-3xl bg-[#FAFAFA] border border-gray-100 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 border border-gray-100">
                    <Icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mb-3 text-gray-900">{item.label}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-4 bg-[#FAFAFA]">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-500 font-medium">Try it for free. Only pay when you're ready to scale.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Demo Plan */}
            <motion.div variants={fadeUp} className="p-8 rounded-[2rem] bg-white border border-gray-200 shadow-sm">
              <div className="text-lg font-bold tracking-tight text-gray-900 mb-2">Sandbox Demo</div>
              <div className="text-4xl font-extrabold mb-6 tracking-tight text-gray-400">Free</div>
              <ul className="space-y-4 mb-8 text-gray-600 text-sm font-medium">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-gray-400" /> 10 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-gray-400" /> 5 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-gray-400" /> 5 Customers</li>
              </ul>
              <Link href="/migrate/connect?demo=true" className="block text-center w-full py-3.5 rounded-full bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-colors">
                Run Free Test
              </Link>
            </motion.div>

            {/* Starter Plan */}
            <motion.div variants={fadeUp} className="p-10 rounded-[2rem] bg-gray-900 text-white border border-gray-800 relative shadow-[0_20px_40px_rgb(0,0,0,0.15)] md:-my-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#96bf48] text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                Most Popular
              </div>
              <div className="text-lg font-bold tracking-tight text-gray-300 mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-extrabold tracking-tight text-white">$49</span>
                <span className="text-gray-400 font-medium">/one-time</span>
              </div>
              <ul className="space-y-4 mb-10 text-gray-300 text-sm font-medium">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#96bf48]" /> Up to 500 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#96bf48]" /> Up to 1,000 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#96bf48]" /> Unlimited Customers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-[#96bf48]" /> Priority Support</li>
              </ul>
              <Link href="/migrate/connect" className="block text-center w-full py-4 rounded-full bg-white text-gray-900 font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-[0_4px_14px_0_rgb(0,0,0,0.1)]">
                Get Started
              </Link>
            </motion.div>

            {/* Growth Plan */}
            <motion.div variants={fadeUp} className="p-8 rounded-[2rem] bg-white border border-gray-200 shadow-sm">
              <div className="text-lg font-bold tracking-tight text-gray-900 mb-2">Growth</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold tracking-tight text-gray-900">$99</span>
                <span className="text-gray-500 font-medium">/one-time</span>
              </div>
              <ul className="space-y-4 mb-8 text-gray-600 text-sm font-medium">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Up to 5,000 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Up to 10,000 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Unlimited Customers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> White-glove setup</li>
              </ul>
              <Link href="/migrate/connect" className="block text-center w-full py-3.5 rounded-full bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-colors">
                Get Started
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-gray-900">CartSwitcher</span>
          </div>
          <div className="text-gray-500 font-medium text-sm">
            © {new Date().getFullYear()} CartSwitcher. Built for Shopify Merchants.
          </div>
          <div className="flex gap-6 text-sm text-gray-500 font-medium">
            <Link href="#" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-gray-900 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
