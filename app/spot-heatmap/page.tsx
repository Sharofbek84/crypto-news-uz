import type { Metadata } from 'next'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import SpotRSIHeatmap from '../components/SpotRSIHeatmap'

export const metadata: Metadata = {
  title: 'Spot RSI Heatmap | GOLDENWEB.UZ',
  description: 'GOLDENWEB.UZ Spot RSI Heatmap — BTC, ETH, LTC, SOL, BNB, NEAR, GRAM, SUI, APT va ATOM uchun H4, D1 va W1 RSI.',
  alternates: { canonical: '/spot-heatmap' },
}

export default function SpotHeatmapPage() {
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <SpotRSIHeatmap />
      </main>
      <SiteFooter />
    </>
  )
}
