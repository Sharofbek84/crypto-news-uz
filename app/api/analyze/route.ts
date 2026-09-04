import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'
import { sendTelegramSignal } from '@/lib/telegram'
import { getRedis } from '@/lib/redis'
import { buildSignalId, saveTrackedSignal } from '@/lib/signal-tracker'

const ALIASES: Record<string, string> = {
  BTC: 'BTC', ETH: 'ETH', LTC: 'LTC', SOL: 'SOL', BNB: 'BNB', NEAR: 'NEAR', GRAM: 'GRAM', SUI: 'SUI', APT: 'APT', ATOM: 'ATOM', XAUT: 'XAUT', XRP: 'XRP', XLM: 'XLM', TRX: 'TRX', HYPE: 'HYPE', BCH: 'BCH', ZEC: 'ZEC', LINK: 'LINK', AVAX: 'AVAX', ONDO: 'ONDO', WLD: 'WLD',
}

/** Grafik uchun: H1/H4/D1/W1. Telegram signallar faqat H1/H4/D1. */
const ALLOWED_INTERVALS = ['1h', '4h', '1d', '1w'] as const
type AllowedInterval = (typeof ALLOWED_INTERVALS)[number]
const TELEGRAM_INTERVALS = new Set(['1h', '4h', '1d'])

/** Bir coin uchun keyingi Telegram signalgacha kutish (soat). */
const COIN_TELEGRAM_COOLDOWN_SEC = 60 * 60 * 4 // 4 soat

function intervalConfig(interval: string) {
  if (interval === '1w') return '7d'
  if (interval === '1d') return '1d'
  if (interval === '4h') return '4h'
  return '1h'
}

/** Upstash SET NX: 'OK' | true = muvaffaqiyat */
function redisSetOk(result: unknown): boolean {
  return result === 'OK' || result === true
}

async function fetchGate(symbol: string, interval: string): Promise<Candle[]> {
  const base = ALIASES[symbol] || symbol
  const pair = `${base}_USDT`
  const gateInterval = intervalConfig(interval)
  const limit = 150
  const minCandles = interval === '1w' ? 40 : 60
  const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${encodeURIComponent(pair)}&interval=${gateInterval}&limit=${limit}`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' },
  })
  if (!res.ok) throw new Error(`Gate ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data) || data.length < minCandles) throw new Error('Gate insufficient candles')

  return data
    .map((k: string[]) => ({
      time: +k[0] * 1000,
      volume: +k[1],
      close: +k[2],
      high: +k[3],
      low: +k[4],
      open: +k[5],
    }))
    .sort((a, b) => a.time - b.time)
}

async function fetchMarketData(symbol: string, interval: string) {
  return { candles: await fetchGate(symbol, interval), provider: 'Gate.io' }
}

/**
 * H1 signal uchun H4 filtr: H4 side H1 bilan bir xil bo'lishi shart.
 */
async function passesHigherTimeframeFilter(
  symbol: string,
  interval: string,
  side: 'BUY' | 'SELL'
): Promise<boolean> {
  if (interval !== '1h') return true

  try {
    const { candles: h4Candles } = await fetchMarketData(symbol, '4h')
    const h4Closed = h4Candles.length > 1 ? h4Candles.slice(0, -1) : h4Candles
    if (h4Closed.length < 60) return false

    const h4 = analyze(h4Closed, '4h')
    return h4.side === side
  } catch (e) {
    console.error(`H4 filter failed for ${symbol}:`, e)
    return false
  }
}

/**
 * Telegram + tracker.
 * Avval Redis trackerga yoziladi, keyin Telegram — jadval hech qachon bo'sh qolmasin.
 */
