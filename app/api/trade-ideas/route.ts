import { NextResponse } from 'next/server'
import { getTopTradeIdeas } from '@/lib/trade-ideas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const { ideas, updatedAt, cached } = await getTopTradeIdeas(10)
    return NextResponse.json(
      {
        ok: true,
        source: 'GOLDENWEB heatmap RSI + ATR levels',
        count: ideas.length,
        ideas,
        updatedAt,
        cached,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
