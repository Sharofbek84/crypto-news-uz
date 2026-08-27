import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { activatePremium } from '@/lib/users'

/** Demo obuna: 30 kun Premium (to‘lov tizimi keyin ulanadi) */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 })
  }

  const user = await activatePremium(session.user.email, 30)
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    user,
    message: 'Premium 30 kunga faollashtirildi (demo).',
  })
}
