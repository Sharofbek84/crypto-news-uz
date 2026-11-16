import { NextRequest, NextResponse } from 'next/server'
import { savePushSubscription } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sub = body?.subscription
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    const ok = await savePushSubscription(sub)
    if (!ok) {
      return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 })
  }
}
