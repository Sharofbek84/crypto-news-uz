'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function ObunaPage() {
  const { data: session, status } = useSession()

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
              {status === 'loading' ? (
                <button className="planBtn" disabled>...</button>
              ) : session ? (
                <Link href="/premium" className="planBtn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Premium ga o‘tish
                </Link>
              ) : (
                <Link href="/sign-up" className="planBtn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Avval ro‘yxatdan o‘ting
                </Link>
              )}
            </div>
          </div>

          <div className="subscribeNote">
            To‘lov tizimi (Stripe / Payme / Click) keyinchalik ulanadi. Hozircha kirish talab qilinadi.
          </div>
        </section>
      </main>

      <footer className="footer">GOLDENWEB.UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}</footer>
    </>
  )
}
