import { getRedis } from '@/lib/redis'

export type SignalDedupInput = {
  symbol: string
  interval: string
  side: 'BUY' | 'SELL'
  candleTime: number
  entryLow: number
  entryHigh: number
  tp1: number
  tp2: number
  tp3: number
  sl: number
}

function normalize(value: number): string {
  return Number.isFinite(value) ? value.toPrecision(12) : 'NaN'
}

function keyFor(signal: SignalDedupInput): string {
  return [
    'telegram-signal',
    signal.symbol.toUpperCase(),
    signal.interval.toLowerCase(),
    signal.side,
    signal.candleTime,
    normalize(signal.entryLow),
    normalize(signal.entryHigh),
    normalize(signal.tp1),
    normalize(signal.tp2),
    normalize(signal.tp3),
    normalize(signal.sl),
  ].join(':')
}

export async function claimSignal(signal: SignalDedupInput): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true

  const key = keyFor(signal)
  const result = await redis.set(key, '1', { nx: true, ex: 60 * 60 * 24 * 14 })
  return result === 'OK'
}

export async function releaseSignalClaim(signal: SignalDedupInput): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await redis.del(keyFor(signal))
}
