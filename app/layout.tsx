import type { Metadata, Viewport } from 'next'
import Providers from './components/Providers'
import PwaRegister from './components/PwaRegister'
import './globals.css'
import './news-images.css'
import './price-sidebar.css'

const SITE_URL = 'https://goldenweb.uz'
const SITE_NAME = 'GOLDENWEB.UZ'
const DEFAULT_TITLE = 'GOLDENWEB.UZ | Real vaqtda kripto bozor tahlili'
const DEFAULT_DESCRIPTION =
  'O‘zbek tilida real vaqtda kriptovalyuta texnik tahlili, Entry · TP · SL darajalari, Premium signallar va so‘nggi kripto yangiliklari.'

export const viewport: Viewport = {
  themeColor: '#0b0f14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | GOLDENWEB.UZ',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
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
    card: 'summary',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'finance',
  icons: {
    icon: [
      { url: '/icons/192', sizes: '192x192', type: 'image/png' },
      { url: '/icons/512', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/180', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  )
}
