import { Redis } from '@upstash/redis'
import { getRedis } from '@/lib/redis'

export type TrackedSignal = {
  id: string
  symbol: string
  interval: string
  timeframe: string
  side: 'BUY' | 'SELL'
  entryLow: number
  entryHigh: number
  tp1: number
  tp2: number
  tp3: number
  sl: number
  /** Signal candle close time (ms) */
  signalTime: number
  createdAt: string
  status: 'open' | 'tp1' | 'tp2' | 'tp3' | 'sl' | 'expired'
  outcomeAt?: string
  outcomePrice?: number
}

export type SignalStats = {
  total: number
  open: number
  tp1: number
  tp2: number
  tp3: number
  sl: number
  expired: number
  /** Closed signals that hit any TP (tp1+tp2+tp3) */
  wins: number
  losses: number
  winRate: number | null
  byTimeframe: Record<string, { total: number; wins: number; losses: number; open: number }>
  bySymbol: Record<string, { total: number; wins: number; losses: number; open: number }>
}

const OPEN_SET = 'goldenweb:signals:open'
const ALL_SET = 'goldenweb:signals:all'
const SIGNAL_PREFIX = 'goldenweb:signal:'
const MAX_AGE_MS = 60 * 60 * 24 * 21 // 21 kun — ochiq signal muddati

function signalKey(id: string) {
  return `${SIGNAL_PREFIX}${id}`
}

export function buildSignalId(
  symbol: string,
  interval: string,
  signalTime: number,
  side: string
) {
  return `${symbol}:${interval}:${signalTime}:${side}`
}

export async function saveTrackedSignal(
  signal: Omit<TrackedSignal, 'status' | 'createdAt'> & { status?: TrackedSignal['status'] }
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const record: TrackedSignal = {
    ...signal,
    status: signal.status || 'open',
    createdAt: new Date().toISOString(),
  }

  const key = signalKey(record.id)
  await redis.set(key, JSON.stringify(record), { ex: 60 * 60 * 24 * 60 }) // 60 kun
  await redis.sadd(OPEN_SET, record.id)
  await redis.sadd(ALL_SET, record.id)
}

export async function getOpenSignalIds(redis: Redis): Promise<string[]> {
  const ids = await redis.smembers(OPEN_SET)
  return (ids || []).map(String)
}

export async function getTrackedSignal(
  redis: Redis,
  id: string
): Promise<TrackedSignal | null> {
  const raw = await redis.get<string>(signalKey(id))
  if (!raw) return null
  if (typeof raw === 'object') return raw as TrackedSignal
  try {
    return JSON.parse(String(raw)) as TrackedSignal
  } catch {
    return null
  }
}

type CandleHL = { time: number; high: number; low: number; close: number }

/**
 * Candles chronologically after signalTime.
 * First touch wins: SL vs TPs (TP1 before TP2 before TP3 if same candle both hit, higher priority to SL if both extremes touch).
 */
