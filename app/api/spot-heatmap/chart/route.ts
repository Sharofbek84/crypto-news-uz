import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TF_MAP: Record<string, string> = {
  H4: '4h',
  D1: '1d',
  W1: '7d',
  '4h': '4h',
  '1d': '1d',
  '1w': '7d',
}

/** Gate.io: [timestamp, volume, close, high, low, open] */
type GateRow = [string, string, string, string, string, string]

export async function GET(req: NextRequest) {
  const coin = (req.nextUrl.searchParams.get('coin') || 'BTC').toUpperCase()
  const tfRaw = (req.nextUrl.searchParams.get('tf') || 'W1').toUpperCase()
  const interval = TF_MAP[tfRaw] || TF_MAP[req.nextUrl.searchParams.get('tf') || ''] || '7d'

  if (!/^[A-Z0-9]{2,12}$/.test(coin)) {
    return NextResponse.json({ error: 'Invalid coin' }, { status: 400 })
  }

  try {
    const url = new URL('https://api.gateio.ws/api/v4/spot/candlesticks')
    url.searchParams.set('currency_pair', `${coin}_USDT`)
    url.searchParams.set('interval', interval)
    url.searchParams.set('limit', '300')

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Gate.io error' }, { status: 502 })
    }

    const rows = (await res.json()) as GateRow[]
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data' }, { status: 404 })
    }

    const candles = [...rows]
      .map((k) => ({
        time: +k[0] * 1000,
        volume: +k[1],
        close: +k[2],
        high: +k[3],
        low: +k[4],
        open: +k[5],
      }))
      .filter((c) => Number.isFinite(c.close))
      .sort((a, b) => a.time - b.time)

    return NextResponse.json({
      coin,
      tf: tfRaw,
      interval,
      candles,
      count: candles.length,
      updatedAt: Date.now(),
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
