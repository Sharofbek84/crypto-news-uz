import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as typeof session.user & {
    id?: string
    premium?: boolean
    subscriptionStatus?: string
    subscriptionEndsAt?: string | null
    plan?: string
    createdAt?: string
  }

  // Profile and subscription claims are already included in the JWT session,
  // so the cabinet does not need a second Redis read for the same request.
  const endsAt = user.subscriptionEndsAt || null
  const premium =
    Boolean(user.premium) &&
    user.subscriptionStatus === 'active' &&
    (!endsAt || new Date(endsAt).getTime() > Date.now())

  return NextResponse.json({
    user: {
      id: user.id || '',
      email: user.email || '',
      name: user.name || '',
      plan: user.plan || 'free',
      subscriptionStatus: user.subscriptionStatus || 'none',
      subscriptionEndsAt: endsAt,
      createdAt: user.createdAt || '',
    },
    premium,
  })
}
