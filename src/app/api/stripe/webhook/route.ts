import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import type { Plan } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const plan = session.metadata?.plan as Plan | undefined

    if (userId && plan) {
      await db.user.update({
        where: { id: userId },
        data: { plan, planActivatedAt: new Date(), stripeSessionId: session.id },
      })
    }
  }

  return NextResponse.json({ received: true })
}