async function notifyTelegramForNewSignal(
  symbol: string,
  interval: string,
  candles: Candle[]
): Promise<{ tracked: boolean; telegram: boolean; reason?: string }> {
  if (!TELEGRAM_INTERVALS.has(interval)) return { tracked: false, telegram: false, reason: 'interval' }
  if (!candles.length) return { tracked: false, telegram: false, reason: 'no-candles' }

  const closedCandles = candles.length > 1 ? candles.slice(0, -1) : candles
  if (closedCandles.length < 60) return { tracked: false, telegram: false, reason: 'few-candles' }

  const current = analyze(closedCandles, interval)
  const previousCandles = closedCandles.slice(0, -1)
  if (previousCandles.length < 60) return { tracked: false, telegram: false, reason: 'few-prev' }

  const previous = analyze(previousCandles, interval)

  if (interval === '1h' && current.trend === 'NEUTRAL') {
    return { tracked: false, telegram: false, reason: 'h1-neutral' }
  }

  if (current.side === previous.side) {
    return { tracked: false, telegram: false, reason: 'same-side' }
  }

  const htfOk = await passesHigherTimeframeFilter(symbol, interval, current.side)
  if (!htfOk) return { tracked: false, telegram: false, reason: 'htf-filter' }

  const signalTime = closedCandles[closedCandles.length - 1].time
  const timeframe = (interval === '1h' ? 'H1' : interval === '4h' ? 'H4' : 'D1') as 'H1' | 'H4' | 'D1'

  const signal = {
    side: current.side,
    symbol,
    timeframe,
    entryLow: current.entryLow,
    entryHigh: current.entryHigh,
    tp: [current.tp[0], current.tp[1], current.tp[2]],
    sl: current.invalidation,
    trend: current.trend,
    rsi: current.rsi,
  }

  const redis = getRedis()
  if (!redis) {
    console.error('Telegram signal deduplication unavailable: Upstash Redis is not configured')
    return { tracked: false, telegram: false, reason: 'no-redis' }
  }

  const coinLockKey = `goldenweb:telegram-coin:${symbol}`
  const coinLocked = await redis.set(coinLockKey, `${interval}:${current.side}:${signalTime}`, {
    nx: true,
    ex: 60 * 5,
  })
  if (!redisSetOk(coinLocked)) {
    return { tracked: false, telegram: false, reason: 'coin-lock' }
  }

  const cooldownKey = `goldenweb:telegram-coin-cd:${symbol}`
  const cooldownOk = await redis.set(cooldownKey, `${interval}:${current.side}`, {
    nx: true,
    ex: COIN_TELEGRAM_COOLDOWN_SEC,
  })
  if (!redisSetOk(cooldownOk)) {
    return { tracked: false, telegram: false, reason: 'cooldown' }
  }

  const redisKey = `goldenweb:telegram-signal:${symbol}:${interval}:${signalTime}:${current.side}`
  const claimed = await redis.set(redisKey, '1', { nx: true, ex: 60 * 60 * 24 * 30 })
  if (!redisSetOk(claimed)) {
    await redis.del(cooldownKey)
    return { tracked: false, telegram: false, reason: 'dup-event' }
  }

  const signalId = buildSignalId(symbol, interval, signalTime, current.side)

  try {
    // 1) Avval statistikaga yoz — Telegram xatosi jadvalni buzmasin
    await saveTrackedSignal({
      id: signalId,
      symbol,
      interval,
      timeframe,
      side: current.side,
      entryLow: current.entryLow,
      entryHigh: current.entryHigh,
      tp1: current.tp[0],
      tp2: current.tp[1],
      tp3: current.tp[2],
      sl: current.invalidation,
      signalTime,
    })

    // 2) Keyin Telegram
    await sendTelegramSignal(signal)
    return { tracked: true, telegram: true }
  } catch (error) {
    await redis.del(redisKey)
    await redis.del(cooldownKey)
    await redis.del(coinLockKey)
    console.error(`Signal notify failed ${symbol}/${interval}:`, error)
    throw error
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const raw = (q.get('symbol') || 'BTC').toUpperCase()
  const symbol = raw.replace(/[^A-Z0-9]/g, '')
  const requested = q.get('interval') || '1h'
  const interval: AllowedInterval = ALLOWED_INTERVALS.includes(requested as AllowedInterval)
    ? (requested as AllowedInterval)
    : '1h'

  try {
    const { candles, provider } = await fetchMarketData(symbol, interval)
    const result = analyze(candles, interval)
    const scannerSecret = process.env.CRON_SECRET
    const scannerHeader = req.headers.get('x-signal-scanner-secret')
    const isScannerRequest = Boolean(scannerSecret) && scannerHeader === scannerSecret

    let signalNotify: { tracked: boolean; telegram: boolean; reason?: string } | null = null
    if (isScannerRequest && TELEGRAM_INTERVALS.has(interval)) {
      try {
        signalNotify = await notifyTelegramForNewSignal(symbol, interval, candles)
      } catch (telegramError) {
        console.error('Telegram signal notification failed:', telegramError)
        signalNotify = { tracked: false, telegram: false, reason: 'error' }
      }
    }

    return NextResponse.json({
      symbol,
      interval,
      provider,
      candles,
      result,
      signalNotify,
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Market data serveriga ulanib bo'lmadi." },
      { status: 502 }
    )
  }
}
