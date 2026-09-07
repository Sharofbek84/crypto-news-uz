import type { Metadata } from 'next'
import Providers from './components/Providers'
import './globals.css'
import './news-images.css'
import './price-sidebar.css'

const SITE_URL = 'https://goldenweb.uz'
const SITE_NAME = 'GOLDENWEB.UZ'
const DEFAULT_TITLE = 'GOLDENWEB.UZ | Real vaqtda kripto bozor tahlili'
const DEFAULT_DESCRIPTION =
  'O‘zbek tilida real vaqtda kriptovalyuta texnik tahlili, Entry · TP · SL darajalari, Premium signallar va so‘nggi kripto yangiliklari.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | GOLDENWEB.UZ',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'kripto',
    'kriptovalyuta',
    'bitcoin',
    'ethereum',
    'texnik tahlil',
    'trading',
    'signal',
    'RSI',
    'EMA',
    'GOLDENWEB',
    'o‘zbek',
    'kripto yangiliklari',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
