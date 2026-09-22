import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TF_MAP: Record<string, string> = {
  H4: '4h',
  D1: '1d',
  W1: '7d',
}

/** Gate.io: [timestamp, volume, close, high, low, open] */
type Candle = [string, string, string, string, string, string]

export async function GET(req: NextRequest) {
  const coin = (req.nextUrl.searchParams.get('coin') || 'BTC').toUpperCase()
  const tf = (req.nextUrl.searchParams.get('tf') || 'H4').toUpperCase()
  const interval = TF_MAP[tf] || '4h'

  if (!/^[A-Z0-9]{2,12}$/.test(coin)) {
    return NextResponse.json({ error: 'Invalid coin' }, { status: 400 })
  }

  try {
    const url = new URL('https://api.gateio.ws/api/v4/spot/candlesticks')
    url.searchParams.set('currency_pair', `${coin}_USDT`)
    url.searchParams.set('interval', interval)
    url.searchParams.set('limit', '80')

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Gate.io error' }, { status: 502 })
    }

    const rows = (await res.json()) as Candle[]
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data' }, { status: 404 })
    }

    const sorted = [...rows].sort((a, b) => Number(a[0]) - Number(b[0]))
    const points = sorted
      .map((row) => ({
        t: Number(row[0]) * (String(row[0]).length <= 10 ? 1000 : 1),
        o: Number(row[5]),
        h: Number(row[3]),
        l: Number(row[4]),
        c: Number(row[2]),
      }))
      .filter((p) => Number.isFinite(p.c))

    return NextResponse.json({
      coin,
      tf,
      interval,
      points,
      updatedAt: Date.now(),
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
