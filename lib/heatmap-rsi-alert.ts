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
  current: number
  direction: 'up' | 'down'
  level: number
  label: string
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
  if (candles.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const prev = candles[i - 1].close
    const tr = Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
    trs.push(tr)
  }
  if (!trs.length) return 0
  const n = Math.min(period, trs.length)
  let atr = trs.slice(0, n).reduce((a, b) => a + b, 0) / n
  for (let i = n; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period
  }
  return atr
}

function findSwingPoints(candles: OHLC[], left = 2, right = 2) {
  const swings: { price: number; type: 'high' | 'low'; index: number }[] = []
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i]
    let isHigh = true
    let isLow = true
    for (let j = 1; j <= left; j++) {
      if (candles[i - j].high >= c.high) isHigh = false
      if (candles[i - j].low <= c.low) isLow = false
    }
    for (let j = 1; j <= right; j++) {
      if (candles[i + j].high >= c.high) isHigh = false
      if (candles[i + j].low <= c.low) isLow = false
    }
    if (isHigh) swings.push({ price: c.high, type: 'high', index: i })
    if (isLow) swings.push({ price: c.low, type: 'low', index: i })
  }
  return swings
}

function clusterLevels(prices: number[], tolerance: number) {
  if (!prices.length) return [] as number[]
  const sorted = [...prices].sort((a, b) => a - b)
  const clusters: number[] = []
  let group = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - group[group.length - 1] <= tolerance) group.push(sorted[i])
    else {
      clusters.push(group.reduce((a, b) => a + b, 0) / group.length)
      group = [sorted[i]]
    }
  }
  clusters.push(group.reduce((a, b) => a + b, 0) / group.length)
  return clusters
}

function structureWindow(interval: string) {
  return interval === '1w' ? 52 : interval === '1d' ? 80 : interval === '4h' ? 70 : 48
}

export function computeTradeLevels(
  candles: OHLC[],
  interval: string
): { buys: number[]; sells: number[] } {
  if (!candles.length) return { buys: [], sells: [] }
  const price = candles[candles.length - 1].close
  if (!Number.isFinite(price) || price <= 0) return { buys: [], sells: [] }
  const window = structureWindow(interval)
  const recent = candles.slice(-Math.min(candles.length, window))
  const atr = atrSeries(recent, 14)
  const atrSafe = Number.isFinite(atr) && atr > 0 ? atr : price * 0.01
  const tol =
    price * (interval === '1h' ? 0.002 : interval === '4h' ? 0.003 : interval === '1w' ? 0.005 : 0.004)
  const swings = findSwingPoints(recent, 2, 2)
  const rawLows = swings.filter((s) => s.type === 'low').map((s) => s.price)
  const rawHighs = swings.filter((s) => s.type === 'high').map((s) => s.price)
  if (!rawLows.length) rawLows.push(price - atrSafe)
  if (!rawHighs.length) rawHighs.push(price + atrSafe)
  const support = clusterLevels(rawLows, tol).filter((p) => p < price).sort((a, b) => b - a)
  const resistance = clusterLevels(rawHighs, tol).filter((p) => p > price).sort((a, b) => a - b)
  const minFromPrice = Math.max(atrSafe * 0.6, price * 0.008)
  const maxFromPrice = Math.max(atrSafe * 2, price * 0.02)
  const minBetween = Math.max(atrSafe * 0.8, price * 0.005)
  const maxBetween = Math.max(atrSafe * 2, price * 0.02)
  const supportsBelow = support.filter((v) => {
    const d = price - v
    return d >= minFromPrice && d <= maxFromPrice
  }).sort((a, b) => b - a)
  const resistsAbove = resistance.filter((v) => {
    const d = v - price
    return d >= minFromPrice && d <= maxFromPrice
  }).sort((a, b) => a - b)
  function pickTwo(ordered: number[], direction: 'down' | 'up'): number[] {
    const firstDefault = direction === 'down' ? price - atrSafe : price + atrSafe
    const first = ordered.length ? ordered[0] : firstDefault
    let second: number | null = null
    for (let i = 1; i < ordered.length; i++) {
      const v = ordered[i]
      const dist = Math.abs(v - first)
      if (dist < minBetween) continue
      if (dist > maxBetween) break
      second = v
      break
    }
    if (second == null) second = direction === 'down' ? first - atrSafe : first + atrSafe
    return [first, second]
  }
  return { buys: pickTwo(supportsBelow, 'down'), sells: pickTwo(resistsAbove, 'up') }
}

