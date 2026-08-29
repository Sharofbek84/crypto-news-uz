import { NextResponse } from 'next/server'
import { computeStats, getTrackableSignals, listRecentSignals } from '@/lib/signal-tracker'

export async function GET() {
  // Noto'g'ri expired signallarni qayta ochadi (10 kun ichida)
  try {
    await getTrackableSignals()
  } catch {
    // ignore heal errors — still return whatever is in Redis
  }

  const stats = await computeStats()
  if (!stats) {
    return NextResponse.json({
      stats: null,
      recent: [],
      message: 'Statistika hozircha mavjud emas',
      generatedAt: new Date().toISOString(),
    })
  }

  const recent = await listRecentSignals(20)

  return NextResponse.json({
    stats: {
      total: stats.total,
      open: stats.open,
      tp1: stats.tp1,
      tp2: stats.tp2,
      tp3: stats.tp3,
      sl: stats.sl,
      expired: stats.expired,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
    },
    recent,
    generatedAt: new Date().toISOString(),
  })
}
