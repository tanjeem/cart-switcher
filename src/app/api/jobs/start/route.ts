import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { wcUrl, wcKey, wcSecret, shopifyDomain, shopifyClientId, shopifyClientSecret, isDemo, entities } = body

    if (!wcUrl || !wcKey || !wcSecret || !shopifyDomain || !shopifyClientId || !shopifyClientSecret) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const cleanDomain = shopifyDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const shopDomain = cleanDomain.includes('.') ? cleanDomain : `${cleanDomain}.myshopify.com`

    // Exchange Client ID and Client Secret for Access Token using Client Credentials flow
    const tokenRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: shopifyClientId,
        client_secret: shopifyClientSecret,
        grant_type: 'client_credentials'
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({ error: `Failed to authenticate with Shopify: ${tokenData.error_description || tokenData.error || 'Invalid Client ID or Secret'}` }, { status: 400 })
    }

    const shopifyAccessToken = tokenData.access_token

    // Quick validate the Shopify token before creating the job
    const checkRes = await fetch(`https://${shopDomain}/admin/api/2024-10/shop.json`, {
      headers: { 'X-Shopify-Access-Token': shopifyAccessToken },
    })

    if (checkRes.status === 401) {
      return NextResponse.json({ error: 'Shopify returned an invalid token' }, { status: 400 })
    }
    if (checkRes.status === 403) {
      return NextResponse.json({ error: 'Shopify token missing required scopes' }, { status: 400 })
    }
    if (!checkRes.ok) {
      return NextResponse.json({ error: `Could not reach Shopify store (${checkRes.status})` }, { status: 400 })
    }

    // Link to signed-in user if available, otherwise create guest
    const { userId: clerkUserId } = await auth()
    let dbUserId: string

    if (clerkUserId) {
      const existing = await db.user.findUnique({ where: { clerkId: clerkUserId } })
      if (existing) {
        dbUserId = existing.id
      } else {
        // First migration — create the user row
        const { clerkClient } = await import('@clerk/nextjs/server')
        const client = await clerkClient()
        const clerkUser = await client.users.getUser(clerkUserId)
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@pending.cartswitcher.com`
        const created = await db.user.create({ data: { clerkId: clerkUserId, email } })
        dbUserId = created.id
      }
    } else {
      const guestId = crypto.randomBytes(12).toString('hex')
      const guest = await db.user.create({
        data: {
          clerkId: `guest_${guestId}`,
          email: `guest_${guestId}@cartswitcher.internal`,
        },
      })
      dbUserId = guest.id
    }

    const job = await db.migrationJob.create({
      data: {
        userId: dbUserId,
        wcUrl,
        wcKey,
        wcSecret,
        shopifyDomain: shopDomain,
        shopifyClientId,
        shopifyClientSecret,
        shopifyAccessToken,
        isDemo: isDemo ?? false,
        status: 'PENDING',
      },
    })

    await inngest.send({
      name: 'migration/start',
      data: { jobId: job.id, ...(entities ? { entities } : {}) },
    })

    return NextResponse.json({ jobId: job.id })
  } catch (err) {
    console.error('[jobs/start]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
