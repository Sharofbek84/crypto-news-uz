import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Telegram test endpoint disabled. Real Signal Engine notifications are active via /api/analyze.',
    },
    { status: 410 },
  )
}
