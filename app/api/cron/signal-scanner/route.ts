import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramSignal } from '@/lib/telegram'
import { getRedis } from '@/lib/redis'

const COINS = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM', 'XAUT', 'XRP', 'XLM', 'BCH', 'LINK', 'AVAX']
const INTERVALS = ['1h', '4h', '1d'] as const
const CONCURRENCY = 4
const SIGNAL_COOLDOWN_SECONDS = 4 * 60 * 60

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

  // Map.forEach avoids requiring downlevelIteration for the configured TS target.
  candidatesByCoin.forEach((candidates, symbol) => {
    candidates.sort(
      (a, b) =>
        timeframePriority[b.signal!.timeframe] - timeframePriority[a.signal!.timeframe]
    )
    // Sending is async, so queue each selected coin for sequential processing below.
  })

  const selectedByCoin: Array<{ symbol: string; candidates: typeof completed[number][] }> = []
  candidatesByCoin.forEach((candidates, symbol) => {
    selectedByCoin.push({ symbol, candidates })
  })

  const redis = getRedis()

  for (const entry of selectedByCoin) {
    const { symbol, candidates } = entry
    const selected = candidates[0]
    const signal = selected.signal!

    // Persist a per-coin, per-direction cooldown across separate Cron invocations.
    // Fail closed if Redis is unavailable so the scanner cannot flood Telegram.
    const cooldownKey = `signal:cooldown:${signal.symbol.toUpperCase()}:${signal.side}`
    let claimed = false

    try {
      if (!redis) throw new Error('Redis is not configured')
      const claim = await redis.set(cooldownKey, '1', {
        nx: true,
        ex: SIGNAL_COOLDOWN_SECONDS,
      })

      if (!claim) {
        selected.reason = 'suppressed-cooldown'
        for (const suppressed of candidates.slice(1)) {
          suppressed.reason = 'suppressed-same-coin'
        }
        continue
      }
      claimed = true

      await sendTelegramSignal(signal)
      selected.telegram = true
      selected.reason = 'sent-selected-timeframe'
      telegramSent++
      for (const suppressed of candidates.slice(1)) {
        suppressed.reason = 'suppressed-same-coin'
      }
    } catch (error) {
      if (claimed && redis) {
        try {
          await redis.del(cooldownKey)
        } catch (releaseError) {
          errors.push(
            `${symbol}: cooldown release failed: ${releaseError instanceof Error ? releaseError.message : 'unknown error'}`
          )
        }
      }
      errors.push(
        `${symbol}: Telegram/cooldown failed: ${error instanceof Error ? error.message : 'unknown error'}`
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