export function evaluateOutcome(
  signal: TrackedSignal,
  candles: CandleHL[]
): { status: TrackedSignal['status']; outcomePrice: number; outcomeAt: string } | null {
  const after = candles.filter((c) => c.time > signal.signalTime)
  if (!after.length) return null

  const now = Date.now()
  if (now - signal.signalTime > MAX_AGE_MS) {
    return {
      status: 'expired',
      outcomePrice: after[after.length - 1].close,
      outcomeAt: new Date().toISOString(),
    }
  }

  for (const c of after) {
    if (signal.side === 'BUY') {
      const hitSl = c.low <= signal.sl
      const hitTp1 = c.high >= signal.tp1
      const hitTp2 = c.high >= signal.tp2
      const hitTp3 = c.high >= signal.tp3

      // Same candle: agar SL va TP birga tegsa — SL ustun (konservativ)
      if (hitSl && (hitTp1 || hitTp2 || hitTp3)) {
        return { status: 'sl', outcomePrice: signal.sl, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitSl) {
        return { status: 'sl', outcomePrice: signal.sl, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitTp3) {
        return { status: 'tp3', outcomePrice: signal.tp3, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitTp2) {
        return { status: 'tp2', outcomePrice: signal.tp2, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitTp1) {
        return { status: 'tp1', outcomePrice: signal.tp1, outcomeAt: new Date(c.time).toISOString() }
      }
    } else {
      const hitSl = c.high >= signal.sl
      const hitTp1 = c.low <= signal.tp1
      const hitTp2 = c.low <= signal.tp2
      const hitTp3 = c.low <= signal.tp3

      if (hitSl && (hitTp1 || hitTp2 || hitTp3)) {
        return { status: 'sl', outcomePrice: signal.sl, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitSl) {
        return { status: 'sl', outcomePrice: signal.sl, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitTp3) {
        return { status: 'tp3', outcomePrice: signal.tp3, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitTp2) {
        return { status: 'tp2', outcomePrice: signal.tp2, outcomeAt: new Date(c.time).toISOString() }
      }
      if (hitTp1) {
        return { status: 'tp1', outcomePrice: signal.tp1, outcomeAt: new Date(c.time).toISOString() }
      }
    }
  }

  return null
}

export async function closeTrackedSignal(
  redis: Redis,
  signal: TrackedSignal,
  status: TrackedSignal['status'],
  outcomePrice: number,
  outcomeAt: string
): Promise<TrackedSignal> {
  const updated: TrackedSignal = {
    ...signal,
    status,
    outcomePrice,
    outcomeAt,
  }
  await redis.set(signalKey(signal.id), JSON.stringify(updated), { ex: 60 * 60 * 24 * 60 })
  if (status !== 'open') {
    await redis.srem(OPEN_SET, signal.id)
  }
  return updated
}

export async function computeStats(): Promise<SignalStats | null> {
  const redis = getRedis()
  if (!redis) return null

  const ids = (await redis.smembers(ALL_SET)) || []
  const stats: SignalStats = {
    total: 0,
    open: 0,
    tp1: 0,
    tp2: 0,
    tp3: 0,
    sl: 0,
    expired: 0,
    wins: 0,
    losses: 0,
    winRate: null,
    byTimeframe: {},
    bySymbol: {},
  }

  for (const id of ids) {
    const s = await getTrackedSignal(redis, String(id))
    if (!s) continue
    stats.total++

    const tf = s.timeframe || s.interval
    if (!stats.byTimeframe[tf]) stats.byTimeframe[tf] = { total: 0, wins: 0, losses: 0, open: 0 }
    if (!stats.bySymbol[s.symbol]) stats.bySymbol[s.symbol] = { total: 0, wins: 0, losses: 0, open: 0 }
    stats.byTimeframe[tf].total++
    stats.bySymbol[s.symbol].total++

    if (s.status === 'open') {
      stats.open++
      stats.byTimeframe[tf].open++
      stats.bySymbol[s.symbol].open++
    } else if (s.status === 'sl') {
      stats.sl++
      stats.losses++
      stats.byTimeframe[tf].losses++
      stats.bySymbol[s.symbol].losses++
    } else if (s.status === 'expired') {
      stats.expired++
    } else if (s.status === 'tp1' || s.status === 'tp2' || s.status === 'tp3') {
      stats[s.status]++
      stats.wins++
      stats.byTimeframe[tf].wins++
      stats.bySymbol[s.symbol].wins++
    }
  }

  const closed = stats.wins + stats.losses
  stats.winRate = closed > 0 ? Math.round((stats.wins / closed) * 1000) / 10 : null
  return stats
}

export async function listRecentSignals(limit = 50): Promise<TrackedSignal[]> {
  const redis = getRedis()
  if (!redis) return []
  const ids = (await redis.smembers(ALL_SET)) || []
  const items: TrackedSignal[] = []
  for (const id of ids) {
    const s = await getTrackedSignal(redis, String(id))
    if (s) items.push(s)
  }
  items.sort((a, b) => b.signalTime - a.signalTime)
  return items.slice(0, limit)
}
