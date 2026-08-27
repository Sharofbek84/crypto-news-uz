import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { applyStripeSubscription, findUserByEmail, setStripeCustomerId } from '@/lib/users'

export const runtime = 'nodejs'

async function handleSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const email =
    (sub.metadata?.email as string) ||
    (typeof sub.customer !== 'string' && 'email' in sub.customer
      ? (sub.customer as Stripe.Customer).email || undefined
      : undefined)

  await applyStripeSubscription({
    email: email || undefined,
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
  })
}

export async function POST(req: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET yo‘q' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('webhook signature', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const email =
          session.metadata?.email ||
          session.customer_details?.email ||
          session.customer_email ||
          undefined
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id

        if (email && customerId) {
          await setStripeCustomerId(email, customerId)
        }

        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await handleSubscription(sub)

          // email metadata yo‘q bo‘lsa customer orqali
          if (email) {
            const user = await findUserByEmail(email)
            if (user && customerId) {
              user.stripeCustomerId = customerId
              user.stripeSubscriptionId = subId
            }
          }
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscription(sub)
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await handleSubscription(sub)
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('webhook handler', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
