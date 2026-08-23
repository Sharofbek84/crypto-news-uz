import { NextResponse } from 'next/server'

export const runtime = 'edge'

const MODEL = 'gpt-5.6-sol'
const BASE_URL = 'https://agentrouter.org/v1'

function clean(value: unknown, max = 4000) {
  return String(value ?? '').slice(0, max)
}

function extractText(data: any): string {
  const values = [data?.choices?.[0]?.message?.content, data?.choices?.[0]?.text, data?.output_text, data?.text, data?.content]
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value)) {
      const parts = value.map((item: any) => typeof item === 'string' ? item : item?.text ?? item?.content ?? '').filter(Boolean)
      if (parts.length) return parts.join(' ').trim()
    }
  }
  const content = data?.choices?.[0]?.message?.content
  if (Array.isArray(content)) {
    const parts = content.map((item: any) => item?.text ?? item?.content ?? '').filter(Boolean)
    if (parts.length) return parts.join(' ').trim()
  }
  return ''
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.AGENTROUTER_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'AGENTROUTER_API_KEY Vercel Environment Variables da topilmadi.' }, { status: 500 })
    }

    const body = await request.json()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const analysis = body?.analysis ?? {}
    const safeMessages = messages
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: clean(m.content ?? m.text, 2500) }))

    const context = {
      coin: clean(analysis.coin, 30), interval: clean(analysis.interval, 20), trend: clean(analysis.trend, 40), side: clean(analysis.side, 20),
      rsi: analysis.rsi, entryLow: analysis.entryLow, entryHigh: analysis.entryHigh, stopLoss: analysis.stopLoss,
      tp1: analysis.tp1, tp2: analysis.tp2, tp3: analysis.tp3,
      support: Array.isArray(analysis.support) ? analysis.support.slice(0, 8) : [],
      resistance: Array.isArray(analysis.resistance) ? analysis.resistance.slice(0, 8) : [],
      ema10: analysis.ema10, ema20: analysis.ema20, ema50: analysis.ema50,
      summary: clean(analysis.summary, 1800), bullish: clean(analysis.bullish, 1800), bearish: clean(analysis.bearish, 1800),
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages: [
          { role: 'system', content: `Sen GOLDENWEB.UZ saytining “Kripto tahlilchi AI” yordamchisisan. Faqat o‘zbek tilida, aniq va foydali javob ber. Foydalanuvchi istalgan mavzuda savol berishi mumkin: kripto, trading, texnologiya, sayt, umumiy savollar va boshqalar. Kripto/Premium tahlil savollarida berilgan tahlil ma’lumotlarini asosiy kontekst sifatida ishlat. Raqamlarni o‘zgartirma va mavjud ma’lumot yo‘q bo‘lsa uydirma qilma. Entry, TP, SL, trend, RSI va indikatorlarni aynan berilgan qiymatlar bilan tushuntir. Boshqa mavzularda ham savolga bevosita javob ber.\n\nHOZIRGI PREMIUM TAHLIL:\n${JSON.stringify(context)}` },
          ...safeMessages,
        ],
      }),
    })

    const raw = await response.text()
    let data: any = null
    try { data = JSON.parse(raw) } catch {}
    if (!response.ok) {
      const providerMessage = data?.error?.message || data?.msg || data?.message || raw.slice(0, 1000)
      return NextResponse.json({ error: `AgentRouter ${response.status}: ${providerMessage}` }, { status: response.status })
    }

    const text = extractText(data)
    if (!text) return NextResponse.json({ error: 'AgentRouter javob berdi, ammo javob matni aniqlanmadi.' }, { status: 502 })
    return NextResponse.json({ text })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'AI server xatosi.' }, { status: 500 })
  }
}
