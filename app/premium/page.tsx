import { Suspense } from 'react'
import PremiumAnalyst from '../components/PremiumAnalyst'
import TelegramPremiumButton from '../components/TelegramPremiumButton'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

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
