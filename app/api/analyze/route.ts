import { NextRequest, NextResponse } from 'next/server'
import { analyze, Candle } from '@/lib/technical'

const ALIASES: Record<string, string> = {
  BTC: 'BTCUSDT', ETH: 'ETHUSDT', LTC: 'LTCUSDT', SOL: 'SOLUSDT', BNB: 'BNBUSDT',
  NEAR: 'NEARUSDT', GRAM: 'TONUSDT', SUI: 'SUIUSDT', APT: 'APTUSDT', ATOM: 'ATOMUSDT',
  XAUT: 'XAUTUSDT', XRP: 'XRPUSDT', XLM: 'XLMUSDT', TRX: 'TRXUSDT', HYPE: 'HYPEUSDT', BCH: 'BCHUSDT',
  ZEC: 'ZECUSDT', LINK: 'LINKUSDT', AVAX: 'AVAXUSDT', ONDO: 'ONDOUSDT', WLD: 'WLDUSDT',
}

const COINBASE_PRODUCTS: Record<string, string> = {
  BTC: 'BTC-USD', ETH: 'ETH-USD', LTC: 'LTC-USD', SOL: 'SOL-USD', BNB: 'BNB-USD',
  NEAR: 'NEAR-USD', SUI: 'SUI-USD', APT: 'APT-USD', ATOM: 'ATOM-USD',
  XRP: 'XRP-USD', XLM: 'XLM-USD', BCH: 'BCH-USD', LINK: 'LINK-USD', AVAX: 'AVAX-USD',
}

const KRAKEN_PAIRS: Record<string, string> = {
  BTC: 'XBTUSD', ETH: 'ETHUSD', LTC: 'LTCUSD', SOL: 'SOLUSD',
  XRP: 'XRPUSD', XLM: 'XLMUSD', BCH: 'BCHUSD', LINK: 'LINKUSD', AVAX: 'AVAXUSD',
  ATOM: 'ATOMUSD', NEAR: 'NEARUSD', SUI: 'SUIUSD',
}

const ALLOWED_INTERVALS = ['15m', '1h', '4h', '1d']

function intervalConfig(interval: string) {
  if (interval === '15m') return { coinbase: 900, kraken: 15, binance: '15m' }
  if (interval === '1d') return { coinbase: 86400, kraken: 1440, binance: '1d' }
  if (interval === '1h') return { coinbase: 3600, kraken: 60, binance: '1h' }
  return { coinbase: 14400, kraken: 240, binance: '4h' }
}

async function fetchCoinbase(symbol: string, interval: string): Promise<Candle[]> {
  const product = COINBASE_PRODUCTS[symbol]
  if (!product) throw new Error('Coinbase pair yo\'q')
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
  const pair = KRAKEN_PAIRS[symbol]
  if (!pair) throw new Error('Kraken pair yo\'q')
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

async function fetchBinance(symbol: string, interval: string): Promise<Candle[]> {
  const binanceSymbol = ALIASES[symbol] || `${symbol}USDT`
  const binanceInterval = intervalConfig(interval).binance
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${encodeURIComponent(binanceInterval)}&limit=150`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'Crypto-AI-Analyst/1.0' },
  })
  if (!res.ok) throw new Error(`Binance ${res.status}`)
  const rawData = await res.json()
  if (!Array.isArray(rawData) || rawData.length < 60) throw new Error('Binance insufficient candles')
  return rawData.map((k: any[]) => ({
    time: +k[0],
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4],
    volume: +k[5],
  }))
}

async function fetchMarketData(symbol: string, interval: string) {
  const errors: string[] = []
  try {
    return { candles: await fetchCoinbase(symbol, interval), provider: 'Coinbase Exchange' }
  } catch (e: any) {
    errors.push(e?.message || 'Coinbase error')
  }
  try {
    return { candles: await fetchKraken(symbol, interval), provider: 'Kraken' }
  } catch (e: any) {
    errors.push(e?.message || 'Kraken error')
  }
  try {
    return { candles: await fetchBinance(symbol, interval), provider: 'Binance' }
  } catch (e: any) {
    errors.push(e?.message || 'Binance error')
  }
  throw new Error(`Market data topilmadi. ${errors.join(' | ')}`)
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
    return NextResponse.json({ symbol, interval, provider, candles, result, generatedAt: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Market data serveriga ulanib bo\'lmadi.' }, { status: 502 })
  }
}
