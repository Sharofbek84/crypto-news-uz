import type { MetadataRoute } from 'next'
import { getAllFreshNews } from '@/lib/news'

const SITE_URL = 'https://goldenweb.uz'

export default function sitemap(): MetadataRoute.Sitemap {
  const news = getAllFreshNews()
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/yangiliklar`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/obuna`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/premium`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  const newsPages: MetadataRoute.Sitemap = news.map((item) => ({
    url: `${SITE_URL}/yangiliklar/${item.slug}`,
    lastModified: item.date ? new Date(item.date) : now,
    changeFrequency: 'daily',
    priority: 0.6,
  }))

  return [...staticPages, ...newsPages]
}
