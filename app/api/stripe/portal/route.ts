import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getAppUrl, getStripe } from '@/lib/stripe'
import { findUserByEmail } from '@/lib/users'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 })
    }

    const user = await findUserByEmail(session.user.email)
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe mijoz topilmadi. Avval Premium ga obuna bo‘ling.' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppUrl()}/kabinet`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe portal xatosi'
    console.error('portal error', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
