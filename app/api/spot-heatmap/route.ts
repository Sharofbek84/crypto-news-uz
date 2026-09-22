import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const COINS = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM'] as const
const TIMEFRAMES = [
  { key: 'H4', interval: '4h' },
  { key: 'D1', interval: '1d' },
  { key: 'W1', interval: '7d' },
] as const

type Candle = [string, string, string, string, string, string, string?]

function calculateRSI(closes: number[], period = 14) {
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
    const currentGain = Math.max(change, 0)
    const currentLoss = Math.max(-change, 0)
    avgGain = (avgGain * (period - 1) + currentGain) / period
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period
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

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) throw new Error(`Gate.io ${symbol} ${interval}: ${res.status}`)

  const rows = (await res.json()) as Candle[]
  const closes = rows
    .map((row) => Number(row[2]))
    .filter((value) => Number.isFinite(value))

  const rsi = calculateRSI(closes)
  const last = rows[rows.length - 1]

  return {
    rsi: rsi == null ? null : Math.round(rsi * 10) / 10,
    price: last ? Number(last[2]) : null,
    timestamp: last ? Number(last[0]) : null,
  }
}

export async function GET() {
  const results = await Promise.all(
    COINS.flatMap((symbol) =>
      TIMEFRAMES.map(async ({ key, interval }) => {
        try {
          return [symbol, key, await getRSI(symbol, interval)] as const
        } catch {
          return [symbol, key, { rsi: null, price: null, timestamp: null }] as const
        }
      })
    )
  )

  const data: Record<string, Record<string, { rsi: number | null; price: number | null; timestamp: number | null }>> = {}

  for (const symbol of COINS) {
    data[symbol] = {}
    for (const { key } of TIMEFRAMES) {
      const item = results.find(([s, tf]) => s === symbol && tf === key)
      data[symbol][key] = item?.[2] ?? { rsi: null, price: null, timestamp: null }
    }
  }

  return NextResponse.json({
    source: 'Gate.io',
    period: 14,
    timeframes: TIMEFRAMES.map((x) => x.key),
    coins: COINS,
    data,
    updatedAt: Date.now(),
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
