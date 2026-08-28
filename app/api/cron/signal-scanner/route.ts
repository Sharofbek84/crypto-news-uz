import { NextRequest, NextResponse } from 'next/server'

const COINS = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM', 'XAUT', 'XRP', 'XLM', 'BCH', 'LINK', 'AVAX']
const INTERVALS = ['1h', '4h', '1d'] as const
const CONCURRENCY = 4

async function scanOne(baseUrl: string, symbol: string, interval: string, secret: string) {
  const url = new URL('/api/analyze', baseUrl)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'User-Agent': 'GoldenWeb-Signal-Scanner/1.0',
      'x-signal-scanner-secret': secret,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${symbol}/${interval}: ${response.status} ${body.slice(0, 180)}`)
  }

  return { symbol, interval, ok: true }
}

async function runTracker(baseUrl: string, secret: string) {
  const url = new URL('/api/cron/signal-tracker', baseUrl)
  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'User-Agent': 'GoldenWeb-Signal-Scanner/1.0',
      'x-cron-secret': secret,
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`tracker: ${response.status} ${body.slice(0, 180)}`)
  }
  return response.json()
}

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

  const baseUrl = new URL(request.url).origin
  const jobs = COINS.flatMap((symbol) => INTERVALS.map((interval) => ({ symbol, interval })))
  const completed: Array<{ symbol: string; interval: string; ok: boolean }> = []
  const errors: string[] = []

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((job) => scanOne(baseUrl, job.symbol, job.interval, expectedSecret!))
    )

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') completed.push(result.value)
      else
        errors.push(
          result.reason instanceof Error
            ? result.reason.message
            : `${batch[index].symbol}/${batch[index].interval}: unknown error`
        )
    })
  }

  let tracker: unknown = null
  try {
    tracker = await runTracker(baseUrl, expectedSecret!)
  } catch (e: any) {
    errors.push(e?.message || 'tracker failed')
  }

  return NextResponse.json({
    ok: errors.length === 0,
    scanned: jobs.length,
    completed: completed.length,
    tracker,
    errors,
    generatedAt: new Date().toISOString(),
  })
}
