import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin'
import { authOptions } from '@/lib/auth'
import { activatePremium } from '@/lib/users'

const ALLOWED_DAYS = new Set([30, 180, 365])

/** Admin: foydalanuvchi Premiumini 1 / 6 / 12 oyga yoqish */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 })
  }

  let body: { email?: string; days?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 })
  }

  const email = String(body.email || '')
    .toLowerCase()
    .trim()
  const days = Number(body.days)

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email kerak' }, { status: 400 })
  }
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: 'Faqat 30, 180 yoki 365 kun' }, { status: 400 })
  }

  const user = await activatePremium(email, days)
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    user,
    message: `Premium ${days} kunga faollashtirildi`,
  })
}
