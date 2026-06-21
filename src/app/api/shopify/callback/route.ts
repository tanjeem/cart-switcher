import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const hmac = searchParams.get('hmac')

    if (!code || !shop || !state || !hmac) {
      return NextResponse.redirect(`${APP_URL}/migrate/connect?error=missing_params`)
    }

    // Verify HMAC to confirm request is from Shopify
    const params = Object.fromEntries(searchParams.entries())
    delete params.hmac
    const message = Object.keys(params).sort((a, b) => a.localeCompare(b)).map(k => `${k}=${params[k]}`).join('&')
    const digest = crypto.createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!).update(message).digest('hex')

    if (digest !== hmac) {
      return NextResponse.redirect(`${APP_URL}/migrate/connect?error=invalid_hmac`)
    }

    // Read WC credentials from cookie
    const cookieStore = await cookies()
    const oauthCookie = cookieStore.get('shopify_oauth')
    if (!oauthCookie?.value) {
      return NextResponse.redirect(`${APP_URL}/migrate/connect?error=session_expired`)
    }

    let savedState: string, wcUrl: string, wcKey: string, wcSecret: string, isDemo: boolean, entities: Record<string, boolean> | undefined
    try {
      ({ state: savedState, wcUrl, wcKey, wcSecret, isDemo, entities } = JSON.parse(oauthCookie.value))
    } catch {
      return NextResponse.redirect(`${APP_URL}/migrate/connect?error=session_corrupt`)
    }

    if (state !== savedState) {
      return NextResponse.redirect(`${APP_URL}/migrate/connect?error=state_mismatch`)
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

    let accessToken: string | undefined
    try {
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
    } catch {
      return NextResponse.redirect(`${APP_URL}/migrate/connect?error=token_parse_failed`)
    }

    if (!accessToken) {
      return NextResponse.redirect(`${APP_URL}/migrate/connect?error=token_failed`)
    }

    // Clear OAuth cookie
    cookieStore.delete('shopify_oauth')

    // Create a unique guest user per migration
    const guestId = crypto.randomBytes(12).toString('hex')
    const guest = await db.user.create({
      data: {
        clerkId: `guest_${guestId}`,
        email: `guest_${guestId}@cartswitcher.internal`,
      },
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
      data: { jobId: job.id, entities },
    })

    return NextResponse.redirect(`${APP_URL}/migrate/progress/${job.id}`)
  } catch (err) {
    console.error('[shopify/callback] unhandled error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.redirect(`${APP_URL}/migrate/connect?error=${encodeURIComponent(msg)}`)
  }
}
