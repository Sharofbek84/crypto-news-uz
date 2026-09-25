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
  'PLUME',
  'MYX',
  'WCT',
  'WLD',
] as const

export const HEATMAP_ALERT_TFS = [
  { key: 'H4', interval: '4h' },
  { key: 'D1', interval: '1d' },
] as const

/** Yuqoriga kesish darajalari */
export const RSI_UP_LEVELS = [70, 80, 90] as const
/** Pastga kesish darajalari */
export const RSI_DOWN_LEVELS = [30, 20, 10] as const

type Candle = [string, string, string, string, string, string, string?]

export type RsiCross = {
  coin: string
  tf: string
  prev: number
  current: number
  direction: 'up' | 'down'
  level: number
  label: string
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

export async function fetchGateRsi(symbol: string, interval: string): Promise<number | null> {
  const url = new URL('https://api.gateio.ws/api/v4/spot/candlesticks')
  url.searchParams.set('currency_pair', `${symbol}_USDT`)
  url.searchParams.set('interval', interval)
  url.searchParams.set('limit', '150')

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'GoldenWeb-Heatmap-RSI/1.0' },
  })
  if (!res.ok) throw new Error(`Gate.io ${symbol} ${interval}: ${res.status}`)

  const rows = (await res.json()) as Candle[]
  if (!Array.isArray(rows) || rows.length === 0) return null

  const sorted = [...rows].sort((a, b) => Number(a[0]) - Number(b[0]))
  const closes = sorted.map((row) => Number(row[2])).filter((v) => Number.isFinite(v))
  const rsi = calculateRSI(closes)
  return rsi == null ? null : Math.round(rsi * 10) / 10
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
  const raw = await redis.get<string | number>(stateKey(coin, tf))
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

export async function setStoredRsi(coin: string, tf: string, rsi: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  // 14 kun saqlash — yetarli history
  await redis.set(stateKey(coin, tf), String(rsi), { ex: 60 * 60 * 24 * 14 })
}

/** Bir xil daraja kesishini qayta-yubormaslik (12 soat) */
export async function claimRsiAlert(
  coin: string,
  tf: string,
  direction: 'up' | 'down',
  level: number
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true
  const result = await redis.set(alertKey(coin, tf, direction, level), '1', {
    nx: true,
    ex: 60 * 60 * 12,
  })
  return result === 'OK'
}

function labelFor(direction: 'up' | 'down', level: number): string {
  if (direction === 'up') {
    if (level >= 90) return 'Kuchli overbought (90+)'
    if (level >= 80) return 'Kuchli overbought (80+)'
    return 'Overbought (70+)'
  }
  if (level <= 10) return 'Kuchli oversold (10−)'
  if (level <= 20) return 'Kuchli oversold (20−)'
  return 'Oversold (30−)'
}

/** prev → current orasida kesilgan barcha ekstremal darajalar */
export function detectCrosses(prev: number | null, current: number): RsiCross[] {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(current)) return []
  if (prev === current) return []

  const crosses: Omit<RsiCross, 'coin' | 'tf'>[] = []

  if (current > prev) {
    for (const level of RSI_UP_LEVELS) {
      if (prev < level && current >= level) {
        crosses.push({
          prev,
          current,
          direction: 'up',
          level,
          label: labelFor('up', level),
        })
      }
    }
  } else {
    for (const level of RSI_DOWN_LEVELS) {
      if (prev > level && current <= level) {
        crosses.push({
          prev,
          current,
          direction: 'down',
          level,
          label: labelFor('down', level),
        })
      }
    }
  }

  return crosses as RsiCross[]
}

export async function sendTelegramRsiAlerts(crosses: RsiCross[]): Promise<void> {
  if (!crosses.length) return

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram Environment Variables topilmadi')

  const lines = crosses.map((c) => {
    const arrow = c.direction === 'up' ? '⬆️' : '⬇️'
    const emoji = c.direction === 'up' ? '🔴' : '🟢'
    return [
      `${emoji} <b>${c.coin}/USDT · ${c.tf}</b>`,
      `${arrow} RSI ${c.prev.toFixed(1)} → <b>${c.current.toFixed(1)}</b>`,
      `Kesildi: <b>${c.level}</b> — ${c.label}`,
    ].join('\n')
  })

  let message = `<b>📊 HEATMAP RSI OGOHLANTIRISH</b>\n\n${lines.join('\n\n')}\n\nhttps://goldenweb.uz`

  if (message.length > 4096) {
    message = message.slice(0, 4050).trimEnd() + '\n\n…'
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Telegram API xatosi: ${response.status} ${await response.text()}`)
  }
  const result = await response.json()
  if (!result?.ok) throw new Error(`Telegram API xatosi: ${JSON.stringify(result)}`)
}
