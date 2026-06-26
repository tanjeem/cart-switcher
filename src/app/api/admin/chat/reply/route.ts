import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

const ADMIN_EMAIL = 'contactscratchboard@gmail.com'

async function verifyAdmin(userId: string) {
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return user.emailAddresses[0]?.emailAddress === ADMIN_EMAIL
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId: targetUserId, body } = await req.json() as { userId: string; body: string }
  if (!targetUserId || !body?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const msg = await db.chatMessage.create({
    data: { userId: targetUserId, body: body.trim(), fromAdmin: true, read: true },
    select: { id: true, body: true, fromAdmin: true, createdAt: true },
  })

  return NextResponse.json(msg)
}
