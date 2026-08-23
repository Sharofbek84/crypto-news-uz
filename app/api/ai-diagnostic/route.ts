import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const key = process.env.AGENTROUTER_API_KEY || ''
  const model = process.env.AGENTROUTER_MODEL || 'gpt-5.6-sol'
  const baseUrl = (process.env.AGENTROUTER_BASE_URL || 'https://co.agentrouter.org/v1').replace(/\/$/, '')

  if (!key) {
    return NextResponse.json({ configured: false, message: 'AGENTROUTER_API_KEY topilmadi.' }, { status: 500 })
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      max_tokens: 5,
    }),
  })

  const raw = await response.text()
  let data: any = null
  try { data = JSON.parse(raw) } catch {}

  return NextResponse.json({
    configured: true,
    keyPresent: true,
    keyLength: key.length,
    keyPrefix: key.slice(0, 4) + '****',
    keySuffix: '****' + key.slice(-4),
    baseUrl,
    model,
    agentRouterStatus: response.status,
    agentRouterOk: response.ok,
    agentRouterMessage: data?.error?.message || data?.msg || data?.message || raw.slice(0, 500),
    responsePreview: data?.choices?.[0]?.message?.content || null,
  }, { status: response.ok ? 200 : response.status })
}
