import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import {
  closeTrackedSignal,
  evaluateOutcome,
  getOpenSignalIds,
  getTrackedSignal,
} from '@/lib/signal-tracker'

async function fetchGateCandles(symbol: string, interval: string) {
  const pair = `${symbol}_USDT`
  const gateInterval = interval === '1d' ? '1d' : interval === '4h' ? '4h' : '1h'
  const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${encodeURIComponent(pair)}&interval=${gateInterval}&limit=200`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'GoldenWeb-Signal-Tracker/1.0' },
  })
  if (!res.ok) throw new Error(`Gate ${symbol}/${interval}: ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('Gate invalid response')
  return data
    .map((k: string[]) => ({
      time: +k[0] * 1000,
      high: +k[3],
      low: +k[4],
      close: +k[2],
    }))
    .sort((a: { time: number }, b: { time: number }) => a.time - b.time)
}

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  const externalSecret = request.headers.get('x-cron-secret')

  const authorized =
    Boolean(expectedSecret) &&
    (authorization === `Bearer ${expectedSecret}` || externalSecret === expectedSecret)

  if (!authorized) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }

  const openIds = await getOpenSignalIds(redis)
  const closed: Array<{ id: string; status: string; symbol: string }> = []
  const errors: string[] = []
  const stillOpen: string[] = []

  // Cache candles per symbol+interval
  const candleCache = new Map<string, Array<{ time: number; high: number; low: number; close: number }>>()

  for (const id of openIds) {
    try {
      const signal = await getTrackedSignal(redis, id)
      if (!signal || signal.status !== 'open') {
        await redis.srem('goldenweb:signals:open', id)
        continue
      }

      const cacheKey = `${signal.symbol}:${signal.interval}`
      let candles = candleCache.get(cacheKey)
      if (!candles) {
        candles = await fetchGateCandles(signal.symbol, signal.interval)
        candleCache.set(cacheKey, candles)
      }

      const outcome = evaluateOutcome(signal, candles)
      if (!outcome) {
        stillOpen.push(id)
        continue
      }

      await closeTrackedSignal(redis, signal, outcome.status, outcome.outcomePrice, outcome.outcomeAt)
      closed.push({ id, status: outcome.status, symbol: signal.symbol })
    } catch (e: any) {
      errors.push(`${id}: ${e?.message || 'error'}`)
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    openBefore: openIds.length,
    closed: closed.length,
    stillOpen: stillOpen.length,
    results: closed,
    errors,
    generatedAt: new Date().toISOString(),
  })
}
