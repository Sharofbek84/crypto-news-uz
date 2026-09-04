import type { Metadata } from 'next'
import Providers from './components/Providers'
import './globals.css'
import './news-images.css'

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
    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAEQUlEQVR42u1Wz29UVRT+zrnvza83zJS2IKCAxpQWWYj8EI1Rg6iQNFGI0YVEjS40RlE3iv4BLjSWSDBGXRkj0UQWaqwF+RWgMQFFoyQqBjW1TYAC7QzDzLx5791zXLzSlmHa0siSs77nfud837nfucC1mCLoSs8RiMZOq0L0KpVgeMIqDIPpf3TABAVUQYQF19HN13NrHsbQhYr2D+qf/0qlBgDMEJk+QJyWTuLJdc7Gtc6SGzmXJccAgAqqAQYGZedhu21HeGJADcPKdADihJWL+aPXkks7OAxQ8RGEqhdzjEE6Qek0iiVsfr/24VcRU2NVzES1r73ddHel57bScFFrATJJys8gL01emrwMuUzlqparcAw98oBTraL3V4kpnaIDIqhi8ULq/SCdSlC1po6hfBbH/pLvjtgTAxJGmNNCa1aYe241FR+RVRByHj34ir/vqJ2oj3rA7ndS0uud6c4Ud3n+fu/Vx13nslaf6XTKe73CLu9sdyY84O3Zmpp6IpkBYPUyEx70hnoyQz0Z6fVeftSNVTEMY2AYjkGM9+azCT3snd/tlfd4tQPe0jaOZ298OJeX/9h9xjGIBDOzdOgXu/WLkBmiUL2ESQBvbQ++PBRZARSOg/7TAtRTdAmAFTBj1S2mFoAAx8Xne6IYuC4tBiuV8cPvMjkrTp28c5pp3iwKIjgGlSqO/Caj103C6kgR0mCKnPH8KNCURSZFIjCGShU9NaTASFr8ODrvNF0vJQolGB6jVQS5DPYdtS9sCeJCG1MEwHWICVaVicIItUAxigAAaJpB7W2mUtQYIBbDWqRn0D8ndbTQCQH8QK2AiESQdJFOEYo6PkkECDUI1RgiwApEVBQJF34wqQZxX0PntVTRfJbCUHMezZ9N/ac1vj92m52Ho2VPibVwDIZL+tx6d/NG90xBmRo76zgAAMCZAvpO6crF5NeQTOLepeb7Y8IMsSPHhksYLsmoo8xrmcKvuc7jABz42bouAPg+nljn5DxEFsaMzQIzki5E0L6AOu8ypcpFwacEiFn6bHd0oQLXoYqvHQt5y6ZkLOOIpAQR1EIwo+vFZD5LkVWiKwMQBROO/S2f9IT5PERRKOnTnc43b6eWd7BjoApVGIPl7dzTlVp3hymU1BjS6W60vIf976VvW8RnC8qMfJbCCMf75OQ5BTC3hdoXMhGqvqaTVK2pKpqy9HWvXf+GX2eo3HC/F8vY8Lr/03FpbSWH6VxRy1VdNJ/vX2HWrDBt87lUVgL8ANt2hEQUWoQWtpFTNwBQBRP6TuvqTdV3t4cKzG6h5hwZg9BCBMkEZrXQwKA+tNn/+Nso30wtTZSYSbksTWMnx7qp4qa59PDdzqolfMMsSiWpFmj/oO790e7YHxUuoDmH5ze4TEgm6I8++XRXVPeSp1g+zJj823EVPl5EYIbq2N+E+RLvjJ9IbOki1/6y047/AA3O4snJ5+tjAAAAAElFTkSuQmCC',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
