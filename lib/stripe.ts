import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY sozlanmagan')
  }
  if (!stripe) {
    stripe = new Stripe(key, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    })
  }
  return stripe
}

export function getStripePriceId(): string {
  const id = process.env.STRIPE_PRICE_ID
  if (!id) throw new Error('STRIPE_PRICE_ID sozlanmagan')
  return id
}

export function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://goldenweb.vercel.app'
}
