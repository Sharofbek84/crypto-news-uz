import type { Metadata } from 'next'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import SubscribeSection from '../components/SubscribeSection'
import CommunityIdeasPanel from '../components/CommunityIdeasPanel'

export const metadata: Metadata = {
  title: "Savdo g'oyalari",
  description:
    "GOLDENWEB.UZ savdo g'oyalari — foydalanuvchilar e'lon qilgan tahlillar va fikrlar (o'zbek tilida).",
  alternates: { canonical: '/savdo-goyalari' },
  openGraph: {
    title: "Savdo g'oyalari | GOLDENWEB.UZ",
    description:
      "Foydalanuvchilar e'lon qilgan savdo g'oyalari va tahlillar.",
    url: '/savdo-goyalari',
    type: 'website',
  },
}

export default function SavdoGoyalariPage() {
  return (
    <>
      <SiteHeader />

      <main className="container homeWide" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="homeLayout">
          <aside className="priceSidebar subscribeAside">
            <SubscribeSection />
          </aside>

          <div className="homeMain">
            <CommunityIdeasPanel />

            <p
              style={{
                margin: '18px 0 0',
                color: '#8b949e',
                fontSize: '0.78rem',
                lineHeight: 1.65,
                textAlign: 'center',
              }}
            >
              Eslatma: Ushbu g&apos;oyalar faqat axborot maqsadida. Investitsiya tavsiyasi emas.
              Savdo qilishdan oldin o&apos;zingiz tahlil qiling. Kripto bozorida savdo yuqori riskli.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
