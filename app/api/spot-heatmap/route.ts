import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const COINS = [
  'BTC',
  'ETH',
  'LTC',
  'SOL',
  'BNB',
  'NEAR',
  'GRAM',
  'SUI',
  'APT',
  'ATOM',
  'TIA',
  'CORE',
  'FHE',
  'MYX',
  'WCT',
  'GTAI',
] as const

const TIMEFRAMES = [
  { key: 'H4', interval: '4h' },
  { key: 'D1', interval: '1d' },
  { key: 'W1', interval: '7d' },
] as const

type Candle = [string, string, string, string, string, string, string?]

function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null

  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change >= 0) gain += change
    else loss -= change
  }

  let avgGain = gain / period
  let avgLoss = loss / period

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const g = change > 0 ? change : 0
    const l = change < 0 ? -change : 0
    avgGain = (avgGain * (period - 1) + g) / period
    avgLoss = (avgLoss * (period - 1) + l) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

async function getRSI(symbol: string, interval: string) {
  const url = new URL('https://api.gateio.ws/api/v4/spot/candlesticks')
  url.searchParams.set('currency_pair', `${symbol}_USDT`)
  url.searchParams.set('interval', interval)
  url.searchParams.set('limit', '100')

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`Gate.io ${symbol} ${interval}: ${res.status}`)
  const raw = (await res.json()) as Candle[]
  if (!Array.isArray(raw) || raw.length === 0) {
    return { rsi: null, price: null, timestamp: null }
  }

  // Gate returns oldest->newest or newest->oldest depending; sort by time
  const sorted = [...raw].sort((a, b) => Number(a[0]) - Number(b[0]))
  const closes = sorted.map((c) => Number(c[2]))
  const last = sorted[sorted.length - 1]
  const price = Number(last[2])
  const timestamp = Number(last[0]) * 1000
  const rsi = calculateRSI(closes)

  return {
    rsi: rsi != null && Number.isFinite(rsi) ? rsi : null,
    price: Number.isFinite(price) ? price : null,
    timestamp: Number.isFinite(timestamp) ? timestamp : null,
  }
}

export async function GET() {
  const results = await Promise.all(
    COINS.flatMap((symbol) =>
      TIMEFRAMES.map(async ({ key, interval }) => {
        try {
          return [symbol, key, await getRSI(symbol, interval)] as const
        } catch (e) {
          console.error('heatmap rsi error', symbol, interval, e)
          return [
            symbol,
            key,
            { rsi: null, price: null, timestamp: null },
          ] as const
        }
      }),
    ),
  )

  const data: Record<
    string,
    Record<string, { rsi: number | null; price: number | null; timestamp: number | null }>
  > = {}

  for (const symbol of COINS) {
    data[symbol] = {}
    for (const { key } of TIMEFRAMES) {
      const item = results.find(([s, tf]) => s === symbol && tf === key)
      data[symbol][key] = item?.[2] ?? {
        rsi: null,
        price: null,
        timestamp: null,
      }
    }
  }

  return NextResponse.json({
    ok: true,
    updatedAt: Date.now(),
    coins: COINS,
    timeframes: TIMEFRAMES.map((t) => t.key),
    data,
  })
}
