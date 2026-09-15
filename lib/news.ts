import fs from 'fs'
import path from 'path'

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

/** Har bir arxiv sahifasida nechta yangilik */
export const NEWS_PER_PAGE = 10

/** Bosh sahifada ko‘rsatiladigan yangilik soni */
export const HOME_NEWS_COUNT = 10

/**
 * Saytda saqlanadigan / ko‘rsatiladigan maksimal yangilik soni.
 * 10 sahifa × 10 = 100. Undan eskiroqlari avtomatik chiqarib tashlanadi.
 */
export const NEWS_MAX_TOTAL = 100

/** Shu kundan eski yangiliklar ham chiqarib tashlanadi (qo‘shimcha filtr) */
export const NEWS_MAX_AGE_DAYS = 30

const NEWS_DIR = path.join(process.cwd(), 'data', 'news')

/**
 * data/news/ papkasidagi barcha YYYY-MM-DD.json fayllarni o‘qiydi.
 * Har kun alohida fayl — yangi kun qo‘shilganda eski arxiv o‘zgarmaydi.
 */
function loadAllNewsFromDisk(): NewsItem[] {
  try {
    if (!fs.existsSync(NEWS_DIR)) return []
    const files = fs
      .readdirSync(NEWS_DIR)
      .filter((f) => f.endsWith('.json') && /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .reverse()

    const items: NewsItem[] = []
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(NEWS_DIR, file), 'utf8')
        const data = JSON.parse(raw)
        if (Array.isArray(data)) items.push(...(data as NewsItem[]))
      } catch {
        // bitta buzilgan kun fayli butun arxivni to‘xtatmasin
      }
    }
    return items
  } catch {
    return []
  }
}

function parseNewsDate(date?: string): number | null {
  if (!date) return null
  const t = Date.parse(date.length === 10 ? `${date}T12:00:00Z` : date)
  return Number.isFinite(t) ? t : null
}

function startOfTodayUtc(): number {
  const now = new Date()
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/**
 * 1) Juda eski (NEWS_MAX_AGE_DAYS) yangiliklarni olib tashlaydi
 * 2) Sanaga qarab tartiblaydi (eng yangi birinchi)
 * 3) Faqat oxirgi NEWS_MAX_TOTAL (100) ta qoldiradi
 *
 * Natija: maksimal 10 sahifa × 10 yangilik.
 */
export function trimNews(items: NewsItem[]): NewsItem[] {
  const cutoff = startOfTodayUtc() - NEWS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000

  const fresh = items.filter((item) => {
    const ts = parseNewsDate(item.date)
    if (ts == null) return true
    return ts >= cutoff
  })

  const sorted = [...fresh].sort(
    (a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      String(b.slug || '').localeCompare(String(a.slug || ''))
  )

  return sorted.slice(0, NEWS_MAX_TOTAL)
}

/** Eng yangi 100 ta yangilik (tartiblangan) */
export function getAllFreshNews(): NewsItem[] {
  return trimNews(loadAllNewsFromDisk())
}

/** Bosh sahifa uchun oxirgi N ta */
export function getRecentNews(limit = HOME_NEWS_COUNT): NewsItem[] {
  return getAllFreshNews().slice(0, limit)
}

export type NewsPageResult = {
  items: NewsItem[]
  page: number
  totalPages: number
  total: number
}

/** Arxiv sahifasi: 1-dan boshlanadi, har sahifada NEWS_PER_PAGE ta, jami max 10 sahifa */
export function getNewsPage(page: number): NewsPageResult {
  const all = getAllFreshNews()
  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / NEWS_PER_PAGE))
  const safePage = Number.isFinite(page) ? Math.min(Math.max(1, Math.floor(page)), totalPages) : 1
  const start = (safePage - 1) * NEWS_PER_PAGE
  return {
    items: all.slice(start, start + NEWS_PER_PAGE),
    page: safePage,
    totalPages,
    total,
  }
}

/** Bitta yangilikni slug bo‘yicha topish (100 ta ichidagilar) */
export function getNewsBySlug(slug: string): NewsItem | undefined {
  return getAllFreshNews().find((n) => n.slug === slug)
}
