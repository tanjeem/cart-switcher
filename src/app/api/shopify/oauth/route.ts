import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SCOPES = [
  'write_products', 'read_products',
  'write_customers', 'read_customers',
  'write_orders', 'read_orders',
  'write_price_rules', 'read_price_rules',
  'write_discounts', 'read_discounts',
  'write_content', 'read_content',
].join(',')

export async function POST(req: Request) {
  const body = await req.json()
  const { shop, wcUrl, wcKey, wcSecret, isDemo } = body

  if (!shop) return NextResponse.json({ error: 'Shop domain required' }, { status: 400 })

  const cleanShop = shop.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const shopDomain = cleanShop.includes('.') ? cleanShop : `${cleanShop}.myshopify.com`

  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`

  // Store WC credentials + state in a cookie to survive the OAuth redirect
  const cookieStore = await cookies()
  cookieStore.set('shopify_oauth', JSON.stringify({ state, wcUrl, wcKey, wcSecret, isDemo }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // grant_options[]=per-user forces the permissions screen even if the app
  // was previously installed, ensuring we always get a fresh token with all scopes
  const authUrl = `https://${shopDomain}/admin/oauth/authorize?` + new URLSearchParams({
    client_id: process.env.SHOPIFY_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'per-user',
  })

  return NextResponse.json({ authUrl })
}
