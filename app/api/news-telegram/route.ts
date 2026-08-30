import { NextResponse } from 'next/server'
import { getRecentNews } from '@/lib/news'
import { claimDailyNews, markDailyNewsSent, releaseDailyNewsClaim } from '@/lib/news-dedup'
import { sendTelegramNews } from '@/lib/telegram-news'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const news = getRecentNews().filter((item) => item.slug && item.title)
  if (!news.length) return NextResponse.json({ ok: true, sent: false, reason: 'No news' })

  const latestDate = news.reduce((latest, item) => {
    const date = String(item.date || '')
    return date > latest ? date : latest
  }, '')

  const latestNews = news
    .filter((item) => String(item.date || '') === latestDate)
    .sort((a, b) => String(b.slug).localeCompare(String(a.slug)))

  const digestDate = new Date().toISOString().slice(0, 10)
  const claim = await claimDailyNews(digestDate)
  if (claim.alreadySent) {
    return NextResponse.json({ ok: true, sent: false, reason: 'Daily digest already sent', date: digestDate })
  }
  if (claim.locked) {
    return NextResponse.json({ ok: true, sent: false, reason: 'Daily digest already processing', date: digestDate })
  }

  try {
    await sendTelegramNews(latestNews)
    await markDailyNewsSent(digestDate)
    return NextResponse.json({ ok: true, sent: true, date: digestDate, newsCount: latestNews.length })
  } catch (error) {
    await releaseDailyNewsClaim(digestDate)
    throw error
  }
}
