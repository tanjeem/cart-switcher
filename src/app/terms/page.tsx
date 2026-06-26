import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'CartSwitcher terms of service — what you agree to when using our migration tool.',
}

const G = '#96bf48'
const EFFECTIVE = 'June 26, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-black text-xl tracking-tight">
          Cart<span style={{ color: G }}>Switcher</span>
        </Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">← Back to home</Link>
      </nav>

      <div className="max-w-[720px] mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="text-xs font-black uppercase tracking-[0.15em] mb-3" style={{ color: G }}>Legal</div>
          <h1 className="text-[42px] font-black tracking-tighter text-gray-900 leading-tight mb-3">Terms of Service</h1>
          <p className="text-gray-400 text-sm">Effective date: {EFFECTIVE}</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-gray-600">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance</h2>
            <p>By creating an account or using CartSwitcher, you agree to these Terms. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. The service</h2>
            <p>CartSwitcher provides automated data migration from WooCommerce to Shopify. We migrate products, customers, orders, coupons, blog posts, and SEO URL mappings. The service is provided as a one-time purchase per migration job. Sandbox (free) migrations are limited to 25 products, 10 orders, and 10 customers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Your responsibilities</h2>
            <ul className="space-y-1.5 list-disc list-inside text-gray-500">
              <li>You must own or have full authorisation to migrate the store data.</li>
              <li>You are responsible for backing up your WooCommerce data before migration.</li>
              <li>You are responsible for testing your Shopify store after migration completes.</li>
              <li>You must not use CartSwitcher for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Payments and refunds</h2>
            <p>All prices are in USD. Payment is due before a paid migration starts. We offer a 7-day full refund if your migration fails or produces materially incorrect data. Refund requests must be submitted within 7 days of purchase via <a href="mailto:support@cartswitcher.com" className="underline" style={{ color: G }}>support@cartswitcher.com</a>. Sandbox migrations are free and non-refundable (there is nothing to refund).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Limitation of liability</h2>
            <p>CartSwitcher is provided &quot;as is.&quot; We make no warranty that the service will be uninterrupted or error-free. Our liability for any claim arising from use of the service is limited to the amount you paid for the migration in question. We are not liable for any indirect, incidental, or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Intellectual property</h2>
            <p>CartSwitcher and its code are owned by CartSwitcher. Your store data remains yours at all times. We claim no ownership over any data we migrate on your behalf.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Termination</h2>
            <p>We may suspend access for violations of these Terms. You may stop using the service at any time. Completed migrations are not reversible by CartSwitcher — once data is in your Shopify store, only you can modify it.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Changes</h2>
            <p>We may update these Terms. Material changes will be communicated by email. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contact</h2>
            <p>Questions about these Terms? Email <a href="mailto:support@cartswitcher.com" className="underline" style={{ color: G }}>support@cartswitcher.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
