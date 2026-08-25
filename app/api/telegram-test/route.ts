import { NextResponse } from 'next/server'
import { sendTelegramSignal } from '@/lib/telegram'

export async function GET() {
  try {
    await sendTelegramSignal({
      side: 'BUY',
      symbol: 'BTC',
      timeframe: 'H1',
      entryLow: 77105,
      entryHigh: 77392,
      tp: [77751, 78038, 78325],
      sl: 76675,
    })

    return NextResponse.json({ ok: true, message: 'Test Telegram signali yuborildi' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Noma’lum xatolik'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
