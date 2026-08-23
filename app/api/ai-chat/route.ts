import { NextResponse } from 'next/server'

export const runtime = 'edge'

const MODEL = process.env.AGENTROUTER_MODEL || 'gpt-5.5'
const BASE_URL = (process.env.AGENTROUTER_BASE_URL || 'https://co.agentrouter.org/v1').replace(/\/$/, '')

function clean(value: unknown, max = 4000) {
  return String(value ?? '').slice(0, max)
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.AGENTROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AGENTROUTER_API_KEY Vercel Environment Variables da topilmadi.' }, { status: 500 })
    }

    const body = await request.json()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const analysis = body?.analysis ?? {}

    const safeMessages = messages
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-12)
      .map((m: any) => ({
        role: m.role,
        content: clean(m.content ?? m.text, 2500),
      }))

    const context = {
      coin: clean(analysis.coin, 30),
      interval: clean(analysis.interval, 20),
      trend: clean(analysis.trend, 40),
      side: clean(analysis.side, 20),
      rsi: analysis.rsi,
      entryLow: analysis.entryLow,
      entryHigh: analysis.entryHigh,
      stopLoss: analysis.stopLoss,
      tp1: analysis.tp1,
      tp2: analysis.tp2,
      tp3: analysis.tp3,
      support: Array.isArray(analysis.support) ? analysis.support.slice(0, 8) : [],
      resistance: Array.isArray(analysis.resistance) ? analysis.resistance.slice(0, 8) : [],
      ema10: analysis.ema10,
      ema20: analysis.ema20,
      ema50: analysis.ema50,
      summary: clean(analysis.summary, 1800),
      bullish: clean(analysis.bullish, 1800),
      bearish: clean(analysis.bearish, 1800),
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `Sen GOLDENWEB.UZ saytining “Kripto tahlilchi AI” yordamchisisan. Faqat o‘zbek tilida, aniq va sodda javob ber. Foydalanuvchi hozir Premium tahlil sahifasida. Berilgan Premium texnik tahlil ma’lumotlarini asosiy kontekst sifatida ishlat. Raqamlarni o‘zgartirib yuborma va mavjud ma’lumot yo‘q bo‘lsa, uydirma qilma. Bu moliyaviy maslahat emasligini kerak bo‘lsa eslat. Savol Entry, TP, SL, trend, RSI yoki boshqa texnik ko‘rsatkich haqida bo‘lsa, aynan shu tahlildagi qiymatlarga tayangan holda tushuntir. Foydalanuvchi boshqa coin haqida so‘rasa, bu oynadagi tahlil faqat hozirgi coin uchun ekanini ayt.\n\nHOZIRGI PREMIUM TAHLIL:\n${JSON.stringify(context)}`,
          },
          ...safeMessages,
        ],
      }),
    })

    const raw = await response.text()
    let data: any = null
    try { data = JSON.parse(raw) } catch {}

    if (!response.ok) {
      const providerMessage = data?.error?.message || data?.message || raw.slice(0, 1000)
      return NextResponse.json({
        error: `AgentRouter ${response.status}: ${providerMessage}`,
      }, { status: response.status })
    }

    const text = data?.choices?.[0]?.message?.content
    return NextResponse.json({ text: text || 'AI javob qaytarmadi.' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'AI server xatosi.' }, { status: 500 })
  }
}
