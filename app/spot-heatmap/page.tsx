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
        <p
          style={{
            margin: '18px 0 0',
            color: '#8b949e',
            fontSize: '0.78rem',
            lineHeight: 1.65,
            textAlign: 'center',
          }}
        >
          Eslatma: Ushbu tahlil faqat axborot maqsadida. Investitsiya tavsiyasi emas. Savdo qilishdan oldin o‘zingiz tahlil qiling. Kripto bozorida savdo qilish yuqori riskli faoliyat turi hisoblanadi. Bozorga faqat yo‘qotishga tayyor bo‘lgan pulingiz bilan kiring.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
