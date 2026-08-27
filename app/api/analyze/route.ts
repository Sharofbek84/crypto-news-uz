import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'
import { calculateSignal, SignalInput } from '@/lib/signal-engine'
import { sendTelegramSignal } from '@/lib/telegram'
import { getRedis } from '@/lib/redis'

const ALIASES: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', LTC: 'LTCUSDT', SOL: 'SOLUSDT', BNB: 'BNBUSDT', NEAR: 'NEARUSDT', GRAM: 'TONUSDT', SUI: 'SUIUSDT', APT: 'APTUSDT', ATOM: 'ATOMUSDT', XAUT: 'XAUTUSDT', XRP: 'XRPUSDT', XLM: 'XLMUSDT', TRX: 'TRXUSDT', HYPE: 'HYPEUSDT', BCH: 'BCHUSDT', ZEC: 'ZECUSDT', LINK: 'LINKUSDT', AVAX: 'AVAXUSDT', ONDO: 'ONDOUSDT', WLD: 'WLDUSDT',
}

const COINBASE_PRODUCTS: Record<string, string> = { BTC: 'BTC-USD', ETH: 'ETH-USD', LTC: 'LTC-USD', SOL: 'SOL-USD', BNB: 'BNB-USD', NEAR: 'NEAR-USD', SUI: 'SUI-USD', APT: 'APT-USD', ATOM: 'ATOM-USD', XRP: 'XRP-USD', XLM: 'XLM-USD', BCH: 'BCH-USD', LINK: 'LINK-USD', AVAX: 'AVAX-USD' }
const KRAKEN_PAIRS: Record<string, string> = { BTC: 'XBTUSD', ETH: 'ETHUSD', LTC: 'LTCUSD', SOL: 'SOLUSD', XRP: 'XRPUSD', XLM: 'XLMUSD', BCH: 'BCHUSD', LINK: 'LINKUSD', AVAX: 'AVAXUSD', ATOM: 'ATOMUSD', NEAR: 'NEARUSD', SUI: 'SUIUSD', APT: 'APTUSD' }
const ALLOWED_INTERVALS = ['15m', '1h', '4h', '1d']

function intervalConfig(interval: string) {
  if (interval === '15m') return { coinbase: 900, kraken: 15, binance: '15m' }
  if (interval === '1d') return { coinbase: 86400, kraken: 1440, binance: '1d' }
  if (interval === '1h') return { coinbase: 3600, kraken: 60, binance: '1h' }
  return { coinbase: 14400, kraken: 240, binance: '4h' }
}

