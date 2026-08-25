import { NextResponse } from 'next/server'
import newsData from '../../../data/news.json'
import { sendTelegramNews } from '../../../lib/telegram-news'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const news = (Array.isArray(newsData) ? newsData : []) as Array<{
    slug: string; title: string; summary?: string; url?: string; source?: string; date?: string
  }>

  const latest = news
    .filter(item => item.slug && item.title)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 1)[0]

  if (!latest) return NextResponse.json({ ok: true, sent: false, reason: 'No news' })

  await sendTelegramNews(latest)
  return NextResponse.json({ ok: true, sent: true, slug: latest.slug })
}
