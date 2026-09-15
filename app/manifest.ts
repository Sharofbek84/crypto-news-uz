import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GOLDENWEB.UZ — Kripto tahlil',
    short_name: 'GOLDENWEB',
    description:
      'Real vaqtda kriptovalyuta texnik tahlili, Premium signallar va yangiliklar.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0b0f14',
    theme_color: '#0b0f14',
    lang: 'uz',
    categories: ['finance', 'news', 'business'],
    icons: [
      {
        src: '/icons/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
