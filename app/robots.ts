import type { MetadataRoute } from 'next'

const SITE_URL = 'https://goldenweb.uz'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/kabinet', '/sign-in', '/sign-up'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
