import { NextResponse } from 'next/server'

/** Bekor qilish Stripe Customer Portal orqali */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Obunani Stripe portal orqali boshqaring.',
      use: '/api/stripe/portal',
    },
    { status: 410 }
  )
}
