import { getRedis } from '@/lib/redis'

export const HEATMAP_ALERT_COINS = [
  'BTC',
  'ETH',
  'LTC',
  'SOL',
  'BNB',
  'NEAR',
  'GRAM',
  'SUI',
  'APT',
  'ATOM',
  'TIA',
  'CORE',
  'FHE',
  'MYX',
  'WCT',
  'GTAI',
] as const

export const HEATMAP_ALERT_TFS = [
  { key: 'H4', interval: '4h' },
  { key: 'D1', interval: '1d' },
] as const

export const RSI_UP_LEVELS = [70, 80, 90] as const
export const RSI_DOWN_LEVELS = [30, 20, 10] as const

const ALERT_DEDUP_HOURS = 8
const HEATMAP_URL = 'https://www.goldenweb.uz/spot-heatmap'

type GateCandle = [string, string, string, string, string, string, string?]

type OHLC = { time: number; open: number; high: number; low: number; close: number }

export type RsiCross = {
  coin: string
  tf: string
  prev: number
  curr: number
  level: number
  direction: 'up' | 'down'
  price: number | null
  buys: number[]
  sells: number[]
}

function calculateRSI(closes: number[], period = 14): number | null {
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
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function atrSeries(candles: OHLC[], period = 14): number {
  if (candles.length < period + 1) return 0
  let sum = 0
  for (let i = 1; i <= period; i++) {
    const c = candles[i]
    const p = candles[i - 1]
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close))
    sum += tr
  }
  let atr = sum / period
  for (let i = period + 1; i < candles.length; i++) {
    const c = candles[i]
    const p = candles[i - 1]
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close))
    atr = (atr * (period - 1) + tr) / period
  }
  return atr
}

function findSwingPoints(candles: OHLC[], left = 2, right = 2) {
  const highs: number[] = []
  const lows: number[] = []
  for (let i = left; i < candles.length - right; i++) {
    let isHigh = true
    let isLow = true
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue
      if (candles[j].high >= candles[i].high) isHigh = false
      if (candles[j].low <= candles[i].low) isLow = false
    }
    if (isHigh) highs.push(candles[i].high)
    if (isLow) lows.push(candles[i].low)
  }
  return { highs, lows }
}

function clusterLevels(prices: number[], tolerance: number) {
  if (!prices.length) return []
  const sorted = [...prices].sort((a, b) => a - b)
  const clusters: number[][] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const last = clusters[clusters.length - 1]
    if (Math.abs(sorted[i] - last[last.length - 1]) <= tolerance) last.push(sorted[i])
    else clusters.push([sorted[i]])
  }
  return clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length)
}

function structureWindow(interval: string) {
  if (interval === '4h') return 48
  if (interval === '1d') return 60
  return 40
}

export function computeTradeLevels(candles: OHLC[], interval: string): { buys: number[]; sells: number[] } {
  if (candles.length < 20) return { buys: [], sells: [] }
  const window = structureWindow(interval)
  const slice = candles.slice(-window)
  const atr = atrSeries(slice)
  const tol = Math.max(atr * 0.35, slice[slice.length - 1].close * 0.002)
  const { highs, lows } = findSwingPoints(slice)
  const support = clusterLevels(lows, tol).sort((a, b) => b - a)
  const resistance = clusterLevels(highs, tol).sort((a, b) => a - b)
  const price = slice[slice.length - 1].close

  function pickTwo(ordered: number[], direction: 'down' | 'up'): number[] {
    const out: number[] = []
    for (const lvl of ordered) {
      if (direction === 'down' && lvl < price) out.push(lvl)
      if (direction === 'up' && lvl > price) out.push(lvl)
      if (out.length >= 2) break
    }
    return out
  }

  return {
    buys: pickTwo(support, 'down'),
    sells: pickTwo(resistance, 'up'),
  }
}

