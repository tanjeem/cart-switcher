import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')
  const hmac = searchParams.get('hmac')

  if (!code || !shop || !state || !hmac) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/migrate/connect?error=missing_params`)
  }

  // Verify HMAC to confirm request is from Shopify
  const params = Object.fromEntries(searchParams.entries())
  delete params.hmac
  const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  const digest = crypto.createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!).update(message).digest('hex')

  if (digest !== hmac) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/migrate/connect?error=invalid_hmac`)
  }

  // Read WC credentials from cookie
  const cookieStore = await cookies()
  const oauthCookie = cookieStore.get('shopify_oauth')
  if (!oauthCookie) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/migrate/connect?error=session_expired`)
  }

  const { state: savedState, wcUrl, wcKey, wcSecret, isDemo } = JSON.parse(oauthCookie.value)

  if (state !== savedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/migrate/connect?error=state_mismatch`)
  }

  // Exchange code for permanent access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  })

  const tokenData = await tokenRes.json()
  const accessToken: string = tokenData.access_token

  if (!accessToken) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/migrate/connect?error=token_failed`)
  }

  // Clear OAuth cookie
  cookieStore.delete('shopify_oauth')

  // Create guest user and migration job
  const guest = await db.user.create({
    data: { clerkId: `guest_${Date.now()}`, email: '' },
  })

  const job = await db.migrationJob.create({
    data: {
      userId: guest.id,
      wcUrl,
      wcKey,
      wcSecret,
      shopifyDomain: shop,
      shopifyAccessToken: accessToken,
      isDemo: isDemo ?? false,
      status: 'PENDING',
    },
  })

  await inngest.send({
    name: 'migration/start',
    data: { jobId: job.id },
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/migrate/progress/${job.id}`)
}