async function fetchCoinbase(symbol: string, interval: string): Promise<Candle[]> {
  const product = COINBASE_PRODUCTS[symbol]
  if (!product) throw new Error("Coinbase pair yo'q")
  if (interval === '4h') throw new Error('Coinbase 4h granularity unsupported')
  const granularity = intervalConfig(interval).coinbase
  const res = await fetch(`https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/candles?granularity=${granularity}`, { cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' } })
  if (!res.ok) throw new Error(`Coinbase ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data) || data.length < 60) throw new Error('Coinbase insufficient candles')
  return data.map((k: number[]) => ({ time: k[0] * 1000, low: +k[1], high: +k[2], open: +k[3], close: +k[4], volume: +k[5] })).sort((a, b) => a.time - b.time)
}

async function fetchKraken(symbol: string, interval: string): Promise<Candle[]> {
  const pair = KRAKEN_PAIRS[symbol]
  if (!pair) throw new Error("Kraken pair yo'q")
  const intervalMinutes = intervalConfig(interval).kraken
  const res = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${intervalMinutes}`, { cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' } })
  if (!res.ok) throw new Error(`Kraken ${res.status}`)
  const json = await res.json()
  if (json.error?.length) throw new Error(`Kraken ${json.error.join(', ')}`)
  const key = Object.keys(json.result || {}).find(k => k !== 'last')
  const data = key ? json.result[key] : null
  if (!Array.isArray(data) || data.length < 60) throw new Error('Kraken insufficient candles')
  return data.map((k: any[]) => ({ time: +k[0] * 1000, open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[6] })).sort((a, b) => a.time - b.time)
}

async function fetchBinance(symbol: string, interval: string): Promise<Candle[]> {
  const binanceSymbol = ALIASES[symbol] || `${symbol}USDT`
  const binanceInterval = intervalConfig(interval).binance
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${encodeURIComponent(binanceInterval)}&limit=150`, { cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' } })
  if (!res.ok) throw new Error(`Binance ${res.status}`)
  const rawData = await res.json()
  if (!Array.isArray(rawData) || rawData.length < 60) throw new Error('Binance insufficient candles')
  return rawData.map((k: any[]) => ({ time: +k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }))
}

async function fetchMarketData(symbol: string, interval: string) {
  const errors: string[] = []
  const providers = interval === '4h'
    ? [
        ['Binance', fetchBinance],
        ['Kraken', fetchKraken],
      ] as const
    : [
        ['Coinbase Exchange', fetchCoinbase],
        ['Kraken', fetchKraken],
        ['Binance', fetchBinance],
      ] as const

  for (const [provider, fetcher] of providers) {
    try {
      return { candles: await fetcher(symbol, interval), provider }
    } catch (e: any) {
      errors.push(`${provider}: ${e?.message || 'error'}`)
    }
  }

  throw new Error(`Market data topilmadi. ${errors.join(' | ')}`)
}

function emaSeries(candles: Candle[], period: number): number[] {
  const first = candles[0]?.close || 0
  const k = 2 / (period + 1)
  let ema = first
  return candles.map((c, i) => { if (i > 0) ema = c.close * k + ema * (1 - k); return ema })
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

function higherInterval(interval: string): string | null { if (interval === '1h') return '4h'; if (interval === '4h') return '1d'; return null }

async function notifyTelegramForNewSignal(symbol: string, interval: string, candles: Candle[]) {
  if (!candles.length || interval === '15m') return
  const closedCandles = candles.length > 1 ? candles.slice(0, -1) : candles
  if (closedCandles.length < 60) return
  const ema20 = emaSeries(closedCandles, 20), ema50 = emaSeries(closedCandles, 50), rsi = rsiSeries(closedCandles)
  let higherTimeframe: SignalInput['higherTimeframe'] | undefined
  const higher = higherInterval(interval)
  if (higher) {
    try {
      const higherData = await fetchMarketData(symbol, higher)
      const higherResult = analyze(higherData.candles, higher)
      higherTimeframe = { ema20: higherResult.ema20, ema50: higherResult.ema50, rsi: higherResult.rsi }
    } catch { higherTimeframe = undefined }
  }
  const inputs: SignalInput[] = closedCandles.map((c, i) => ({ time: c.time, close: c.close, ema20: ema20[i], ema50: ema50[i], rsi: rsi[i], higherTimeframe }))
  const latest = inputs[inputs.length - 1], previous = inputs[inputs.length - 2]
  const latestSignal = calculateSignal(latest), previousSignal = calculateSignal(previous)
  if (!latestSignal || latestSignal.type === previousSignal?.type) return
  const signal: { side: typeof latestSignal.type; symbol: string; timeframe: 'H1' | 'H4' | 'D1'; entryLow: number; entryHigh: number; tp: number[]; sl: number } = { side: latestSignal.type, symbol, timeframe: interval === '1h' ? 'H1' : interval === '4h' ? 'H4' : 'D1', entryLow: latestSignal.entryLow, entryHigh: latestSignal.entryHigh, tp: [latestSignal.tp1, latestSignal.tp2, latestSignal.tp3], sl: latestSignal.stopLoss }
  const redis = getRedis()
  if (!redis) { console.error('Telegram signal deduplication unavailable: Upstash Redis is not configured'); return }
  const redisKey = `goldenweb:telegram-signal:${symbol}:${interval}:${latest.time}:${latestSignal.type}`
  const claimed = await redis.set(redisKey, '1', { nx: true, ex: 60 * 60 * 24 * 30 })
  // Upstash: "OK" | null; ba'zi clientlar true | null qaytaradi
  if (claimed !== 'OK' && claimed !== true) return
  try { await sendTelegramSignal(signal) } catch (error) { await redis.del(redisKey); throw error }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const raw = (q.get('symbol') || 'BTC').toUpperCase()
  const symbol = raw.replace(/[^A-Z0-9]/g, '')
  const requested = q.get('interval') || '1h'
  const interval = ALLOWED_INTERVALS.includes(requested) ? requested : '1h'

  try {
    const { candles, provider } = await fetchMarketData(symbol, interval)
    const result = analyze(candles, interval)
    const scannerSecret = process.env.CRON_SECRET
    const scannerHeader = req.headers.get('x-signal-scanner-secret')
    const isScannerRequest = Boolean(scannerSecret) && scannerHeader === scannerSecret
    if (isScannerRequest) {
      try { await notifyTelegramForNewSignal(symbol, interval, candles) } catch (telegramError) { console.error('Telegram signal notification failed:', telegramError) }
    }
    return NextResponse.json({ symbol, interval, provider, candles, result, generatedAt: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Market data serveriga ulanib bo'lmadi." }, { status: 502 })
  }
}
