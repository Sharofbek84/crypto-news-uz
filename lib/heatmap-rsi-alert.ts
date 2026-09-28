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

export async function fetchCandles(symbol: string, interval: string): Promise<OHLC[]> {
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
  if (!Array.isArray(rows) || rows.length === 0) return []
  return [...rows]
    .map((row) => ({
      time: Number(row[0]),
      open: Number(row[5]),
      high: Number(row[3]),
      low: Number(row[4]),
      close: Number(row[2]),
    }))
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time)
}

export function detectRsiCrosses(
  coin: string,
  tf: string,
  candles: OHLC[],
): RsiCross[] {
  if (candles.length < 20) return []
  const closes = candles.map((c) => c.close)
  const curr = calculateRSI(closes)
  const prev = calculateRSI(closes.slice(0, -1))
  if (curr == null || prev == null) return []
  const price = candles[candles.length - 1]?.close ?? null
  const crosses: RsiCross[] = []
  for (const level of RSI_UP_LEVELS) {
    if (prev < level && curr >= level) {
      crosses.push({ coin, tf, prev, curr, level, direction: 'up', price })
    }
  }
  for (const level of RSI_DOWN_LEVELS) {
    if (prev > level && curr <= level) {
      crosses.push({ coin, tf, prev, curr, level, direction: 'down', price })
    }
  }
  return crosses
}

function alertKey(cross: RsiCross) {
  return `heatmap:rsi:${cross.coin}:${cross.tf}:${cross.direction}:${cross.level}`
}

export async function shouldSendAlert(cross: RsiCross): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true
  const key = alertKey(cross)
  try {
    const exists = await redis.get(key)
    if (exists) return false
    await redis.set(key, String(Date.now()), { ex: ALERT_DEDUP_HOURS * 3600 })
    return true
  } catch {
    return true
  }
}

export function formatAlertMessage(cross: RsiCross): string {
  const arrow = cross.direction === 'up' ? '⬆️' : '⬇️'
  const side = cross.direction === 'up' ? 'yuqoriga' : 'pastga'
  const priceStr =
    cross.price != null && Number.isFinite(cross.price)
      ? cross.price >= 1
        ? cross.price.toLocaleString('en-US', { maximumFractionDigits: 4 })
        : cross.price.toPrecision(4)
      : '—'
  return [
    `${arrow} <b>RSI signal</b>: <b>${cross.coin}</b> · ${cross.tf}`,
    `RSI ${side} ${cross.level} darajasini kesib o'tdi`,
    `Oldingi: ${cross.prev.toFixed(1)} → Hozir: ${cross.curr.toFixed(1)}`,
    `Narx: $${priceStr}`,
    `<a href="${HEATMAP_URL}">RSI Heatmap</a>`,
  ].join('\n')
}

export async function sendTelegramAlert(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
