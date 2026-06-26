import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { PLANS, type PlanKey } from '@/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json() as { plan: PlanKey }
  const planConfig = PLANS[plan]
  if (!planConfig) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  // Ensure user row exists
  let user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) {
    user = await db.user.create({ data: { clerkId: userId, email: `${userId}@pending.cartswitcher.com` } })
  }

  // Create or reuse Stripe customer
  let customerId = user.stripeCustomerId ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { clerkId: userId, userId: user.id } })
    customerId = customer.id
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: planConfig.price * 100,
        product_data: {
          name: `CartSwitcher ${planConfig.name}`,
          description: planConfig.features.slice(0, 3).join(' · '),
        },
      },
      quantity: 1,
    }],
    metadata: { userId: user.id, plan },
    success_url: `${APP_URL}/dashboard?welcome=1&plan=${plan}`,
    cancel_url: `${APP_URL}/checkout?plan=${plan.toLowerCase()}&cancelled=1`,
  })

  await db.user.update({ where: { id: user.id }, data: { stripeSessionId: session.id } })

  return NextResponse.json({ url: session.url })
}
