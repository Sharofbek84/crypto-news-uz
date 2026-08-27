import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'

export const metadata = {
  title: 'Obuna bo‘lish | GOLDENWEB.UZ',
  description: 'GOLDENWEB.UZ premium obuna rejalari — kengaytirilgan AI tahlil, signal va hisobotlar.',
}

export default function ObunaPage() {
  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">GOLDENWEB<span>.UZ</span></Link>
          <Link href="/" style={{ color: '#9aa7b8', fontSize: '.9rem', fontWeight: 600 }}>← Bosh sahifa</Link>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <section className="subscribeSection">
          <div className="subscribeHead">
            <div className="subscribeKicker">💎 PREMIUM</div>
            <h2>Obuna bo‘lish</h2>
            <p>Ro‘yxatdan o‘ting va Premium orqali kengaytirilgan tahlillar, signal va maxsus hisobotlarga kiring.</p>
          </div>

          <div className="planGrid">
            <div className="planCard">
              <div className="planName">Bepul</div>
              <div className="planPrice">$0<span>/oy</span></div>
              <ul>
                <li>Asosiy texnik tahlil</li>
                <li>Entry · TP · SL darajalari</li>
                <li>Kripto yangiliklari</li>
              </ul>
              <button className="planBtn muted" disabled>Hozir faol</button>
            </div>

            <div className="planCard featured">
              <div className="planBadge">Tez orada</div>
              <div className="planName">Premium</div>
              <div className="planPrice">$19<span>/oy</span></div>
              <ul>
                <li>Kengaytirilgan AI tahlili</li>
                <li>AI yordamchi</li>
                <li>Telegram signal kanali</li>
                <li>Haftalik chuqur tahlil</li>
                <li>VIP qo‘llab-quvvatlash</li>
              </ul>
              <SignedOut>
                <SignInButton mode="modal">
                  <button type="button" className="planBtn">Avval kirish / ro‘yxat</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/premium" className="planBtn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Premium ga o‘tish
                </Link>
              </SignedIn>
            </div>
          </div>

          <div className="subscribeNote">
            To‘lov tizimi (Stripe / Payme / Click) keyinchalik ulanadi. Hozircha kirish talab qilinadi; to‘lov keyin qo‘shiladi.
          </div>
        </section>
      </main>

      <footer className="footer">GOLDENWEB.UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}</footer>
    </>
  )
}
