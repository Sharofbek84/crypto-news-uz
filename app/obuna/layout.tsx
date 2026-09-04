import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Obuna bo‘lish',
  description:
    'GOLDENWEB.UZ Premium va Signal Pro obunalari: kengaytirilgan texnik tahlil, Telegram signallari va VIP qo‘llab-quvvatlash.',
  alternates: {
    canonical: '/obuna',
  },
  openGraph: {
    title: 'Obuna bo‘lish | GOLDENWEB.UZ',
    description:
      'Premium va Signal Pro obunalari: texnik tahlil, Telegram signallari va VIP qo‘llab-quvvatlash.',
    url: '/obuna',
    type: 'website',
  },
}

export default function ObunaLayout({ children }: { children: React.ReactNode }) {
  return children
}
