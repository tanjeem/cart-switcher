'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowRight, ExternalLink, ChevronRight, Shield, Zap, Lock } from 'lucide-react'
import type { MigrationEntities } from '@/types'

const G = '#96bf48'
const GL = '#eef7e0'
const GD = '#4a7a10'

const ENTITY_DEFS: { key: keyof MigrationEntities; label: string; icon: string; description: string }[] = [
  { key: 'products',  label: 'Products',   icon: '📦', description: 'Products, variants, images, inventory' },
  { key: 'customers', label: 'Customers',  icon: '👥', description: 'Accounts, addresses, order history' },
  { key: 'orders',    label: 'Orders',     icon: '🧾', description: 'Line items, payments, shipping' },
  { key: 'coupons',   label: 'Coupons',    icon: '🏷️', description: 'Discount codes & rules' },
  { key: 'posts',     label: 'Blog Posts', icon: '📝', description: 'Articles, images, authors' },
]

const ALL_ON: MigrationEntities = { products: true, customers: true, orders: true, coupons: true, posts: true }

// ── Walkthrough content per step ──────────────────────────────────────────────

const WC_STEPS = [
  {
    title: 'Open WooCommerce Settings',
    desc: 'In your WordPress admin, go to WooCommerce → Settings.',
    visual: (
      <div className="bg-[#1d2327] rounded-xl overflow-hidden text-[11px] font-mono">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#2c3338] border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#ffbd2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" />
          <span className="text-white/40 ml-2">yourstore.com/wp-admin</span>
        </div>
        <div className="flex h-36">
          <div className="w-36 bg-[#23282d] border-r border-white/10 p-2 space-y-0.5">
            {['Dashboard','Posts','WooCommerce','Products','Appearance'].map((item, i) => (
              <div key={item} className={`px-2 py-1 rounded text-[10px] ${i === 2 ? 'text-white font-bold' : 'text-white/40'}`}
                style={i === 2 ? { backgroundColor: G } : {}}>
                {i === 2 ? '▶ ' : ''}{item}
              </div>
            ))}
          </div>
          <div className="flex-1 p-3">
            <div className="text-white/60 mb-2 text-[10px]">WooCommerce</div>
            <div className="space-y-1">
              {['Orders','Customers','Products','Reports','Settings','Extensions'].map((item, i) => (
                <div key={item} className={`text-[10px] px-2 py-0.5 rounded ${i === 4 ? 'text-white font-bold underline' : 'text-white/40'}`}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Go to Advanced → REST API',
    desc: 'Click the "Advanced" tab at the top, then select "REST API" from the sub-menu.',
    visual: (
      <div className="bg-[#1d2327] rounded-xl overflow-hidden text-[11px] font-mono">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#2c3338] border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#ffbd2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" />
          <span className="text-white/40 ml-2">WooCommerce → Settings</span>
        </div>
        <div className="p-3">
          <div className="flex gap-3 mb-3 border-b border-white/10 pb-2">
            {['General','Products','Tax','Shipping','Payments','Accounts','Emails','Advanced'].map((t, i) => (
              <span key={t} className={`text-[9px] pb-1 ${i === 7 ? 'text-white border-b-2 font-bold' : 'text-white/30'}`}
                style={i === 7 ? { borderColor: G } : {}}>{t}</span>
            ))}
          </div>
          <div className="flex gap-4">
            <div className="space-y-1">
              {['Page setup','REST API','Webhooks','Legacy API'].map((item, i) => (
                <div key={item} className={`text-[10px] px-2 py-0.5 rounded ${i === 1 ? 'text-white font-bold' : 'text-white/40'}`}
                  style={i === 1 ? { backgroundColor: `${G}30` } : {}}>
                  {item}
                </div>
              ))}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white/30 text-[10px] text-center">REST API key manager<br />will appear here →</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Click "Add Key"',
    desc: 'Click the "Add Key" button to create a new API key. Set permissions to "Read".',
    visual: (
      <div className="bg-[#1d2327] rounded-xl overflow-hidden text-[11px] font-mono">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#2c3338] border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#ffbd2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" />
          <span className="text-white/40 ml-2">REST API → Add Key</span>
        </div>
        <div className="p-3 space-y-2">
          <div>
            <div className="text-white/40 text-[10px] mb-1">Description</div>
            <div className="bg-white/10 rounded px-2 py-1 text-white text-[10px]">CartSwitcher</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] mb-1">Permissions</div>
            <div className="flex gap-2">
              {['Read','Read/Write','Write'].map((p, i) => (
                <div key={p} className={`text-[10px] px-2 py-0.5 rounded border ${i === 0 ? 'text-white border-transparent font-bold' : 'text-white/30 border-white/20'}`}
                  style={i === 0 ? { backgroundColor: G } : {}}>
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div className="pt-1">
            <div className="text-[10px] text-white px-3 py-1.5 rounded font-bold w-fit" style={{ backgroundColor: G }}>
              Generate API Key
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Copy your Consumer Key & Secret',
    desc: 'Copy the Consumer Key (starts with ck_) and Consumer Secret (starts with cs_) — these only appear once.',
    visual: (
      <div className="bg-[#1d2327] rounded-xl overflow-hidden text-[11px] font-mono">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#2c3338] border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" /><div className="w-2 h-2 rounded-full bg-[#ffbd2e]" /><div className="w-2 h-2 rounded-full bg-[#28c840]" />
          <span className="text-white/40 ml-2">API Key generated!</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="bg-amber-500/20 border border-amber-500/30 rounded px-2 py-1 text-amber-300 text-[10px]">
            ⚠ Save these now — they won't be shown again
          </div>
          <div>
            <div className="text-white/40 text-[10px] mb-0.5">Consumer Key</div>
            <div className="bg-white/10 rounded px-2 py-1 text-[10px] flex items-center justify-between">
              <span style={{ color: G }}>ck_a1b2c3d4e5f6...</span>
              <span className="text-white/30">Copy</span>
            </div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] mb-0.5">Consumer Secret</div>
            <div className="bg-white/10 rounded px-2 py-1 text-[10px] flex items-center justify-between">
              <span style={{ color: G }}>cs_x9y8z7w6v5u4...</span>
              <span className="text-white/30">Copy</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
]

const SCOPES = 'read_customers,write_customers,read_price_rules,write_price_rules,read_discounts,write_discounts,write_draft_orders,read_draft_orders,write_order_edits,read_order_edits,read_orders,write_orders,read_product_feeds,write_product_feeds,read_product_listings,write_product_listings,read_products,write_products,read_content,write_content,customer_read_orders,customer_write_orders'
const REDIRECT_URL = 'https://cart-switcher.vercel.app/api/shopify/callback'

// Reusable building blocks for step visuals
const Chrome = ({ url, children }: { url: string; children: React.ReactNode }) => (
  <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center gap-1.5 px-3 py-2 bg-[#f5f5f5] border-b border-gray-200">
      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      <span className="text-[10px] text-gray-400 font-mono ml-2 truncate">{url}</span>
    </div>
    {children}
  </div>
)

const Callout = ({ n, text }: { n: number; text: string }) => (
  <div className="flex items-start gap-2 mt-2">
    <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0 mt-0.5"
      style={{ backgroundColor: G }}>{n}</div>
    <span className="text-[11px] text-gray-600 leading-relaxed">{text}</span>
  </div>
)

function CopyBox({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: `${G}40` }}>
      <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: `${G}30`, backgroundColor: `${G}08` }}>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: GD }}>{label}</span>
        <button onClick={copy}
          className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white transition-all"
          style={{ backgroundColor: copied ? '#22c55e' : G }}>
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <div className={`px-2 py-1.5 text-[9px] text-gray-700 break-all leading-relaxed bg-white ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

const NavItem = ({ label, active, sub }: { label: string; active?: boolean; sub?: boolean }) => (
  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${sub ? 'ml-3' : ''} ${active ? 'font-bold text-gray-900 bg-gray-100' : 'text-gray-400'}`}>
    {active && <div className="w-1 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: G }} />}
    {label}
  </div>
)

const ShopifySidebar = ({ active }: { active: string }) => (
  <div className="w-36 bg-[#1a1a1a] p-2 space-y-0.5 flex-shrink-0 text-[10px]">
    {['Home','Orders','Products','Customers','Analytics','Settings'].map(item => (
      <div key={item} className={`px-2 py-1 rounded ${item === active ? 'text-white font-bold' : 'text-white/35'}`}
        style={item === active ? { backgroundColor: G } : {}}>
        {item}
      </div>
    ))}
  </div>
)

const SHOPIFY_STEPS = [
  {
    title: 'Go to Settings → Apps and sales channels',
    desc: 'In your Shopify Admin, click "Settings" at the bottom of the left sidebar. Then click "Apps and sales channels" from the settings menu.',
    note: { type: 'tip', text: 'Settings is pinned at the bottom of the sidebar — you can\'t miss it.' },
    visual: (
      <Chrome url="mystore.myshopify.com/admin/settings">
        <div className="flex" style={{ height: 200 }}>
          <ShopifySidebar active="Settings" />
          <div className="flex-1 p-3">
            <div className="text-[10px] font-bold text-gray-700 mb-2">Settings</div>
            <div className="space-y-0.5">
              {['Store details','Plans','Billing','Users and permissions','Apps and sales channels','Domains'].map((item, i) => (
                <NavItem key={item} label={item} active={i === 4} />
              ))}
            </div>
          </div>
        </div>
      </Chrome>
    ),
  },
  {
    title: 'Develop apps → Build app in Dev Dashboard',
    desc: 'Click "Develop apps" in the top right. If prompted, click "Allow custom app development". Then click "Build an app in the Dev Dashboard" — this takes you to the Shopify Partners dashboard.',
    note: { type: 'tip', text: 'If you don\'t see "Develop apps", you may need store Owner permissions.' },
    visual: (
      <Chrome url="mystore.myshopify.com/admin/settings/apps">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-gray-800">Apps and sales channels</div>
              <div className="text-[9px] text-gray-400">Manage your store apps</div>
            </div>
            <div className="text-[10px] font-bold text-white px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: G }}>
              Develop apps
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-2.5 bg-gray-50">
            <div className="text-[9px] text-gray-500 mb-2">Choose how to build your app</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 bg-white border-2 rounded-lg p-2" style={{ borderColor: G }}>
                <div className="w-5 h-5 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: GL }}>🔨</div>
                <div className="flex-1">
                  <div className="text-[9px] font-bold text-gray-800">Build an app in the Dev Dashboard</div>
                  <div className="text-[8px] text-gray-400">Full control via Shopify Partners</div>
                </div>
                <div className="text-[8px] font-bold" style={{ color: G }}>→</div>
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 opacity-40">
                <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] bg-gray-100">📦</div>
                <div className="text-[9px] text-gray-500">Use template</div>
              </div>
            </div>
          </div>
        </div>
      </Chrome>
    ),
  },
  {
    title: 'In the Dev Dashboard: Apps → Create app → name it "CartSwitcher"',
    desc: 'You\'re now in the Shopify Dev Dashboard. Click "Apps" in the left sidebar, then click "Create app". Enter "CartSwitcher" as the app name and click "Create". No developer email needed.',
    note: { type: 'info', text: 'The app name is just for your reference — it won\'t be visible to your customers.' },
    visual: (
      <Chrome url="partners.shopify.com/organizations/.../apps">
        <div className="flex" style={{ height: 200 }}>
          {/* Dev dashboard sidebar */}
          <div className="w-32 bg-[#1a1a1a] p-2 space-y-0.5 flex-shrink-0 text-[10px]">
            <div className="text-white/30 text-[8px] px-2 mb-1 uppercase tracking-wide">Dev Dashboard</div>
            {['Home','Apps','Extensions','Partners'].map((item, i) => (
              <div key={item} className={`px-2 py-1 rounded ${i === 1 ? 'text-white font-bold' : 'text-white/35'}`}
                style={i === 1 ? { backgroundColor: G } : {}}>
                {item}
              </div>
            ))}
          </div>
          <div className="flex-1 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-gray-800">Apps</div>
              <div className="text-[9px] font-bold text-white px-2 py-1 rounded" style={{ backgroundColor: G }}>+ Create app</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-2.5 bg-gray-50 space-y-1.5">
              <div className="text-[9px] font-bold text-gray-700">Create app</div>
              <div>
                <div className="text-[8px] text-gray-400 mb-0.5">App name <span className="text-red-400">*</span></div>
                <div className="bg-white border-2 rounded px-2 py-1 text-[9px] font-bold text-gray-800" style={{ borderColor: G }}>
                  CartSwitcher
                </div>
              </div>
              <div className="flex gap-2 pt-0.5">
                <div className="text-[9px] font-bold text-white px-2.5 py-1 rounded" style={{ backgroundColor: G }}>Create</div>
                <div className="text-[9px] text-gray-400 px-2 py-1">Cancel</div>
              </div>
            </div>
          </div>
        </div>
      </Chrome>
    ),
  },
  {
    title: 'On the Versions page — scroll to Access and paste scopes',
    desc: 'After creating the app, Shopify opens the Versions page. Scroll down to the "Access" section and find the "Scopes" input field. Paste the full string below into that field exactly as shown.',
    note: { type: 'warn', text: 'Paste it exactly — one long line, no spaces. Missing a scope will cause migration to fail.' },
    visual: (
      <Chrome url="partners.shopify.com/.../versions/new">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold text-gray-800">Version 1</div>
            <div className="text-[8px] text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">Draft</div>
          </div>
          {/* Scroll hint */}
          <div className="flex items-center gap-1.5 text-[8.5px] text-gray-400 italic">
            <span>↓</span><span>Scroll down to the Access section</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-2.5 space-y-1.5">
            <div className="text-[9px] font-bold text-gray-700">Access</div>
            <div>
              <div className="text-[8.5px] text-gray-500 mb-0.5">Scopes</div>
              <div className="bg-white border border-gray-200 rounded px-2 py-1.5 text-[8px] font-mono text-gray-400 leading-relaxed break-all" style={{ maxHeight: 36, overflow: 'hidden' }}>
                read_customers,write_customers,read_price_rules…
              </div>
            </div>
            <CopyBox label="Copy then paste into the Scopes field" value={SCOPES} />
          </div>
        </div>
      </Chrome>
    ),
  },
  {
    title: 'Still on Versions — scroll to Redirect URLs, paste, then Release',
    desc: 'Further down the same Versions page, find the "Redirect URLs" section. Paste the URL below into that field. Then scroll to the very bottom and click "Release" to publish the version.',
    note: { type: 'info', text: 'Both scopes and redirect URL live on this same page — do them together before clicking Release.' },
    visual: (
      <Chrome url="partners.shopify.com/.../versions/new">
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[8.5px] text-gray-400 italic mb-1">
            <span>↓</span><span>Further down — Redirect URLs section</span>
          </div>
          <div className="border border-gray-200 rounded-lg p-2.5 space-y-1.5">
            <div className="text-[9px] font-bold text-gray-700">Redirect URLs</div>
            <div className="bg-white border border-gray-200 rounded px-2 py-1.5 text-[8.5px] text-gray-400 font-mono">
              https://example.com/callback
            </div>
            <CopyBox label="Replace with this URL" value={REDIRECT_URL} mono={false} />
          </div>
          <div className="flex items-center gap-1.5 text-[8.5px] text-gray-400 italic">
            <span>↓</span><span>Scroll to the very bottom</span>
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-[9px] font-bold text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: G }}>Release</div>
            <div className="text-[8.5px] text-gray-400">← click to publish this version</div>
          </div>
        </div>
      </Chrome>
    ),
  },
  {
    title: 'In the Dev Dashboard sidebar — click CartSwitcher → Install app',
    desc: 'After releasing, click "CartSwitcher" in the left sidebar of the Dev Dashboard. On the right side of the screen you\'ll see an "Install app" button. Click it and confirm the permissions popup.',
    note: { type: 'warn', text: 'The "Install app" button only appears after you release. If you don\'t see it, go back and release the version first.' },
    visual: (
      <Chrome url="partners.shopify.com/.../apps/cartswitcher">
        <div className="flex" style={{ height: 200 }}>
          {/* Dev dashboard sidebar */}
          <div className="w-32 bg-[#1a1a1a] p-2 space-y-0.5 flex-shrink-0 text-[10px]">
            <div className="text-white/30 text-[8px] px-2 mb-1 uppercase tracking-wide">Dev Dashboard</div>
            {['Home','Apps','Extensions'].map((item, i) => (
              <div key={item} className={`px-2 py-1 rounded ${i === 1 ? 'text-white/50' : 'text-white/30'}`}>{item}</div>
            ))}
            <div className="mt-1 border-t border-white/10 pt-1">
              <div className="text-white/30 text-[8px] px-2 mb-0.5">Apps</div>
              <div className="px-2 py-1 rounded text-white font-bold text-[9px]" style={{ backgroundColor: G }}>
                CartSwitcher
              </div>
            </div>
          </div>
          {/* Main panel */}
          <div className="flex-1 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-gray-800">CartSwitcher</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: G }} />
                  <span className="text-[8.5px] font-semibold" style={{ color: GD }}>Released</span>
                </div>
              </div>
              {/* Install app on the right side */}
              <div className="text-[9px] font-bold text-white px-2.5 py-1.5 rounded-lg shadow-sm" style={{ backgroundColor: G }}>
                Install app →
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
              <div className="text-[8.5px] text-gray-500 mb-1">Installing on</div>
              <div className="text-[9px] font-semibold text-gray-700">mystore.myshopify.com</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-[8px] text-blue-700">
              A permissions popup will appear — click "Install" to confirm.
            </div>
          </div>
        </div>
      </Chrome>
    ),
  },
  {
    title: 'Go to Settings — copy Client ID & Secret',
    desc: 'In the Dev Dashboard left panel, click "Settings" under your CartSwitcher app. On the right you\'ll see your Client ID and Client Secret. Copy the Client ID, then click "Reveal" to show and copy the secret. Paste both into the form.',
    note: { type: 'warn', text: 'The Client Secret is shown once. Copy it immediately — if you navigate away, you\'ll need to generate a new one.' },
    visual: (
      <Chrome url="partners.shopify.com/.../apps/cartswitcher/settings">
        <div className="flex" style={{ height: 200 }}>
          {/* Dev dashboard sidebar with Settings highlighted */}
          <div className="w-32 bg-[#1a1a1a] p-2 space-y-0.5 flex-shrink-0 text-[10px]">
            <div className="text-white/30 text-[8px] px-2 mb-1 uppercase tracking-wide">CartSwitcher</div>
            {['Overview','Versions','Extensions'].map((item) => (
              <div key={item} className="px-2 py-1 rounded text-white/35">{item}</div>
            ))}
            <div className="px-2 py-1 rounded text-white font-bold" style={{ backgroundColor: G }}>
              Settings
            </div>
          </div>
          {/* Credentials panel */}
          <div className="flex-1 p-3 space-y-2">
            <div className="text-[10px] font-bold text-gray-800 mb-2">API credentials</div>
            <div>
              <div className="text-[8.5px] text-gray-500 mb-0.5">Client ID</div>
              <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[9px] flex items-center justify-between">
                <span className="font-mono text-gray-700">a1b2c3d4e5f678901234</span>
                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: GD, backgroundColor: GL }}>Copy →</span>
              </div>
            </div>
            <div>
              <div className="text-[8.5px] text-gray-500 mb-0.5">Client Secret</div>
              <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[9px] flex items-center justify-between">
                <span className="font-mono text-gray-400">shpss_••••••••••••••••••••</span>
                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ color: GD, backgroundColor: GL }}>Reveal →</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded px-2 py-1.5">
              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
              <span className="text-[8.5px] text-green-700 font-medium">Paste both into the form — you're done!</span>
            </div>
          </div>
        </div>
      </Chrome>
    ),
  },
]

