import Link from 'next/link'
import { AnimatedDemo } from '@/components/AnimatedDemo'
import { Package, Users, ShoppingCart, Tag, FileText, Search, ArrowRight, ShieldCheck, Zap, Globe2, CheckCircle2 } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-6 border-b border-white/10 relative z-20">
        <span className="font-bold text-xl tracking-tight text-white">CartSwitcher</span>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link
            href="/migrate/connect"
            className="bg-[#96bf48] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#85ab3f] transition-all hover:shadow-[0_0_20px_rgba(150,191,72,0.3)]"
          >
            Start migration
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4 overflow-hidden flex flex-col items-center">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-gradient-to-b from-[#96bf48]/20 to-transparent blur-[120px] -z-10 pointer-events-none" />
        
        <div className="text-center max-w-4xl mx-auto z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#96bf48] animate-pulse"></span>
            The #1 WooCommerce to Shopify Migration Tool
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1] bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Migrate to Shopify.<br />
            <span className="text-white">Without the headache.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Ditch the buggy plugins and manual CSV uploads. Securely transfer your products, customers, and orders in minutes with zero coding and zero downtime.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/migrate/connect"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#96bf48] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#85ab3f] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(150,191,72,0.4)]"
            >
              Start Free Migration <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-gray-500 sm:hidden">No credit card required</p>
          </div>
        </div>

        {/* Animated Process Demo */}
        <div className="w-full px-4 relative z-10">
          <AnimatedDemo />
        </div>
      </section>

      {/* Trust / Stats Section */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-white mb-1">100k+</div>
            <div className="text-sm text-gray-500 font-medium">Products Migrated</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">99.9%</div>
            <div className="text-sm text-gray-500 font-medium">Uptime Guarantee</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">24/7</div>
            <div className="text-sm text-gray-500 font-medium">Active Monitoring</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#96bf48] mb-1">Zero</div>
            <div className="text-sm text-gray-500 font-medium">Data Loss</div>
          </div>
        </div>
      </section>

      {/* Solutions / Features */}
      <section className="py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Why merchants choose CartSwitcher</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              We engineered the perfect migration pipeline so you can focus on selling, not troubleshooting.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={ShieldCheck}
              title="100% Secure Transfer"
              desc="We connect directly via official API credentials. Your data is encrypted in transit and never stored permanently on our servers."
            />
            <FeatureCard 
              icon={Zap}
              title="Zero Store Downtime"
              desc="Your WooCommerce store stays perfectly live and taking orders while we clone everything in the background to Shopify."
            />
            <FeatureCard 
              icon={Globe2}
              title="Flawless SEO Preservation"
              desc="We automatically generate 301 redirects for your products and blog posts so you never lose a single drop of Google traffic."
            />
          </div>
        </div>
      </section>

      {/* What Migrates Section */}
      <section className="py-32 px-4 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need, migrated perfectly.</h2>
            <p className="text-xl text-gray-400">If it matters to your business, we move it.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Package, label: 'Products', desc: 'Titles, descriptions, rich HTML, images, variants, SKUs, pricing, inventory logic.' },
              { icon: Users, label: 'Customers', desc: 'Contact info, billing addresses, shipping addresses, order history mapping.' },
              { icon: ShoppingCart, label: 'Orders', desc: 'Line items, shipping lines, payment status, financial status, notes, dates.' },
              { icon: Tag, label: 'Coupons', desc: 'Discount codes, discount types, usage limits, minimum requirements, expiry dates.' },
              { icon: FileText, label: 'Blog Posts', desc: 'Blog content, rich text, images, authors, slugs, and publish dates.' },
              { icon: Search, label: 'SEO Data', desc: 'Meta titles, meta descriptions, URL handles, and automatic 301 redirect map creation.' },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-6 border border-gray-700">
                    <Icon className="w-6 h-6 text-[#96bf48]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.label}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-400">Try it for free. Only pay when you're ready to scale.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Demo Plan */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
              <div className="text-lg font-semibold text-gray-300 mb-2">Sandbox Demo</div>
              <div className="text-4xl font-bold mb-6 text-white">Free</div>
              <ul className="space-y-4 mb-8 text-gray-400 text-sm">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> 10 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> 5 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> 5 Customers</li>
              </ul>
              <Link href="/migrate/connect?demo=true" className="block text-center w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                Run Free Test
              </Link>
            </div>

            {/* Starter Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-gray-800 to-gray-900 border border-[#96bf48]/50 relative shadow-[0_0_40px_rgba(150,191,72,0.15)] md:-my-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#96bf48] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <div className="text-lg font-semibold text-[#96bf48] mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold text-white">$49</span>
                <span className="text-gray-400">/one-time</span>
              </div>
              <ul className="space-y-4 mb-8 text-gray-300 text-sm font-medium">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Up to 500 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Up to 1,000 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Unlimited Customers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Priority Support</li>
              </ul>
              <Link href="/migrate/connect" className="block text-center w-full py-3.5 rounded-xl bg-[#96bf48] text-white font-semibold hover:bg-[#85ab3f] transition-all hover:shadow-lg">
                Get Started
              </Link>
            </div>

            {/* Growth Plan */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
              <div className="text-lg font-semibold text-gray-300 mb-2">Growth</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$99</span>
                <span className="text-gray-400">/one-time</span>
              </div>
              <ul className="space-y-4 mb-8 text-gray-400 text-sm">
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Up to 5,000 Products</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Up to 10,000 Orders</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> Unlimited Customers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-[#96bf48]" /> White-glove setup</li>
              </ul>
              <Link href="/migrate/connect" className="block text-center w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-black">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-white">CartSwitcher</span>
          </div>
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} CartSwitcher. Built for Shopify Merchants.
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 text-[#96bf48]">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{desc}</p>
    </div>
  )
}
