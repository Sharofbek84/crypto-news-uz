import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'
import { longLevels, shortLevels, fmt } from '@/lib/technical-helpers'
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

/**
 * Upstash SET NX natijasi.
 * Muvaffaqiyat: 'OK' | true | boshqa truthy (null/false emas).
 * Faqat null/undefined/false — rad etiladi.
 */
function redisSetOk(result: unknown): boolean {
  return result !== null && result !== undefined && result !== false
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
 * Yumshoq D1 → W1: faqat W1 trend NEUTRAL bo'lganda D1 EMA yo'nalishiga moslash.
 * Side o'zgaganda xulosa matni ham yangi yo'nalishga mos yoziladi.
 */
async function applyD1EmaToW1IfNeutral(
  symbol: string,
  w1Candles: Candle[],
  w1Result: ReturnType<typeof analyze>
): Promise<ReturnType<typeof analyze>> {
  if (w1Result.trend !== 'NEUTRAL') return w1Result

  try {
    const d1Candles = await fetchGate(symbol, '1d')
    if (d1Candles.length < 60) return w1Result

    const d1 = analyze(d1Candles, '1d')
    const d1Bull = d1.ema20 > d1.ema50
    const d1Bear = d1.ema20 < d1.ema50
    if (!d1Bull && !d1Bear) return w1Result

    const newSide: 'BUY' | 'SELL' = d1Bull ? 'BUY' : 'SELL'
    if (newSide === w1Result.side) return w1Result

    const last = w1Candles.at(-1)?.close ?? 0
    const levels =
      newSide === 'SELL'
        ? shortLevels(w1Candles, last, '1w')
        : longLevels(w1Candles, last, '1w')

    const { entryLow, entryHigh, invalidation, tp, support, resistance } = levels
    const deepSupport = support.length
      ? Math.min(...support)
      : newSide === 'SELL'
        ? tp[2]
        : Math.min(invalidation, last * 0.97)

    let bullish: string
    let bearish: string
    let summary: string

    if (newSide === 'SELL') {
      bullish =
        `Narx ${fmt(invalidation)} resistance zonasini qayta test qilib, EMA50 ustiga chiqsa, ` +
        `qisqa muddatli rebound ehtimoli oshadi va SELL signal bekor bo'lishi mumkin.`
      bearish =
        `Narx EMA50 ostida qolsa va momentum salbiy bo'lsa, ` +
        `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} zonalarga pasayish ssenariysi kuchayadi.`
      summary =
        `W1 grafikda trend NEUTRAL, biroq D1 EMA yo'nalishi bearish. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, pasayish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan yuqorisida yopilsa, signal bekor bo'ladi.`
    } else {
      bullish =
        `Narx EMA50 ustida va momentum ijobiy bo'lsa, ` +
        `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} gacha rebound/breakout ssenariysi kuzatiladi.`
      bearish =
        `Narx EMA50 ostida qolish va momentum susayishi ` +
        `${fmt(deepSupport)} support zonasini qayta test qilish xavfini oshiradi.`
      summary =
        `W1 grafikda trend NEUTRAL, biroq D1 EMA yo'nalishi bullish. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, o'sish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, signal bekor bo'ladi.`
    }

    return {
      ...w1Result,
      side: newSide,
      signalTone: 'caution',
      entryLow,
      entryHigh,
      invalidation,
      tp,
      support,
      resistance,
      bullish,
      bearish,
      summary,
    }
  } catch (e) {
    console.error('D1 EMA → W1 neutral sync failed:', e)
    return w1Result
  }
}

/**
 * Telegram + tracker.
 * Avval Redis trackerga yoziladi, keyin Telegram.
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

  // H1 + NEUTRAL trend — Telegramga yuborilmaydi
  if (interval === '1h' && current.trend === 'NEUTRAL') {
    return { tracked: false, telegram: false, reason: 'h1-neutral' }
  }

  // Faqat side o'zgarganda (BUY↔SELL)
  if (current.side === previous.side) {
    return { tracked: false, telegram: false, reason: 'same-side' }
  }

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
    let result = analyze(candles, interval)

    // W1 NEUTRAL bo'lsa — D1 EMA yo'nalishiga yumshoq moslash
    if (interval === '1w') {
      result = await applyD1EmaToW1IfNeutral(symbol, candles, result)
    }

    const scannerSecret = process.env.CRON_SECRET
    const scannerHeader = req.headers.get('x-signal-scanner-secret')
    const isScannerRequest = Boolean(scannerSecret) && scannerHeader === scannerSecret

    let signalNotify: { tracked: boolean; telegram: boolean; reason?: string } | null = null
    if (isScannerRequest && TELEGRAM_INTERVALS.has(interval)) {
      try {
        signalNotify = await notifyTelegramForNewSignal(symbol, interval, candles)
      } catch (telegramError: any) {
        console.error('Telegram signal notification failed:', telegramError)
        signalNotify = {
          tracked: false,
          telegram: false,
          reason: `error:${telegramError?.message || 'unknown'}`.slice(0, 120),
        }
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
