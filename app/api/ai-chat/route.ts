import { NextResponse } from 'next/server'

export const runtime = 'edge'

const BASE_URL = 'https://api.blockchain.info/ai/api/v1'
const MODEL = process.env.JUNE_MODEL || 'openai/gpt-latest'

function clean(value: unknown, max = 4000) { return String(value ?? '').slice(0, max) }

function extractText(value: any, depth = 0): string {
  if (depth > 10 || value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(v => extractText(v, depth + 1)).filter(Boolean).join('\n').trim()
  if (typeof value !== 'object') return ''
  for (const key of ['content', 'text', 'output_text', 'answer', 'completion', 'message']) {
    if (value[key] != null) { const found = extractText(value[key], depth + 1); if (found) return found }
  }
  for (const key of ['choices', 'outputs', 'output', 'result', 'data', 'response']) {
    if (value[key] != null) { const found = extractText(value[key], depth + 1); if (found) return found }
  }
  return ''
}

function extractSseText(raw: string): string {
  const parts: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try { const parsed = JSON.parse(payload); const text = extractText(parsed); if (text) parts.push(text) } catch { if (payload) parts.push(payload) }
  }
  return parts.join('').trim()
}

function parseResponse(raw: string): string {
  if (!raw.trim()) return ''
  const sse = extractSseText(raw)
  if (sse) return sse
  try { return extractText(JSON.parse(raw)) } catch { return raw.trim() }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.JUNE_API_KEY?.trim()
    if (!apiKey) return NextResponse.json({ error: 'JUNE_API_KEY Vercel Environment Variables da topilmadi.' }, { status: 500 })

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'User-Agent': 'GoldenWeb-Crypto-Analyst/1.0' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        stream: false,
        messages: [
          { role: 'system', content: `Sen GOLDENWEB.UZ saytining “Kripto tahlilchi AI” yordamchisisan. Faqat o‘zbek tilida, aniq va foydali javob ber. Foydalanuvchi istalgan mavzuda savol berishi mumkin: kripto, trading, texnologiya, sayt, umumiy savollar va boshqalar. Kripto/Premium tahlil savollarida berilgan tahlil ma’lumotlarini asosiy kontekst sifatida ishlat. Raqamlarni o‘zgartirma va mavjud ma’lumot yo‘q bo‘lsa uydirma qilma. Entry, TP, SL, trend, RSI va indikatorlarni aynan berilgan qiymatlar bilan tushuntir. Javob formatida narxlarni odatda maksimal 2 ta kasr xonasi bilan ko‘rsat (masalan 77276.563571 → 77,276.56), RSI, foiz va shunga o‘xshash indikatorlarni maksimal 1 ta kasr xonasi bilan ko‘rsat (masalan 53.2590 → 53.3). Juda uzun o‘nliklarni hech qachon ko‘rsatma. Mingliklarni o‘qish qulay bo‘lishi uchun vergul bilan ajrat. Hisob-kitob uchun ichki aniqlikni saqla, lekin foydalanuvchiga faqat yaxlitlangan ko‘rinishni chiqar. Entry/TP/SL qiymatlarini o‘zboshimchalik bilan o‘zgartirma. Boshqa mavzularda ham savolga bevosita javob ber.\n\nHOZIRGI PREMIUM TAHLIL:\n${JSON.stringify(context)}` },
          ...safeMessages,
        ],
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      let data: any = null; try { data = JSON.parse(raw) } catch {}
      const providerMessage = data?.error?.message || data?.msg || data?.message || raw.slice(0, 1000)
      return NextResponse.json({ error: `June ${response.status}: ${providerMessage}` }, { status: response.status })
    }

    const text = parseResponse(raw)
    if (!text) return NextResponse.json({ error: 'June javob berdi, ammo javob matni aniqlanmadi.' }, { status: 502 })
    return NextResponse.json({ text })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'AI server xatosi.' }, { status: 500 })
  }
}
