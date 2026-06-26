import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

const ADMIN_EMAIL = 'tanjeem.adeeb@gmail.com'

async function verifyAdmin(userId: string) {
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.emailAddresses[0]?.emailAddress === ADMIN_EMAIL
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  if (!targetUserId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const messages = await db.chatMessage.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, body: true, fromAdmin: true, createdAt: true },
  })

  // Mark user messages as read
  await db.chatMessage.updateMany({
    where: { userId: targetUserId, fromAdmin: false, read: false },
    data: { read: true },
  })

  return NextResponse.json(messages)
}
