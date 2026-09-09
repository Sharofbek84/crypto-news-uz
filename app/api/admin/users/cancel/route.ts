import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin'
import { authOptions } from '@/lib/auth'
import { cancelPremium } from '@/lib/users'

/** Admin: foydalanuvchi Premiumini bekor qilish */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 })
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 })
  }

  const email = String(body.email || '')
    .toLowerCase()
    .trim()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email kerak' }, { status: 400 })
  }

  const user = await cancelPremium(email)
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    user,
    message: `Premium bekor qilindi: ${email}`,
  })
}
