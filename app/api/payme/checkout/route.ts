import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { buildPaymeCheckoutUrl, createPremiumOrder, getPaymeCredentials } from '@/lib/payme'

export const dynamic = 'force-dynamic'

/** Login qilgan foydalanuvchi uchun Payme to‘lov URL yaratish */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 })
  }

  const { id, key } = getPaymeCredentials()
  if (!id || !key) {
    return NextResponse.json(
      { error: 'Payme hali sozlanmagan (PAYME_MERCHANT_ID / PAYME_MERCHANT_KEY)' },
      { status: 503 }
    )
  }

  try {
    const { orderId, amountTiyin } = await createPremiumOrder(session.user.email)
    const url = buildPaymeCheckoutUrl(orderId, amountTiyin)
    return NextResponse.json({ ok: true, orderId, amountTiyin, url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Xato' }, { status: 400 })
  }
}
