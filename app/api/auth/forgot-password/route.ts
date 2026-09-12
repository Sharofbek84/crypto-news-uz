import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { createPasswordResetToken } from '@/lib/password-reset'
import { findUserByEmail } from '@/lib/users'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '')
      .toLowerCase()
      .trim()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email noto‘g‘ri.' }, { status: 400 })
    }

    // Xavfsizlik: email topilmasa ham bir xil javob
    const generic = {
      ok: true,
      message:
        'Agar bu email ro‘yxatdan o‘tgan bo‘lsa, parol tiklash havolasi yuborildi. Pochtani tekshiring.',
    }

    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json(generic)
    }

    const token = await createPasswordResetToken(email)
    if (!token) {
      return NextResponse.json({ error: 'Server sozlanmagan (Redis).' }, { status: 500 })
    }

    const base = process.env.NEXTAUTH_URL || 'https://goldenweb.uz'
    const link = `${base.replace(/\/$/, '')}/reset-password?token=${token}`

    const sent = await sendEmail({
      to: email,
      subject: 'GOLDENWEB.UZ — parolni tiklash',
      text: `Parolni tiklash uchun havola (1 soat amal qiladi):\n${link}\n\nAgar so‘rovni siz yubormagan bo‘lsangiz, bu xabarni e’tiborsiz qoldiring.`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;line-height:1.5;color:#111">
          <h2 style="margin:0 0 12px">Parolni tiklash</h2>
          <p>GOLDENWEB.UZ hisobingiz uchun parolni yangilash so‘rovi keldi.</p>
          <p><a href="${link}" style="display:inline-block;background:#f0b90b;color:#0b0f14;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">Yangi parol belgilash</a></p>
          <p style="font-size:13px;color:#555">Havola 1 soat amal qiladi. Agar so‘rovni siz yubormagan bo‘lsangiz, xabarni e’tiborsiz qoldiring.</p>
          <p style="font-size:12px;color:#888;word-break:break-all">${link}</p>
        </div>
      `,
    })

    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 503 })
    }

    return NextResponse.json(generic)
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 })
  }
}
