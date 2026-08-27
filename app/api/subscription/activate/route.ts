import { NextResponse } from 'next/server'

/** Demo yo‘li o‘chirilgan — Stripe Checkout ishlating */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Demo obuna o‘chirilgan. Kabinetdan Stripe orqali to‘lov qiling.',
      use: '/api/stripe/checkout',
    },
    { status: 410 }
  )
}
