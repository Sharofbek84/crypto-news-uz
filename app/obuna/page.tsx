import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import SubscribeSection from '../components/SubscribeSection'

export default function ObunaPage() {
  return (
    <>
      <SiteHeader />

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <SubscribeSection />
      </main>

      <SiteFooter />
    </>
  )
}
