export const PLANS = {
  STARTER: {
    name: 'Starter',
    price: 79,
    priceId: process.env.STRIPE_PRICE_STARTER ?? 'price_starter',
    maxProducts: 2000,
    maxOrders: 5000,
    features: ['Up to 2,000 Products', 'Up to 5,000 Orders', 'Unlimited Customers', 'Coupons & Blog Posts', 'Auto SEO redirect map', 'Email support', '7-day money-back'],
  },
  GROWTH: {
    name: 'Growth',
    price: 149,
    priceId: process.env.STRIPE_PRICE_GROWTH ?? 'price_growth',
    maxProducts: 15000,
    maxOrders: 50000,
    features: ['Up to 15,000 Products', 'Up to 50,000 Orders', 'Unlimited Customers', 'Coupons & Blog Posts', 'Auto SEO redirect map', 'Priority support', 'White-glove onboarding call', '7-day money-back'],
  },
  PRO: {
    name: 'Pro',
    price: 249,
    priceId: process.env.STRIPE_PRICE_PRO ?? 'price_pro',
    maxProducts: Infinity,
    maxOrders: Infinity,
    features: ['Unlimited Products', 'Unlimited Orders', 'Unlimited Customers', 'Coupons & Blog Posts', 'Auto SEO redirect map', 'Priority support + SLA', 'White-glove onboarding', 'Re-migration included', '7-day money-back'],
  },
} as const

export type PlanKey = keyof typeof PLANS

export function getPlanLimits(plan: string) {
  return PLANS[plan as PlanKey] ?? null
}

export function canStartMigration(plan: string) {
  return plan !== 'FREE'
}
