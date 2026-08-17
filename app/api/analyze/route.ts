import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'

const ALIASES: Record<string,string> = { BTC:'BTCUSDT', ETH:'ETHUSDT', SOL:'SOLUSDT', APT:'APTUSDT', SUI:'SUIUSDT', XRP:'XRPUSDT', BNB:'BNBUSDT', CORE:'COREUSDT', MYX:'MYXUSDT', ALEO:'ALEOUSDT' }

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const raw = (q.get('symbol') || 'BTC').toUpperCase()
  const symbol = ALIASES[raw] || raw.replace(/[^A-Z0-9]/g, '')
  const interval = q.get('interval') || '4h'
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=150`
  try {
    const res = await fetch(url, { next: { revalidate: 300 }, headers: { Accept: 'application/json' } })
    if (!res.ok) return NextResponse.json({ error: `Market data xatosi: ${res.status}` }, { status: 502 })
    const rawData = await res.json()
    const candles: Candle[] = rawData.map((k: any[]) => ({ time:k[0], open:+k[1], high:+k[2], low:+k[3], close:+k[4], volume:+k[5] }))
    const result = analyze(candles)
    return NextResponse.json({ symbol, interval, candles, result, generatedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'Market data serveriga ulanib bo‘lmadi.' }, { status: 502 })
  }
}