export async function fetchGateSnapshot(
  symbol: string,
  interval: string
): Promise<{ rsi: number | null; buys: number[]; sells: number[] }> {
  const url = new URL('https://api.gateio.ws/api/v4/spot/candlesticks')
  url.searchParams.set('currency_pair', `${symbol}_USDT`)
  url.searchParams.set('interval', interval)
  url.searchParams.set('limit', '150')
  const res = await fetch(url.toString(), { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Gate.io ${symbol} ${interval}: ${res.status}`)
  const rows = (await res.json()) as GateCandle[]
  if (!Array.isArray(rows) || rows.length === 0) return { rsi: null, buys: [], sells: [] }
  const sorted = [...rows].sort((a, b) => Number(a[0]) - Number(b[0]))
  const candles: OHLC[] = sorted.map((row) => ({
    time: Number(row[0]),
    open: Number(row[5]),
    high: Number(row[3]),
    low: Number(row[4]),
    close: Number(row[2]),
  }))
  const closes = candles.map((c) => c.close).filter((v) => Number.isFinite(v))
  const rsi = calculateRSI(closes)
  const levels = computeTradeLevels(candles, interval)
  return { rsi: rsi == null ? null : Math.round(rsi * 10) / 10, buys: levels.buys, sells: levels.sells }
}

export async function fetchGateRsi(symbol: string, interval: string): Promise<number | null> {
  const snap = await fetchGateSnapshot(symbol, interval)
  return snap.rsi
}

function stateKey(coin: string, tf: string) {
  return `heatmap:rsi:prev:${coin}:${tf}`
}

function alertKey(coin: string, tf: string, direction: string, level: number) {
  return `heatmap:rsi:alert:${coin}:${tf}:${direction}:${level}`
}

export async function getStoredRsi(coin: string, tf: string): Promise<number | null> {
  try {
    const redis = getRedis()
    if (!redis) return null
    const raw = await redis.get(stateKey(coin, tf))
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export async function setStoredRsi(coin: string, tf: string, rsi: number): Promise<void> {
  try {
    const redis = getRedis()
    if (!redis) return
    await redis.set(stateKey(coin, tf), String(rsi), { ex: 60 * 60 * 36 })
  } catch {
    /* ignore */
  }
}

export async function claimRsiAlert(
  coin: string,
  tf: string,
  direction: string,
  level: number
): Promise<boolean> {
  try {
    const redis = getRedis()
    if (!redis) return true
    const key = alertKey(coin, tf, direction, level)
    const ok = await redis.set(key, '1', { nx: true, ex: ALERT_DEDUP_HOURS * 3600 })
    return Boolean(ok)
  } catch {
    return true
  }
}

function labelFor(direction: 'up' | 'down', level: number): string {
  if (direction === 'up') {
    if (level >= 90) return 'RSI 90+ (ekstrem overbought)'
    if (level >= 80) return 'RSI 80+ (kuchli overbought)'
    return 'RSI 70+ (overbought)'
  }
  if (level <= 10) return 'RSI 10- (ekstrem oversold)'
  if (level <= 20) return 'RSI 20- (kuchli oversold)'
  return 'RSI 30- (oversold)'
}

export function detectCrosses(
  prev: number | null,
  current: number
): Omit<RsiCross, 'coin' | 'tf' | 'buys' | 'sells'>[] {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(current)) return []
  const out: Omit<RsiCross, 'coin' | 'tf' | 'buys' | 'sells'>[] = []
  for (const level of RSI_UP_LEVELS) {
    if (prev < level && current >= level) {
      out.push({ prev, current, direction: 'up', level, label: labelFor('up', level) })
    }
  }
  for (const level of RSI_DOWN_LEVELS) {
    if (prev > level && current <= level) {
      out.push({ prev, current, direction: 'down', level, label: labelFor('down', level) })
    }
  }
  return out
}

function money(n: number): string {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}

function formatLevelsLine(direction: 'up' | 'down', buys: number[], sells: number[]): string {
  if (direction === 'up') {
    const s = sells.map((x, i) => `S${i + 1}: $${money(x)}`).join(' | ')
    return s ? `Sell levels: ${s}` : 'Sell levels: -'
  }
  const b = buys.map((x, i) => `B${i + 1}: $${money(x)}`).join(' | ')
  return b ? `Buy levels: ${b}` : 'Buy levels: -'
}

export async function sendTelegramRsiAlerts(crosses: RsiCross[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId || crosses.length === 0) return
  for (const c of crosses) {
    const claimed = await claimRsiAlert(c.coin, c.tf, c.direction, c.level)
    if (!claimed) continue
    const emoji = c.direction === 'up' ? '🔴' : '🟢'
    const title = c.direction === 'up' ? 'RSI OVERBOUGHT' : 'RSI OVERSOLD'
    const text = [
      `${emoji} <b>${title}</b>`,
      `<b>${c.coin}</b> · ${c.tf}`,
      c.label,
      `RSI: ${c.prev.toFixed(1)} → <b>${c.current.toFixed(1)}</b>`,
      formatLevelsLine(c.direction, c.buys, c.sells),
      `<a href="${HEATMAP_URL}">RSI Heatmap</a>`,
    ].join('\n')
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
