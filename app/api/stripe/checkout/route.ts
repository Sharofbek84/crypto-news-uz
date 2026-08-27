import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getAppUrl, getStripe, getStripePriceId } from '@/lib/stripe'
import { findUserByEmail, setStripeCustomerId } from '@/lib/users'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 })
    }

    const email = session.user.email
    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })
    }

    const stripe = getStripe()
    const priceId = getStripePriceId()
    const appUrl = getAppUrl()

    let customerId = user.stripeCustomerId || undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: user.name,
        metadata: { appUserId: user.id },
      })
      customerId = customer.id
      await setStripeCustomerId(email, customerId)
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/kabinet?checkout=success`,
      cancel_url: `${appUrl}/kabinet?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { email, userId: user.id },
      subscription_data: {
        metadata: { email, userId: user.id },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: checkout.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe xatosi'
    console.error('checkout error', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
