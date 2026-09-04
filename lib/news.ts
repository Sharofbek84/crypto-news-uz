import newsData from '../data/news.json'

export type NewsItem = {
  slug: string
  title: string
  summary?: string
  body?: string
  url?: string
  source?: string
  date?: string
  /** Tashqi rasm URL (ixtiyoriy). Faqat /yangiliklar sahifalarida ko'rsatiladi. */
  image?: string
}

/** Sahifada ko‘rsatiladigan maksimal yangilik soni */
export const MAX_NEWS = 10

/** Shu kundan eski yangiliklar chiqarib tashlanadi */
export const NEWS_MAX_AGE_DAYS = 10

function parseNewsDate(date?: string): number | null {
  if (!date) return null
  // YYYY-MM-DD yoki ISO
  const t = Date.parse(date.length === 10 ? `${date}T12:00:00Z` : date)
  return Number.isFinite(t) ? t : null
}

function startOfTodayUtc(): number {
  const now = new Date()
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/**
 * 10 kundan eski yangiliklarni olib tashlaydi,
 * sanaga qarab tartiblaydi va oxirgi MAX_NEWS tasini qaytaradi.
 * Yangi yangilik qo‘shganda ham shu filtr ishlaydi (o‘qish vaqtida).
 */
export function trimNews(items: NewsItem[], nowMs = Date.now()): NewsItem[] {
  const cutoff = startOfTodayUtc() - NEWS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000

  const fresh = items.filter((item) => {
    const ts = parseNewsDate(item.date)
    // Sanasi yo‘q yoki noto‘g‘ri — xavfsiz tomonda saqlab qolamiz, lekin limit ichida
    if (ts == null) return true
    return ts >= cutoff
  })

  return [...fresh]
    .sort(
      (a, b) =>
        String(b.date || '').localeCompare(String(a.date || '')) ||
        String(b.slug || '').localeCompare(String(a.slug || ''))
    )
    .slice(0, MAX_NEWS)
}

/** data/news.json dan o‘qib, avtomatik trim qilingan ro‘yxat */
export function getRecentNews(): NewsItem[] {
  const all = (Array.isArray(newsData) ? newsData : []) as NewsItem[]
  return trimNews(all)
}

/** Bitta yangilikni slug bo‘yicha topish (faqat trim ichidagilar) */
export function getNewsBySlug(slug: string): NewsItem | undefined {
  return getRecentNews().find((n) => n.slug === slug)
}
