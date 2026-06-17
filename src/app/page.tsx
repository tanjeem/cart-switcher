import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b bg-white">
        <span className="font-bold text-xl tracking-tight">CartSwitcher</span>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link
            href="/migrate/connect"
            className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Start free migration
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-green-200">
          WooCommerce → Shopify
        </span>
        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight mb-6">
          Migrate your entire store to Shopify in minutes
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mb-10">
          Products, orders, customers, coupons, blog posts, and SEO data — all moved automatically.
          No coding. Zero downtime on your live store.
        </p>
        <div className="flex gap-4">
          <Link
            href="/migrate/connect"
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Start free demo
          </Link>
          <a
            href="#what-migrates"
            className="border border-gray-200 px-6 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            See what migrates
          </a>
        </div>
      </section>

      {/* What migrates */}
      <section id="what-migrates" className="bg-white border-t py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything that migrates</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: '📦', label: 'Products', desc: 'Titles, descriptions, images, variants, SKUs, pricing, inventory' },
              { icon: '👥', label: 'Customers', desc: 'Contact info, billing & shipping addresses, order history' },
              { icon: '🧾', label: 'Orders', desc: 'Line items, shipping, payment status, notes, dates' },
              { icon: '🏷️', label: 'Coupons', desc: 'Discount codes, types, limits, expiry dates' },
              { icon: '📝', label: 'Blog Posts', desc: 'Content, slugs, authors, publish dates' },
              { icon: '🔍', label: 'SEO Data', desc: 'Meta titles, descriptions, URL handles, 301 redirect map' },
            ].map(item => (
              <div key={item.label} className="p-5 rounded-xl border bg-gray-50">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold mb-1">{item.label}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Simple pricing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Demo', price: 'Free', desc: '10 products, 5 orders, 5 customers', cta: 'Try demo', href: '/migrate/connect?demo=true' },
              { name: 'Starter', price: '$49', desc: 'Up to 500 products & 1,000 orders', cta: 'Get started', href: '/migrate/connect', featured: true },
              { name: 'Growth', price: '$99', desc: 'Up to 5,000 products & 10,000 orders', cta: 'Get started', href: '/migrate/connect' },
            ].map(plan => (
              <div key={plan.name} className={`p-6 rounded-xl border ${plan.featured ? 'border-black bg-black text-white' : 'bg-white'}`}>
                <div className="font-semibold text-lg mb-1">{plan.name}</div>
                <div className="text-3xl font-bold mb-3">{plan.price}</div>
                <div className={`text-sm mb-6 ${plan.featured ? 'text-gray-300' : 'text-gray-500'}`}>{plan.desc}</div>
                <Link
                  href={plan.href}
                  className={`block w-full py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                    plan.featured
                      ? 'bg-white text-black hover:bg-gray-100'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-gray-400">
        CartSwitcher — Built for Shopify merchants
      </footer>
    </main>
  )
}
