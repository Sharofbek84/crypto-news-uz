import { NextRequest, NextResponse } from 'next/server'
import { computeStats, listRecentSignals } from '@/lib/signal-tracker'

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  const externalSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')

  const authorized =
    Boolean(expectedSecret) &&
    (authorization === `Bearer ${expectedSecret}` ||
      externalSecret === expectedSecret ||
      querySecret === expectedSecret)

  if (!authorized) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const includeList = request.nextUrl.searchParams.get('list') === '1'
  const stats = await computeStats()
  if (!stats) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 })
  }

  const body: Record<string, unknown> = {
    stats,
    generatedAt: new Date().toISOString(),
  }

  if (includeList) {
    body.recent = await listRecentSignals(40)
  }

  return NextResponse.json(body)
}
