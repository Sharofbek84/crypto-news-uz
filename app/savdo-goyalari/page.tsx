import type { Metadata } from 'next'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import TradeIdeasPanel from '../components/TradeIdeasPanel'

export const metadata: Metadata = {
  title: "Savdo g'oyalari",
  description:
    "GOLDENWEB.UZ savdo g'oyalari — heatmap RSI va ATR darajalari asosida kunlik eng kuchli 10 ta setup (o'zbek tilida).",
  alternates: { canonical: '/savdo-goyalari' },
}

export default function SavdoGoyalariPage() {
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <TradeIdeasPanel />
        <p
          style={{
            margin: '18px 0 0',
            color: '#8b949e',
            fontSize: '0.78rem',
            lineHeight: 1.65,
            textAlign: 'center',
          }}
        >
          Eslatma: Ushbu g&apos;oyalar faqat axborot maqsadida. Investitsiya tavsiyasi emas. Savdo
          qilishdan oldin o&apos;zingiz tahlil qiling. Kripto bozorida savdo yuqori riskli.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
