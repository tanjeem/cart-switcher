import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json([])

  const messages = await db.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, body: true, fromAdmin: true, createdAt: true },
  })

  return NextResponse.json(messages)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json() as { body: string }
  if (!body?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  let user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) {
    user = await db.user.create({ data: { clerkId: userId, email: `${userId}@pending.cartswitcher.com` } })
  }

  const msg = await db.chatMessage.create({
    data: { userId: user.id, body: body.trim(), fromAdmin: false },
    select: { id: true, body: true, fromAdmin: true, createdAt: true },
  })

  return NextResponse.json(msg)
}
