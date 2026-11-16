import { NextRequest, NextResponse } from 'next/server'
import { removePushSubscription } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const endpoint = body?.endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
    }
    await removePushSubscription(endpoint)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
