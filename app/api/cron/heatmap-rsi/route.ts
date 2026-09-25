import { NextRequest, NextResponse } from 'next/server'
import {
  HEATMAP_ALERT_COINS,
  HEATMAP_ALERT_TFS,
  claimRsiAlert,
  detectCrosses,
  fetchGateRsi,
  getStoredRsi,
  sendTelegramRsiAlerts,
  setStoredRsi,
  type RsiCross,
} from '@/lib/heatmap-rsi-alert'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CONCURRENCY = 4

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  const externalSecret = request.headers.get('x-cron-secret')

  const authorized =
    Boolean(expectedSecret) &&
    (authorization === `Bearer ${expectedSecret}` || externalSecret === expectedSecret)

  if (!authorized) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const jobs = HEATMAP_ALERT_COINS.flatMap((coin) =>
    HEATMAP_ALERT_TFS.map((tf) => ({ coin, tf: tf.key, interval: tf.interval }))
  )

  const crosses: RsiCross[] = []
  const checked: Array<{ coin: string; tf: string; rsi: number | null; prev: number | null }> = []
  const errors: string[] = []

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (job) => {
        const current = await fetchGateRsi(job.coin, job.interval)
        const prev = await getStoredRsi(job.coin, job.tf)

        if (current != null) {
          const found = detectCrosses(prev, current).map((c) => ({
            ...c,
            coin: job.coin,
            tf: job.tf,
          }))

          for (const cross of found) {
            const claimed = await claimRsiAlert(cross.coin, cross.tf, cross.direction, cross.level)
            if (claimed) crosses.push(cross)
          }

          await setStoredRsi(job.coin, job.tf, current)
        }

        return { coin: job.coin, tf: job.tf, rsi: current, prev }
      })
    )

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        checked.push(result.value)
      } else {
        const job = batch[index]
        errors.push(
          result.reason instanceof Error
            ? `${job.coin}/${job.tf}: ${result.reason.message}`
            : `${job.coin}/${job.tf}: unknown error`
        )
      }
    })
  }

  let telegramSent = false
  if (crosses.length) {
    try {
      await sendTelegramRsiAlerts(crosses)
      telegramSent = true
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : 'telegram failed')
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    checked: checked.length,
    crosses: crosses.length,
    telegramSent,
    alerts: crosses.map((c) => ({
      coin: c.coin,
      tf: c.tf,
      level: c.level,
      direction: c.direction,
      prev: c.prev,
      current: c.current,
      label: c.label,
    })),
    errors,
    generatedAt: new Date().toISOString(),
  })
}
