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

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await db.user.findMany({
    where: { chatMessages: { some: {} } },
    include: {
      chatMessages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { body: true, fromAdmin: true, read: true, createdAt: true },
      },
    },
  })

  const threads = users.map(u => ({
    userId: u.id,
    email: u.email,
    plan: u.plan,
    unread: u.chatMessages.filter(m => !m.fromAdmin && !m.read).length,
    lastMessage: u.chatMessages[0]?.body ?? '',
    lastAt: u.chatMessages[0]?.createdAt ?? u.createdAt,
  })).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

  return NextResponse.json(threads)
}
