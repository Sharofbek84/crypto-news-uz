import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const RECENT_SIGNALS_KEY = 'signals:recent'

export type RecentSignal = {
  side: 'BUY' | 'SELL'
  symbol: string
  timeframe: 'H1' | 'H4' | 'D1'
  entryLow: number
  entryHigh: number
  tp: number[]
  sl: number
  trend?: string | null
  rsi?: number | null
  createdAt: string
}

export async function GET() {
  try {
    const redis = getRedis()
    if (!redis) {
      return NextResponse.json({ signals: [], source: 'none' })
    }

    const raw = await redis.lrange(RECENT_SIGNALS_KEY, 0, 9)
    const signals: RecentSignal[] = []

    for (const item of raw) {
      try {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item
        if (parsed && parsed.symbol && parsed.side && parsed.timeframe) {
          signals.push(parsed as RecentSignal)
        }
      } catch {
        // skip invalid entries
      }
    }

    return NextResponse.json({
      signals,
      count: signals.length,
      source: 'redis',
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Recent signals fetch failed:', error)
    return NextResponse.json({ signals: [], source: 'error' })
  }
}
