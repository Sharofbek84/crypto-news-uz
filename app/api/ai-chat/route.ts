import { NextResponse } from 'next/server'

export const runtime = 'edge'

const MODEL = 'gpt-5.6-sol'
const BASE_URL = 'https://agentrouter.org/v1'

function clean(value: unknown, max = 4000) { return String(value ?? '').slice(0, max) }

function extractText(value: any, depth = 0): string {
  if (depth > 8 || value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    const parts = value.map(v => extractText(v, depth + 1)).filter(Boolean)
    return parts.join('\n').trim()
  }
  if (typeof value !== 'object') return ''

  // Prefer known text-bearing fields before recursively searching the whole response.
  for (const key of ['content', 'text', 'output_text', 'answer', 'response', 'completion', 'message']) {
    if (value[key] != null) {
      const found = extractText(value[key], depth + 1)
      if (found) return found
    }
  }
  for (const key of ['choices', 'outputs', 'output', 'result', 'data', 'response']) {
    if (value[key] != null) {
      const found = extractText(value[key], depth + 1)
      if (found) return found
    }
  }
  return ''
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.AGENTROUTER_API_KEY?.trim()
    if (!apiKey) return NextResponse.json({ error: 'AGENTROUTER_API_KEY Vercel Environment Variables da topilmadi.' }, { status: 500 })

    const body = await request.json()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const analysis = body?.analysis ?? {}
    const safeMessages = messages.filter((m: any) => m && (m.role === 'user' || m.role === 'assistant')).slice(-12).map((m: any) => ({ role: m.role, content: clean(m.content ?? m.text, 2500) }))

    const context = {
      coin: clean(analysis.coin, 30), interval: clean(analysis.interval, 20), trend: clean(analysis.trend, 40), side: clean(analysis.side, 20),
      rsi: analysis.rsi, entryLow: analysis.entryLow, entryHigh: analysis.entryHigh, stopLoss: analysis.stopLoss, tp1: analysis.tp1, tp2: analysis.tp2, tp3: analysis.tp3,
      support: Array.isArray(analysis.support) ? analysis.support.slice(0, 8) : [], resistance: Array.isArray(analysis.resistance) ? analysis.resistance.slice(0, 8) : [],
      ema10: analysis.ema10, ema20: analysis.ema20, ema50: analysis.ema50, summary: clean(analysis.summary, 1800), bullish: clean(analysis.bullish, 1800), bearish: clean(analysis.bearish, 1800),
    }

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0.4,
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
