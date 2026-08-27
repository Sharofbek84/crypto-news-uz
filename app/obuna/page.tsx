import Link from 'next/link'

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
            <p>Tez orada pullik obuna orqali kengaytirilgan tahlillar, signal va maxsus hisobotlarga kirish ochiladi.</p>
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
                <li>Kengaytirilgan AI tahlil</li>
                <li>Ko‘p juftlik signalari</li>
                <li>Kunlik hisobot</li>
                <li>Shaxsiy signal kanali</li>
                <li>Haftalik chuqur tahlil</li>
                <li>VIP qo‘llab-quvvatlash</li>
                <li>Prioritet yangilanishlar</li>
              </ul>
              <button className="planBtn" disabled>Tez orada</button>
            </div>
          </div>

          <div className="subscribeNote">
            To‘lov tizimi (Stripe / Payme / Click) keyinchalik ulanadi. Hozircha reja va narxlar namuna sifatida ko‘rsatilgan.
          </div>
        </section>
      </main>

      <footer className="footer">GOLDENWEB.UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}</footer>
    </>
  )
}
