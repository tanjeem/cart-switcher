import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CartSwitcher — WooCommerce to Shopify Migration'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0f0f0f',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        padding: '80px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: '#96bf48',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
          }}>🛒</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: '-2px' }}>
            Cart<span style={{ color: '#96bf48' }}>Switcher</span>
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: 'white', textAlign: 'center', marginBottom: 24, lineHeight: 1.2 }}>
          Migrate WooCommerce to Shopify
        </div>
        <div style={{ fontSize: 22, color: '#9ca3af', textAlign: 'center', marginBottom: 48 }}>
          Products · Orders · Customers · Coupons · Blog Posts
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['From $79 one-time', 'Under 1 hour', '7-day refund'].map(t => (
            <div key={t} style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 12,
              padding: '12px 24px',
              color: '#96bf48',
              fontSize: 18,
              fontWeight: 700,
            }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
