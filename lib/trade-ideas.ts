import {
  HEATMAP_ALERT_COINS,
  HEATMAP_ALERT_TFS,
  fetchGateSnapshot,
} from '@/lib/heatmap-rsi-alert'
import { getRedis } from '@/lib/redis'

export type TradeIdea = {
  rank: number
  coin: string
  tf: string
  side: 'BUY' | 'SELL'
  rsi: number
  score: number
  strength: string
  title: string
  summary: string
  levels: number[]
  levelsLabel: string
}

const CACHE_KEY = 'trade-ideas:top10:v1'
const CACHE_TTL_SEC = 60 * 30 // 30 daqiqa

function money(n: number): string {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
  if (n >= 1) return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return n.toPrecision(4)
}

function strengthLabel(side: 'BUY' | 'SELL', rsi: number): string {
  if (side === 'BUY') {
    if (rsi <= 20) return 'Kuchli oversold'
    if (rsi <= 30) return 'Oversold'
    return 'Yengil oversold'
  }
  if (rsi >= 90) return 'Kuchli overbought'
  if (rsi >= 80) return 'Kuchli overbought'
  if (rsi >= 70) return 'Overbought'
  return 'Yengil overbought'
}

/** RSI ekstremalligiga qarab ball (yuqori = kuchliroq g'oya) */
function scoreIdea(side: 'BUY' | 'SELL', rsi: number, tf: string): number {
  let score = 0
  if (side === 'BUY') {
    // pastroq RSI = yuqori ball
    score = Math.max(0, 40 - rsi) * 2
    if (rsi <= 20) score += 15
    else if (rsi <= 30) score += 8
  } else {
    score = Math.max(0, rsi - 60) * 2
    if (rsi >= 90) score += 15
    else if (rsi >= 80) score += 10
    else if (rsi >= 70) score += 5
  }
  // D1 biroz ustun
  if (tf === 'D1') score += 5
  return Math.round(score * 10) / 10
}

function buildTitle(coin: string, side: 'BUY' | 'SELL', tf: string, strength: string): string {
  const dir = side === 'BUY' ? 'Sotib olish' : 'Sotish'
  return `${coin}/USDT · ${tf} · ${dir} (${strength})`
}

function buildSummary(side: 'BUY' | 'SELL', rsi: number, strength: string, levels: number[]): string {
  const rsiText = `RSI(14): ${rsi.toFixed(1)}`
  if (side === 'BUY') {
    const lv =
      levels.length > 0
        ? ` Yaqin support/buy zonalari: ${levels.map((p, i) => `BUY${i + 1} ${money(p)}`).join(', ')}.`
        : ''
    return `${strength} zona. ${rsiText}.${lv} Narx past zonada — ehtiyotkor long setup ko‘rib chiqilishi mumkin. Risk-menejment majburiy.`
  }
  const lv =
    levels.length > 0
      ? ` Yaqin resistance/sell zonalari: ${levels.map((p, i) => `SELL${i + 1} ${money(p)}`).join(', ')}.`
      : ''
  return `${strength} zona. ${rsiText}.${lv} Narx yuqori zonada — ehtiyotkor short/spot sotish setupi ko‘rib chiqilishi mumkin. Risk-menejment majburiy.`
}

export async function computeTopTradeIdeas(limit = 10): Promise<TradeIdea[]> {
  const jobs = HEATMAP_ALERT_COINS.flatMap((coin) =>
    HEATMAP_ALERT_TFS.map((tf) => ({ coin, tf: tf.key, interval: tf.interval }))
  )

  const CONCURRENCY = 4
  const candidates: Omit<TradeIdea, 'rank'>[] = []

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (job) => {
        const snap = await fetchGateSnapshot(job.coin, job.interval)
        if (snap.rsi == null || !Number.isFinite(snap.rsi)) return null

        const rsi = snap.rsi
        let side: 'BUY' | 'SELL' | null = null
        if (rsi <= 35) side = 'BUY'
        else if (rsi >= 65) side = 'SELL'
        if (!side) return null

        const levels = side === 'BUY' ? snap.buys : snap.sells
        const strength = strengthLabel(side, rsi)
        const score = scoreIdea(side, rsi, job.tf)

        return {
          coin: job.coin,
          tf: job.tf,
          side,
          rsi,
          score,
          strength,
          title: buildTitle(job.coin, side, job.tf, strength),
          summary: buildSummary(side, rsi, strength, levels),
          levels,
          levelsLabel:
            side === 'BUY'
              ? levels.map((p, idx) => `BUY${idx + 1}: ${money(p)}`).join(', ') || '—'
              : levels.map((p, idx) => `SELL${idx + 1}: ${money(p)}`).join(', ') || '—',
        }
      })
    )

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) candidates.push(r.value)
    }
  }

  // Bir coindan eng kuchli TF ni saqlash (D1/H4 dublikatini kamaytirish)
  const bestByCoin = new Map<string, (typeof candidates)[0]>()
  for (const c of candidates) {
    const prev = bestByCoin.get(c.coin)
    if (!prev || c.score > prev.score) bestByCoin.set(c.coin, c)
  }

  const ranked = [...bestByCoin.values()].sort((a, b) => b.score - a.score).slice(0, limit)

  return ranked.map((item, index) => ({ ...item, rank: index + 1 }))
}

export async function getTopTradeIdeas(limit = 10): Promise<{
  ideas: TradeIdea[]
  updatedAt: number
  cached: boolean
}> {
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get<{ ideas: TradeIdea[]; updatedAt: number }>(CACHE_KEY)
      if (cached?.ideas?.length) {
        return { ideas: cached.ideas.slice(0, limit), updatedAt: cached.updatedAt, cached: true }
      }
    } catch {
      // ignore cache errors
    }
  }

  const ideas = await computeTopTradeIdeas(limit)
  const updatedAt = Date.now()

  if (redis) {
    try {
      await redis.set(CACHE_KEY, { ideas, updatedAt }, { ex: CACHE_TTL_SEC })
    } catch {
      // ignore
    }
  }

  return { ideas, updatedAt, cached: false }
}
