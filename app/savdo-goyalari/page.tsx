import type { Metadata } from 'next'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import CommunityIdeasPanel from '../components/CommunityIdeasPanel'

export const metadata: Metadata = {
  title: "Savdo g'oyalari",
  description:
    "GOLDENWEB.UZ savdo g'oyalari — foydalanuvchilar e'lon qilgan tahlillar va fikrlar (o'zbek tilida).",
  alternates: { canonical: '/savdo-goyalari' },
}

export default function SavdoGoyalariPage() {
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
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
          Eslatma: Ushbu g&apos;oyalar faqat axborot maqsadida. Investitsiya tavsiyasi emas. Savdo
          qilishdan oldin o&apos;zingiz tahlil qiling. Kripto bozorida savdo yuqori riskli.
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
