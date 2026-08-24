import { NextResponse } from 'next/server'

export const runtime = 'edge'
const BASE_URL = 'https://co.agentrouter.org/v1'

export async function POST() {
  try {
    const apiKey = process.env.AGENTROUTER_API_KEY?.trim()
    if (!apiKey) return NextResponse.json({ error: 'AGENTROUTER_API_KEY Vercel Environment Variables da topilmadi.' }, { status: 500 })

    const response = await fetch(`${BASE_URL}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'User-Agent': 'GoldenWeb-Crypto-Analyst/1.0' },
    })
    const raw = await response.text()
    let data: any = null
    try { data = JSON.parse(raw) } catch {}

    if (!response.ok) {
      const providerMessage = data?.error?.message || data?.msg || data?.message || raw.slice(0, 500)
      return NextResponse.json({ error: `AgentRouter /v1/models ${response.status}: ${providerMessage}`, diagnostic: true }, { status: response.status })
    }

    const models = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
    return NextResponse.json({ ok: true, diagnostic: true, modelCount: models.length, models: models.slice(0, 100).map((m: any) => typeof m === 'string' ? m : m?.id).filter(Boolean) })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'AgentRouter diagnostika xatosi.', diagnostic: true }, { status: 500 })
  }
}
