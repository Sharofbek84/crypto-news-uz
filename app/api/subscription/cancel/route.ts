import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { cancelPremium } from '@/lib/users'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 })
  }

  const user = await cancelPremium(session.user.email)
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, user, message: 'Premium obuna bekor qilindi.' })
}
