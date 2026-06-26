import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How CartSwitcher collects, uses, and protects your data.',
}

const G = '#96bf48'
const EFFECTIVE = 'June 26, 2026'

export default function PrivacyPage() {
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
          <h1 className="text-[42px] font-black tracking-tighter text-gray-900 leading-tight mb-3">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">Effective date: {EFFECTIVE}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-relaxed text-gray-600">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. What we collect</h2>
            <p>When you use CartSwitcher, we collect:</p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-gray-500">
              <li><strong className="text-gray-700">Account data</strong> — name, email address, and authentication details via Clerk.</li>
              <li><strong className="text-gray-700">Store credentials</strong> — your WooCommerce site URL and API keys, and your Shopify store domain. These are used solely to perform the migration and are never stored permanently.</li>
              <li><strong className="text-gray-700">Migration data</strong> — logs of what was migrated (counts, entity types, timestamps). We do not store your actual product, customer, or order data after the migration completes.</li>
              <li><strong className="text-gray-700">Payment data</strong> — handled entirely by our payment processor. We do not store card numbers.</li>
              <li><strong className="text-gray-700">Usage data</strong> — pages visited, actions taken, browser type, IP address, for service improvement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How we use your data</h2>
            <ul className="space-y-1.5 list-disc list-inside text-gray-500">
              <li>To perform your WooCommerce → Shopify migration.</li>
              <li>To send you migration status emails and support responses.</li>
              <li>To improve the service and fix issues.</li>
              <li>We do not sell your data. We do not share it with third parties except as required to operate the service (Clerk for auth, our payment processor, Neon for database hosting).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Data retention</h2>
            <p>Migration logs are retained for 90 days after your migration completes, then automatically deleted. Your account data is retained until you request deletion. Store API credentials are discarded immediately after use and never written to persistent storage.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Your rights (GDPR)</h2>
            <p>If you are in the EU or UK, you have the right to access, correct, export, or delete your personal data at any time. Email us at <a href="mailto:support@cartswitcher.com" className="underline" style={{ color: G }}>support@cartswitcher.com</a> and we will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Cookies</h2>
            <p>We use strictly necessary cookies for authentication (via Clerk) and session management. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Security</h2>
            <p>All data is transmitted over HTTPS. Store credentials are encrypted in transit and are never logged. Our database (Neon PostgreSQL) is encrypted at rest.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Changes to this policy</h2>
            <p>We may update this policy. If changes are material, we will email registered users. Continued use of CartSwitcher after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Contact</h2>
            <p>Questions? Email <a href="mailto:support@cartswitcher.com" className="underline" style={{ color: G }}>support@cartswitcher.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
