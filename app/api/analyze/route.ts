import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'
import { calculateSignal, SignalInput } from '@/lib/signal-engine'
import { sendTelegramSignal } from '@/lib/telegram'
import { getRedis } from '@/lib/redis'

const ALIASES: Record<string, string> = {
  BTC: 'BTC', ETH: 'ETH', LTC: 'LTC', SOL: 'SOL', BNB: 'BNB', NEAR: 'NEAR', GRAM: 'GRAM', SUI: 'SUI', APT: 'APT', ATOM: 'ATOM', XAUT: 'XAUT', XRP: 'XRP', XLM: 'XLM', TRX: 'TRX', HYPE: 'HYPE', BCH: 'BCH', ZEC: 'ZEC', LINK: 'LINK', AVAX: 'AVAX', ONDO: 'ONDO', WLD: 'WLD',
}

const ALLOWED_INTERVALS = ['1h', '4h', '1d'] as const
type AllowedInterval = (typeof ALLOWED_INTERVALS)[number]

function intervalConfig(interval: string) {
  if (interval === '1d') return '1d'
  if (interval === '4h') return '4h'
  return '1h'
}

async function fetchGate(symbol: string, interval: string): Promise<Candle[]> {
  const base = ALIASES[symbol] || symbol
  const pair = `${base}_USDT`
  const gateInterval = intervalConfig(interval)
  const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${encodeURIComponent(pair)}&interval=${gateInterval}&limit=150`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' },
  })
  if (!res.ok) throw new Error(`Gate ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data) || data.length < 60) throw new Error('Gate insufficient candles')

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

function emaSeries(candles: Candle[], period: number): number[] {
  const first = candles[0]?.close || 0
  const k = 2 / (period + 1)
  let ema = first
  return candles.map((c, i) => {
    if (i > 0) ema = c.close * k + ema * (1 - k)
    return ema
  })
}

function rsiSeries(candles: Candle[], period = 14): number[] {
  const out: number[] = []
  let gain = 0
  let loss = 0
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { out.push(50); continue }
    const d = candles[i].close - candles[i - 1].close
    const g = Math.max(d, 0)
    const l = Math.max(-d, 0)
    if (i <= period) {
      gain += g; loss += l
      out.push(i === period ? (loss === 0 ? 100 : 100 - 100 / (1 + gain / loss)) : 50)
    } else {
      gain = (gain * (period - 1) + g) / period
      loss = (loss * (period - 1) + l) / period
      out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss))
    }
  }
  return out
}

function higherInterval(interval: string): AllowedInterval | null {
  if (interval === '1h') return '4h'
  if (interval === '4h') return '1d'
  return null
}

/** Signal Engine: yangi BUY/SELL holati o‘zgarganda Telegram */
async function notifyTelegramForNewSignal(symbol: string, interval: string, candles: Candle[]) {
  if (!candles.length) return
  const closedCandles = candles.length > 1 ? candles.slice(0, -1) : candles
  if (closedCandles.length < 60) return

  const ema20 = emaSeries(closedCandles, 20)
  const ema50 = emaSeries(closedCandles, 50)
  const rsi = rsiSeries(closedCandles)

  let higherTimeframe: SignalInput['higherTimeframe'] | undefined
  const higher = higherInterval(interval)
  if (higher) {
    try {
      const higherData = await fetchMarketData(symbol, higher)
      const higherResult = analyze(higherData.candles, higher)
      higherTimeframe = { ema20: higherResult.ema20, ema50: higherResult.ema50, rsi: higherResult.rsi }
    } catch {
      higherTimeframe = undefined
    }
  }

  const inputs: SignalInput[] = closedCandles.map((c, i) => ({ time: c.time, close: c.close, ema20: ema20[i], ema50: ema50[i], rsi: rsi[i], higherTimeframe }))
  const latest = inputs[inputs.length - 1]
  const previous = inputs[inputs.length - 2]
  const latestSignal = calculateSignal(latest)
  const previousSignal = calculateSignal(previous)
  if (!latestSignal || latestSignal.type === previousSignal?.type) return

  const signal = {
    side: latestSignal.type,
    symbol,
    timeframe: (interval === '1h' ? 'H1' : interval === '4h' ? 'H4' : 'D1') as 'H1' | 'H4' | 'D1',
    entryLow: latestSignal.entryLow,
    entryHigh: latestSignal.entryHigh,
    tp: [latestSignal.tp1, latestSignal.tp2, latestSignal.tp3],
    sl: latestSignal.stopLoss,
  }

  const redis = getRedis()
  if (!redis) {
    console.error('Telegram signal deduplication unavailable: Upstash Redis is not configured')
    return
  }
  const redisKey = `goldenweb:telegram-signal:${symbol}:${interval}:${latest.time}:${latestSignal.type}`
  const claimed = await redis.set(redisKey, '1', { nx: true, ex: 60 * 60 * 24 * 30 })
  if (claimed == null) return

  try { await sendTelegramSignal(signal) }
  catch (error) { await redis.del(redisKey); throw error }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const raw = (q.get('symbol') || 'BTC').toUpperCase()
  const symbol = raw.replace(/[^A-Z0-9]/g, '')
  const requested = q.get('interval') || '1h'
  const interval: AllowedInterval = ALLOWED_INTERVALS.includes(requested as AllowedInterval) ? requested as AllowedInterval : '1h'

  try {
    const { candles, provider } = await fetchMarketData(symbol, interval)
    const result = analyze(candles, interval)
    const scannerSecret = process.env.CRON_SECRET
    const scannerHeader = req.headers.get('x-signal-scanner-secret')
    const isScannerRequest = Boolean(scannerSecret) && scannerHeader === scannerSecret
    if (isScannerRequest) {
      try { await notifyTelegramForNewSignal(symbol, interval, candles) }
      catch (telegramError) { console.error('Telegram signal notification failed:', telegramError) }
    }
    return NextResponse.json({ symbol, interval, provider, candles, result, generatedAt: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Market data serveriga ulanib bo'lmadi." }, { status: 502 })
  }
}