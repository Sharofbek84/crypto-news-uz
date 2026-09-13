/** Resend orqali email yuborish (RESEND_API_KEY kerak) */

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      error:
        'Email xizmati sozlanmagan. Vercelga RESEND_API_KEY qo‘shing (resend.com).',
    }
  }

  const from =
    process.env.EMAIL_FROM || 'GOLDENWEB.UZ <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[email]', res.status, body)

      // Resend cheklovlari: test rejimida faqat o‘z emailingizga yuborish mumkin
      if (body.includes('only send testing emails to your own') || body.includes('verify a domain')) {
        return {
          ok: false,
          error:
            'Resend test rejimi: faqat Resend akkauntingizdagi emailga yuboradi. goldenweb.uz domenini Resendda tasdiqlang yoki EMAIL_FROM ni sozlang.',
        }
      }

      return {
        ok: false,
        error: 'Email yuborilmadi. RESEND_API_KEY va EMAIL_FROM ni tekshiring.',
      }
    }

    return { ok: true }
  } catch (e) {
    console.error('[email]', e)
    return { ok: false, error: 'Email yuborishda tarmoq xatosi.' }
  }
}
