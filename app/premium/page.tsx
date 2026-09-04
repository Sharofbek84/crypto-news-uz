import type { Metadata } from 'next'
import { Suspense } from 'react'
import PremiumAnalyst from '../components/PremiumAnalyst'
import TelegramPremiumButton from '../components/TelegramPremiumButton'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

export const metadata: Metadata = {
  title: 'Premium texnik tahlil',
  description:
    'GOLDENWEB.UZ Premium: kengaytirilgan kripto texnik tahlil, RSI divergensiya, Entry · TP · SL va AI yordamchi.',
  alternates: {
    canonical: '/premium',
  },
  openGraph: {
    title: 'Premium texnik tahlil | GOLDENWEB.UZ',
    description:
      'Kengaytirilgan kripto texnik tahlil, RSI divergensiya va savdo darajalari.',
    url: '/premium',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PremiumPage() {
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <Suspense fallback={<div className="homeLoading">Premium tahlil yuklanmoqda...</div>}>
          <PremiumAnalyst />
        </Suspense>
        <TelegramPremiumButton />
      </main>
      <SiteFooter />
    </>
  )
}
