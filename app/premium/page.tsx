import { Suspense } from 'react'
import PremiumAnalyst from '../components/PremiumAnalyst'
import TelegramPremiumButton from '../components/TelegramPremiumButton'
import SiteHeader from '../components/SiteHeader'

export const metadata = {
  title: 'Premium tahlil | GOLDENWEB.UZ',
  description: 'Kengaytirilgan kripto tahlil: 20 coin, M15/H1/H4/D1, Entry, TP, SL',
}

export default function PremiumPage() {
  return (
    <>
      <SiteHeader />

      <main className="container">
        <Suspense fallback={<div className="homeLoading">Premium tahlil yuklanmoqda...</div>}>
          <PremiumAnalyst />
        </Suspense>
        <TelegramPremiumButton />
      </main>

      <footer className="footer">
        GOLDENWEB.UZ • Premium AI texnik tahlil • {new Date().getFullYear()}
      </footer>
    </>
  )
}
