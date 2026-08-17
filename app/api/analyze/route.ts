import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'

const ALIASES: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', APT: 'APTUSDT', SUI: 'SUIUSDT',
  XRP: 'XRPUSDT', BNB: 'BNBUSDT', CORE: 'COREUSDT', MYX: 'MYXUSDT', ALEO: 'ALEOUSDT'
}

const COINBASE_PRODUCTS: Record<string, string> = {
  BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', APT: 'APT-USD', SUI: 'SUI-USD',
  XRP: 'XRP-USD', BNB: 'BNB-USD', CORE: 'CORE-USD', ALEO: 'ALEO-USD', MYX: 'MYX-USD'
}

const KRAKEN_PAIRS: Record<string, string> = {
  BTC: 'XBTUSD', ETH: 'ETHUSD', SOL: 'SOLUSD', APT: 'APTUSD', SUI: 'SUIUSD',
  XRP: 'XRPUSD', BNB: 'BNBUSD', CORE: 'COREUSD', ALEO: 'ALEOUSD', MYX: 'MYXUSD'
}

function intervalConfig(interval: string) {
  if (interval === '1d') return { coinbase: 86400, kraken: 1440 }
  if (interval === '1h') return { coinbase: 3600, kraken: 60 }
  return { coinbase: 14400, kraken: 240 }
}

async function fetchCoinbase(symbol: string, interval: string): Promise<Candle[]> {
  const product = COINBASE_PRODUCTS[symbol] || `${symbol}-USD`
  const granularity = intervalConfig(interval).coinbase
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/candles?granularity=${granularity}`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' },
  })
  if (!res.ok) throw new Error(`Coinbase ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data) || data.length < 60) throw new Error('Coinbase insufficient candles')
  return data
    .map((k: number[]) => ({ time: k[0] * 1000, low: +k[1], high: +k[2], open: +k[3], close: +k[4], volume: +k[5] }))
    .sort((a, b) => a.time - b.time)
}

async function fetchKraken(symbol: string, interval: string): Promise<Candle[]> {
  const pair = KRAKEN_PAIRS[symbol] || `${symbol}USD`
  const intervalMinutes = intervalConfig(interval).kraken
  const url = `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${intervalMinutes}`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' },
  })
  if (!res.ok) throw new Error(`Kraken ${res.status}`)
  const json = await res.json()
  if (json.error?.length) throw new Error(`Kraken ${json.error.join(', ')}`)
  const key = Object.keys(json.result || {}).find(k => k !== 'last')
  const data = key ? json.result[key] : null
  if (!Array.isArray(data) || data.length < 60) throw new Error('Kraken insufficient candles')
  return data
    .map((k: any[]) => ({ time: +k[0] * 1000, open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[6] }))
    .sort((a, b) => a.time - b.time)
}

async function fetchMarketData(symbol: string, interval: string) {
  const errors: string[] = []
  try { return { candles: await fetchCoinbase(symbol, interval), provider: 'Coinbase Exchange' } }
  catch (e: any) { errors.push(e?.message || 'Coinbase error') }
  try { return { candles: await fetchKraken(symbol, interval), provider: 'Kraken' } }
  catch (e: any) { errors.push(e?.message || 'Kraken error') }

  // Binance is intentionally the last fallback. Some server regions return HTTP 451.
  const binanceSymbol = ALIASES[symbol] || `${symbol}USDT`
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${encodeURIComponent(interval)}&limit=150`
  try {
    const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' } })
    if (!res.ok) throw new Error(`Binance ${res.status}`)
    const rawData = await res.json()
    if (!Array.isArray(rawData) || rawData.length < 60) throw new Error('Binance insufficient candles')
    return {
      provider: 'Binance',
      candles: rawData.map((k: any[]) => ({ time: +k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }))
    }
  } catch (e: any) { errors.push(e?.message || 'Binance error') }

  throw new Error(`Market data topilmadi. ${errors.join(' | ')}`)
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const raw = (q.get('symbol') || 'BTC').toUpperCase()
  const symbol = raw.replace(/[^A-Z0-9]/g, '')
  const interval = ['1h', '4h', '1d'].includes(q.get('interval') || '') ? (q.get('interval') as string) : '4h'

  try {
    const { candles, provider } = await fetchMarketData(symbol, interval)
    const result = analyze(candles)
    return NextResponse.json({ symbol, interval, provider, candles, result, generatedAt: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Market data serveriga ulanib bo‘lmadi.' }, { status: 502 })
  }
}
