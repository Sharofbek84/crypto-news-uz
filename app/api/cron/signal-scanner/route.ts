import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramSignal } from '@/lib/telegram'

const COINS = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM', 'XAUT', 'XRP', 'XLM', 'BCH', 'LINK', 'AVAX']
const INTERVALS = ['1h', '4h', '1d'] as const
const CONCURRENCY = 4

async function scanOne(baseUrl: string, symbol: string, interval: string, secret: string) {
  const url = new URL('/api/analyze', baseUrl)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'User-Agent': 'GoldenWeb-Signal-Scanner/1.0',
      'x-signal-scanner-secret': secret,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${symbol}/${interval}: ${response.status} ${body.slice(0, 180)}`)
  }

  const data = await response.json()
  const notify = data?.signalNotify as
    | {
        tracked?: boolean
        telegram?: boolean
        reason?: string
        signal?: {
          side: 'BUY' | 'SELL'
          symbol: string
          timeframe: 'H1' | 'H4' | 'D1'
          entryLow: number
          entryHigh: number
          tp: number[]
          sl: number
          trend?: string
          rsi?: number
        }
      }
    | null
    | undefined

  return {
    symbol,
    interval,
    ok: true,
    telegram: Boolean(notify?.telegram),
    tracked: Boolean(notify?.tracked),
    reason: notify?.reason || (notify ? 'none' : 'no-notify'),
    signal: notify?.signal,
  }
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

  const baseUrl = new URL(request.url).origin
  const jobs = COINS.flatMap((symbol) => INTERVALS.map((interval) => ({ symbol, interval })))
  const completed: Array<{
    symbol: string
    interval: string
    ok: boolean
    telegram: boolean
    tracked: boolean
    reason: string
    signal?: {
      side: 'BUY' | 'SELL'
      symbol: string
      timeframe: 'H1' | 'H4' | 'D1'
      entryLow: number
      entryHigh: number
      tp: number[]
      sl: number
      trend?: string
      rsi?: number
    }
  }> = []
  const errors: string[] = []
  const reasonCounts: Record<string, number> = {}
  let telegramSent = 0
  let trackedCount = 0

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((job) => scanOne(baseUrl, job.symbol, job.interval, expectedSecret!))
    )

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const v = result.value
        completed.push(v)
        if (v.tracked) trackedCount++
      } else {
        errors.push(
          result.reason instanceof Error
            ? result.reason.message
            : `${batch[index].symbol}/${batch[index].interval}: unknown error`
        )
      }
    })
  }

  // Har bir coin uchun faqat bitta signal: yuqori timeframe ustuvor
  // (D1 > H4 > H1). Yo'nalishdan qat'i nazar, qolgan timeframe'lar bostiriladi.
  const timeframePriority: Record<string, number> = { D1: 3, H4: 2, H1: 1 }
  const candidatesByCoin = new Map<string, typeof completed[number][]>()
  for (const item of completed) {
    if (!item.signal) continue
    const key = item.symbol.toUpperCase()
    const list = candidatesByCoin.get(key) || []
    list.push(item)
    candidatesByCoin.set(key, list)
  }

  for (const [symbol, candidates] of candidatesByCoin) {
    candidates.sort(
      (a, b) =>
        timeframePriority[b.signal!.timeframe] - timeframePriority[a.signal!.timeframe]
    )
    const selected = candidates[0]
    try {
      await sendTelegramSignal(selected.signal!)
      selected.telegram = true
      selected.reason = 'sent-selected-timeframe'
      telegramSent++
      for (const suppressed of candidates.slice(1)) {
        suppressed.reason = 'suppressed-same-coin'
      }
    } catch (error) {
      errors.push(
        `${symbol}: Telegram send failed: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      selected.reason = 'telegram-send-error'
    }
  }

  for (const item of completed) {
    reasonCounts[item.reason] = (reasonCounts[item.reason] || 0) + 1
  }

  return NextResponse.json({
    ok: errors.length === 0,
    scanned: jobs.length,
    completed: completed.length,
    telegramSent,
    trackedCount,
    reasonCounts,
    sentSignals: completed.filter((c) => c.telegram).map(({ signal: _signal, ...item }) => item),
    errors,
    generatedAt: new Date().toISOString(),
  })
}