export async function fetchGateSnapshot(
  symbol: string,
  interval: string
): Promise<{ rsi: number | null; buys: number[]; sells: number[] }> {
  const url = new URL('https://api.gateio.ws/api/v4/spot/candlesticks')
  url.searchParams.set('currency_pair', `${symbol}_USDT`)
  url.searchParams.set('interval', interval)
  url.searchParams.set('limit', '150')

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Gate.io ${symbol} ${interval}: ${res.status}`)
  const rows = (await res.json()) as GateCandle[]
  if (!Array.isArray(rows) || rows.length === 0) return { rsi: null, buys: [], sells: [] }

  const candles = [...rows]
    .map((row) => ({
      time: Number(row[0]),
      open: Number(row[5]),
      high: Number(row[3]),
      low: Number(row[4]),
      close: Number(row[2]),
    }))
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time)

  const closes = candles.map((c) => c.close)
  const rsiRaw = calculateRSI(closes)
  const rsi = rsiRaw == null ? null : Math.round(rsiRaw * 10) / 10
  const levels = computeTradeLevels(candles, interval)
  return { rsi, buys: levels.buys, sells: levels.sells }
}

export async function fetchGateRsi(symbol: string, interval: string): Promise<number | null> {
  const { rsi } = await fetchGateSnapshot(symbol, interval)
  return rsi
}

function stateKey(coin: string, tf: string) {
  return `heatmap:rsi:state:${coin}:${tf}`
}

function alertKey(coin: string, tf: string, direction: string, level: number) {
  return `heatmap:rsi:alert:${coin}:${tf}:${direction}:${level}`
}

export async function getStoredRsi(coin: string, tf: string): Promise<number | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const v = await redis.get(stateKey(coin, tf))
    if (v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export async function setStoredRsi(coin: string, tf: string, rsi: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(stateKey(coin, tf), String(rsi), { ex: 60 * 60 * 24 * 7 })
  } catch {
    /* ignore */
  }
}

export async function claimRsiAlert(
  coin: string,
  tf: string,
  direction: string,
  level: number,
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true
  const key = alertKey(coin, tf, direction, level)
  try {
    const exists = await redis.get(key)
    if (exists) return false
    await redis.set(key, String(Date.now()), { ex: ALERT_DEDUP_HOURS * 3600 })
    return true
  } catch {
    return true
  }
}

function labelFor(direction: 'up' | 'down', level: number): string {
  if (direction === 'up') return `RSI ${level}+ (overbought zona)`
  return `RSI ${level}- (oversold zona)`
}

export function detectCrosses(
  prev: number | null,
  current: number,
): Omit<RsiCross, 'coin' | 'tf' | 'buys' | 'sells'>[] {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(current)) return []
  const out: Omit<RsiCross, 'coin' | 'tf' | 'buys' | 'sells'>[] = []
  for (const level of RSI_UP_LEVELS) {
    if (prev < level && current >= level) {
      out.push({ prev, curr: current, level, direction: 'up', price: null })
    }
  }
  for (const level of RSI_DOWN_LEVELS) {
    if (prev > level && current <= level) {
      out.push({ prev, curr: current, level, direction: 'down', price: null })
    }
  }
  return out
}

function money(n: number): string {
  if (!Number.isFinite(n)) return '\u2014'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return n.toPrecision(4)
}

function formatLevelsLine(direction: 'up' | 'down', buys: number[], sells: number[]): string {
  if (direction === 'down') {
    const levels = buys.length ? buys.map((x) => `$${money(x)}`).join(', ') : '\u2014'
    return `Buy zonalar: ${levels}`
  }
  const levels = sells.length ? sells.map((x) => `$${money(x)}`).join(', ') : '\u2014'
  return `Sell zonalar: ${levels}`
}

export async function sendTelegramRsiAlerts(crosses: RsiCross[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId || !crosses.length) return

  for (const cross of crosses) {
    const ok = await claimRsiAlert(cross.coin, cross.tf, cross.direction, cross.level)
    if (!ok) continue
    const arrow = cross.direction === 'up' ? '\ud83d\udd34' : '\ud83d\udfe2'
    const text = [
      `${arrow} <b>${cross.coin}</b> \u00b7 ${cross.tf}`,
      labelFor(cross.direction, cross.level),
      `RSI: ${cross.prev.toFixed(1)} \u2192 <b>${cross.curr.toFixed(1)}</b>`,
      cross.price != null ? `Narx: $${money(cross.price)}` : '',
      formatLevelsLine(cross.direction, cross.buys, cross.sells),
      `<a href="${HEATMAP_URL}">RSI Heatmap ochish</a>`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })
    } catch {
      /* ignore */
    }
  }
}
