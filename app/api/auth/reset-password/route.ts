import { NextResponse } from 'next/server'
import { consumePasswordResetToken } from '@/lib/password-reset'
import { updatePassword } from '@/lib/users'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = String(body.token || '').trim()
    const password = String(body.password || '')
    const passwordConfirm = String(body.passwordConfirm || '')

    if (!token) {
      return NextResponse.json({ error: 'Token yo‘q yoki eskirgan.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Parol kamida 6 ta belgidan iborat bo‘lsin.' },
        { status: 400 }
      )
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: 'Parollar mos kelmadi.' }, { status: 400 })
    }

    const email = await consumePasswordResetToken(token)
    if (!email) {
      return NextResponse.json(
        { error: 'Havola eskirgan yoki noto‘g‘ri. Qayta so‘rov yuboring.' },
        { status: 400 }
      )
    }

    const result = await updatePassword(email, password)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Parol yangilandi. Endi yangi parol bilan kiring.',
    })
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 })
  }
}
