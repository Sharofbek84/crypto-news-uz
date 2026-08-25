import { NextResponse } from 'next/server'
import newsData from '../../../data/news.json'
import { claimNews, markNewsSent, releaseNewsClaim } from '../../../lib/news-dedup'
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

  const claim = await claimNews(latest.slug)
  if (claim.alreadySent) {
    return NextResponse.json({ ok: true, sent: false, reason: 'Already sent', slug: latest.slug })
  }
  if (claim.locked) {
    return NextResponse.json({ ok: true, sent: false, reason: 'Already processing', slug: latest.slug })
  }

  try {
    await sendTelegramNews(latest)
    await markNewsSent(latest.slug)
    return NextResponse.json({ ok: true, sent: true, slug: latest.slug })
  } catch (error) {
    await releaseNewsClaim(latest.slug)
    throw error
  }
}
