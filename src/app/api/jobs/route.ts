import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/inngest/client'

export async function POST(req: Request) {
  const { userId } = await auth()
  const body = await req.json()
  const { wcUrl, wcKey, wcSecret, shopifyDomain, shopifyAccessToken, isDemo, entities } = body

  // Get or create user — works with or without auth
  let dbUserId: string

  if (userId) {
    let user = await db.user.findUnique({ where: { clerkId: userId } })
    if (!user) {
      const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      }).then(r => r.json())

      user = await db.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.email_addresses?.[0]?.email_address ?? '',
        },
      })
    }
    dbUserId = user.id
  } else {
    // Anonymous guest — create a placeholder user
    const guest = await db.user.create({
      data: { clerkId: `guest_${Date.now()}`, email: '' },
    })
    dbUserId = guest.id
  }

  const job = await db.migrationJob.create({
    data: {
      userId: dbUserId,
      wcUrl,
      wcKey,
      wcSecret,
      shopifyDomain,
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
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ jobs: [] })

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ jobs: [] })

  const jobs = await db.migrationJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      isDemo: true,
      shopifyDomain: true,
      wcUrl: true,
      totalProducts: true,
      doneProducts: true,
      totalOrders: true,
      doneOrders: true,
      totalCustomers: true,
      doneCustomers: true,
      createdAt: true,
      completedAt: true,
    },
  })

  return NextResponse.json({ jobs })
}