// ── Animated walkthrough component ───────────────────────────────────────────

function Walkthrough({ step, platform, stepCounts, selectedEntities, initialStep = 0 }: {
  step: 'woocommerce' | 'select' | 'shopify'
  platform?: 'wc' | 'shopify'
  stepCounts?: Record<string, number> | null
  selectedEntities?: MigrationEntities
  initialStep?: number
}) {
  const [activeStep, setActiveStep] = useState(initialStep)
  const steps = platform === 'shopify' ? SHOPIFY_STEPS : WC_STEPS

  if (step === 'select') {
    const counts = stepCounts
    const rows = [
      { key: 'products',  label: 'Products',   icon: '📦' },
      { key: 'customers', label: 'Customers',  icon: '👥' },
      { key: 'orders',    label: 'Orders',     icon: '🧾' },
      { key: 'coupons',   label: 'Coupons',    icon: '🏷️' },
      { key: 'posts',     label: 'Blog posts', icon: '📝' },
    ]
    const selected = selectedEntities ?? ALL_ON
    const selectedTotal = counts
      ? rows.reduce((sum, r) => sum + (selected[r.key as keyof MigrationEntities] ? (counts[r.key] ?? 0) : 0), 0)
      : 26992
    const selectedCount = rows.filter(r => selected[r.key as keyof MigrationEntities]).length

    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GL }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: G }} />
          </div>
          <div>
            <div className="font-black text-gray-900 text-sm leading-tight">Store scanned successfully</div>
            <div className="text-[11px] text-gray-400">Here's what we found in your WooCommerce store</div>
          </div>
        </div>

        {/* Total hero — animates when selection changes */}
        <div className="rounded-2xl p-5 border-2" style={{ borderColor: `${G}40`, backgroundColor: GL }}>
          <div className="flex items-end gap-3">
            <motion.div
              key={selectedTotal}
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="text-[42px] font-black tracking-tight leading-none text-gray-900 tabular-nums"
            >
              {selectedTotal.toLocaleString()}
            </motion.div>
            <div className="pb-1 text-sm font-semibold" style={{ color: GD }}>
              records selected
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: G }} />
              <span className="text-[12px] text-gray-500">Store stays live throughout</span>
            </div>
            <span className="text-[12px] font-bold" style={{ color: GD }}>
              {selectedCount} / {rows.length} types
            </span>
          </div>
        </div>

        {/* Per-type cards — dim deselected */}
        <div className="grid grid-cols-3 gap-2">
          {rows.map((r) => {
            const count = counts?.[r.key] ?? 0
            const on = selected[r.key as keyof MigrationEntities]
            return (
              <motion.div
                key={r.key}
                animate={{ opacity: on ? 1 : 0.35, scale: on ? 1 : 0.97 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl p-3 flex flex-col gap-1.5 border-2 transition-colors"
                style={{
                  borderColor: on ? `${G}50` : '#f3f4f6',
                  backgroundColor: on ? GL : 'white',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base leading-none">{r.icon}</span>
                  {on
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G }} />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  }
                </div>
                <div className="text-[18px] font-black text-gray-900 tabular-nums leading-tight">
                  {count.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 font-medium leading-tight">{r.label}</div>
              </motion.div>
            )
          })}
        </div>

        {/* Trust note */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border"
          style={{ backgroundColor: GL, borderColor: `${G}40` }}>
          <span className="text-sm flex-shrink-0">🔒</span>
          <p className="text-[12px] leading-relaxed" style={{ color: GD }}>
            <span className="font-bold">Zero data loss, guaranteed.</span>{' '}
            Full integrity check after migration — if anything's off, we fix it before you switch over.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Step tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all ${
              i === activeStep ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={i === activeStep ? { backgroundColor: G } : {}}
          >
            Step {i + 1}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4"
        >
          {/* Visual */}
          {steps[activeStep].visual}

          {/* Step indicator + title */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5"
              style={{ backgroundColor: G }}>
              {activeStep + 1}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-[15px] leading-snug">{steps[activeStep].title}</div>
              <p className="text-gray-500 text-[13px] leading-relaxed mt-1">{steps[activeStep].desc}</p>
            </div>
          </div>

          {/* Note */}
          {(steps[activeStep] as any).note && (() => {
            const note = (steps[activeStep] as any).note as { type: string; text: string }
            const styles = {
              tip:  { bg: GL,          border: `${G}50`,   icon: '💡', text: GD },
              info: { bg: '#eff6ff',   border: '#bfdbfe',  icon: 'ℹ️',  text: '#1d4ed8' },
              warn: { bg: '#fffbeb',   border: '#fcd34d',  icon: '⚠️',  text: '#92400e' },
            }[note.type] ?? { bg: '#f9fafb', border: '#e5e7eb', icon: 'ℹ️', text: '#374151' }
            return (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 border text-[12px] leading-relaxed"
                style={{ backgroundColor: styles.bg, borderColor: styles.border, color: styles.text }}>
                <span className="flex-shrink-0">{styles.icon}</span>
                <span>{note.text}</span>
              </div>
            )
          })()}

          {/* Next / prev */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <button
              onClick={() => setActiveStep(i => Math.max(0, i - 1))}
              disabled={activeStep === 0}
              className="text-xs text-gray-400 disabled:opacity-30 hover:text-gray-700 transition-colors font-medium flex items-center gap-1"
            >
              ← Previous
            </button>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: i === activeStep ? G : '#e5e7eb' }} />
              ))}
            </div>
            <button
              onClick={() => setActiveStep(i => Math.min(steps.length - 1, i + 1))}
              disabled={activeStep === steps.length - 1}
              className="text-xs font-bold disabled:opacity-30 hover:opacity-80 transition-colors flex items-center gap-1"
              style={{ color: G }}
            >
              Next →
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

function ConnectForm() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const errorParam = searchParams.get('error')

  const stepParam = searchParams.get('step') as 'woocommerce' | 'select' | 'shopify' | null
  const [step, setStep] = useState<'woocommerce' | 'select' | 'shopify'>(
    (isDemo && stepParam) ? stepParam : 'woocommerce'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorParam ? `Error: ${errorParam}` : '')

  const DEMO_COUNTS = { products: 2847, customers: 14203, orders: 9541, coupons: 312, posts: 89 }

  const [wc, setWc] = useState({
    url: isDemo ? 'demo-store.example.com' : '',
    consumerKey: isDemo ? 'ck_demo_xxxxxxxxxxxx' : '',
    consumerSecret: isDemo ? 'cs_demo_xxxxxxxxxxxx' : '',
  })
  const [shopDomain, setShopDomain] = useState(isDemo ? 'demo-store.myshopify.com' : '')
  const [shopifyClientId, setShopifyClientId] = useState(isDemo ? 'demo_client_id_12345' : '')
  const [shopifyClientSecret, setShopifyClientSecret] = useState(isDemo ? 'shpss_demo_secret_xxxxx' : '')
  const [counts, setCounts] = useState<Record<string, number> | null>(isDemo ? DEMO_COUNTS : null)
  const [entities, setEntities] = useState<MigrationEntities>(ALL_ON)

  const toggleEntity = (key: keyof MigrationEntities) => {
    setEntities(prev => {
      const next = { ...prev, [key]: !prev[key] }
      return Object.values(next).some(Boolean) ? next : prev
    })
  }

  async function validateWC() {
    if (isDemo) {
      setLoading(true)
      await new Promise(r => setTimeout(r, 800))
      setCounts(DEMO_COUNTS)
      setStep('select')
      setLoading(false)
      return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/connections/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'woocommerce', ...wc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCounts(data.counts)
      setStep('select')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally { setLoading(false) }
  }

  async function connectShopify() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/jobs/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopifyDomain: shopDomain, shopifyClientId, shopifyClientSecret,
          wcUrl: wc.url, wcKey: wc.consumerKey, wcSecret: wc.consumerSecret,
          isDemo, entities,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      globalThis.location.href = `/migrate/progress/${data.jobId}`
    } catch (e: unknown) {
      if (isDemo) {
        globalThis.location.href = `/migrate/progress/demo-preview`
        return
      }
      setError(e instanceof Error ? e.message : 'Failed to connect Shopify')
      setLoading(false)
    }
  }

  const STEPS = [
    { id: 'woocommerce', label: 'WooCommerce' },
    { id: 'select',      label: 'Select data' },
    { id: 'shopify',     label: 'Shopify' },
  ]
  const stepIndex = STEPS.findIndex(s => s.id === step)

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">

      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <a href="/" className="font-black text-xl tracking-tight">
          Cart<span style={{ color: G }}>Switcher</span>
        </a>
        <div className="flex items-center gap-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                i < stepIndex ? 'text-white' : i === stepIndex ? 'text-white' : 'bg-gray-100 text-gray-400'
              }`} style={i <= stepIndex ? { backgroundColor: G } : {}}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-semibold hidden sm:block ${i === stepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-1 hidden sm:block" />}
            </div>
          ))}
        </div>
        {isDemo && (
          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
            Demo mode
          </span>
        )}
      </nav>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1200px] w-full mx-auto px-6 py-8 gap-6 items-stretch">

        {/* Left: Form */}
        <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex-1"
            >

              {/* ── STEP 1: WooCommerce ── */}
              {step === 'woocommerce' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-gray-900 mb-1">Connect WooCommerce</h2>
                    <p className="text-gray-500 text-sm">We need read-only access to export your store data.</p>
                  </div>

                  <Field label="Store URL" placeholder="yourstore.com" value={wc.url}
                    onChange={v => setWc(p => ({ ...p, url: v }))} />
                  <Field label="Consumer Key" placeholder="ck_xxxxxxxxxxxxxxxx" value={wc.consumerKey}
                    onChange={v => setWc(p => ({ ...p, consumerKey: v }))} />
                  <Field label="Consumer Secret" placeholder="cs_xxxxxxxxxxxxxxxx" value={wc.consumerSecret}
                    onChange={v => setWc(p => ({ ...p, consumerSecret: v }))} type="password" />

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Read-only access only. We never write to your WooCommerce store.
                      {' '}<a href="https://woocommerce.com/document/woocommerce-rest-api/" target="_blank" rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-gray-700 inline-flex items-center gap-0.5">
                        API docs <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={validateWC}
                    disabled={loading || !wc.url || !wc.consumerKey || !wc.consumerSecret}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-40 transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: G }}
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Connecting...</>
                    ) : (
                      <>Connect WooCommerce <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              )}

              {/* ── STEP 2: Select ── */}
              {step === 'select' && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: GL }}>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: G }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: GD }}>WooCommerce connected</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-gray-900 mb-1">What to migrate?</h2>
                    <p className="text-gray-500 text-sm">Select the data types to copy to Shopify.</p>
                  </div>

                  <div className="space-y-2">
                    {ENTITY_DEFS.map(({ key, label, icon, description }) => {
                      const count = counts?.[key] ?? 0
                      const on = entities[key]
                      return (
                        <button key={key} onClick={() => toggleEntity(key)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all"
                          style={{
                            borderColor: on ? G : '#e5e7eb',
                            backgroundColor: on ? GL : 'white',
                          }}>
                          <span className="text-lg flex-shrink-0">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900">{label}</div>
                            <div className="text-xs text-gray-400">{description}</div>
                          </div>
                          {count > 0 && (
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-gray-700">{count.toLocaleString()}</div>
                              <div className="text-xs text-gray-400">found</div>
                            </div>
                          )}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors`}
                            style={{ borderColor: on ? G : '#d1d5db', backgroundColor: on ? G : 'white' }}>
                            {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setStep('shopify')}
                    disabled={!Object.values(entities).some(Boolean)}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-40 transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: G }}
                  >
                    Continue to Shopify <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── STEP 3: Shopify ── */}
              {step === 'shopify' && (
                <div className="space-y-5">
                  <div>
                    <button onClick={() => setStep('select')} className="text-xs text-gray-400 hover:text-gray-700 transition-colors mb-3 flex items-center gap-1">
                      ← Back
                    </button>
                    <h2 className="text-xl font-black tracking-tight text-gray-900 mb-1">Connect Shopify</h2>
                    <p className="text-gray-500 text-sm">We need write access to import your data.</p>
                  </div>

                  {/* Selected entities summary */}
                  <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {ENTITY_DEFS.filter(e => entities[e.key]).map(e => (
                      <span key={e.key} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 text-gray-600 font-medium">
                        {e.icon} {e.label}
                      </span>
                    ))}
                  </div>

                  <Field label="Store domain" placeholder="mystore.myshopify.com" value={shopDomain} onChange={setShopDomain} />
                  <Field label="Client ID (API Key)" placeholder="abc123..." value={shopifyClientId} onChange={setShopifyClientId} />
                  <Field label="Client Secret (API Secret Key)" placeholder="shpss_..." value={shopifyClientSecret}
                    onChange={setShopifyClientSecret} type="password" />

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Follow the guide on the right to create a custom app in your Shopify admin and get these credentials.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={connectShopify}
                    disabled={loading || !shopDomain || !shopifyClientId || !shopifyClientSecret}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-40 transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: G }}
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Starting migration...</>
                    ) : (
                      <>Start Migration <Zap className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Animated walkthrough */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col flex-1">
            <div className="mb-5">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-1" style={{ color: G }}>
                {step === 'select' ? 'Migration summary' : step === 'shopify' ? 'Shopify setup guide' : 'WooCommerce setup guide'}
              </div>
              <h3 className="text-lg font-black tracking-tight text-gray-900">
                {step === 'select' ? 'Your data, ready to go' : step === 'shopify' ? 'Get your Shopify credentials' : 'Get your WooCommerce API keys'}
              </h3>
            </div>
            <Walkthrough step={step} platform={step === 'shopify' ? 'shopify' : 'wc'} stepCounts={counts}
              selectedEntities={entities}
              initialStep={Number(searchParams.get('substep') ?? 0)} />
            {/* Bottom trust strip */}
            <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span>🔒</span> End-to-end encrypted
              </span>
              <span className="flex items-center gap-1.5">
                <span>🇪🇺</span> GDPR compliant
              </span>
              <span className="flex items-center gap-1.5">
                <span>✓</span> No data stored after migration
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    }>
      <ConnectForm />
    </Suspense>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text' }: Readonly<{
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string
}>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
        style={{ '--tw-ring-color': G } as React.CSSProperties}
      />
    </div>
  )
}
