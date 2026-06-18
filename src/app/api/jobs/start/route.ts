import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { wcUrl, wcKey, wcSecret, shopifyDomain, shopifyAccessToken, isDemo } = body

    if (!wcUrl || !wcKey || !wcSecret || !shopifyDomain || !shopifyAccessToken) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Quick validate the Shopify token before creating the job
    const cleanDomain = shopifyDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const shopDomain = cleanDomain.includes('.') ? cleanDomain : `${cleanDomain}.myshopify.com`

    const checkRes = await fetch(`https://${shopDomain}/admin/api/2024-10/shop.json`, {
      headers: { 'X-Shopify-Access-Token': shopifyAccessToken },
    })

    if (checkRes.status === 401) {
      return NextResponse.json({ error: 'Invalid Shopify access token' }, { status: 400 })
    }
    if (checkRes.status === 403) {
      return NextResponse.json({ error: 'Shopify token missing required scopes — make sure you enabled read & write for Products, Customers, Orders, Price rules, Discounts, and Content' }, { status: 400 })
    }
    if (!checkRes.ok) {
      return NextResponse.json({ error: `Could not reach Shopify store (${checkRes.status})` }, { status: 400 })
    }

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
        shopifyDomain: shopDomain,
        shopifyAccessToken,
        isDemo: isDemo ?? false,
        status: 'PENDING',
      },
    })

    await inngest.send({
      name: 'migration/start',
      data: { jobId: job.id },
    })

    return NextResponse.json({ jobId: job.id })
  } catch (err) {
    console.error('[jobs/start]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
