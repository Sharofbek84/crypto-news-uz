'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import SiteHeader from '../components/SiteHeader'

export default function ObunaPage() {
  const { data: session, status } = useSession()
  const premium = session?.user && (session.user as { premium?: boolean }).premium

  return (
    <>
      <SiteHeader />

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <section className="subscribeSection">
          <div className="subscribeHead">
            <div className="subscribeKicker">💎 PREMIUM</div>
            <h2>Obuna bo‘lish</h2>
            <p>
              Ro‘yxatdan o‘ting, shaxsiy kabinetda obunani boshqaring va Premium imkoniyatlarga
              kiring.
            </p>
          </div>

          <div className="planGrid">
            <div className="planCard">
              <div className="planName">Bepul</div>
              <div className="planPrice">
                $0<span>/oy</span>
              </div>
              <ul>
                <li>Asosiy texnik tahlil</li>
                <li>Entry · TP · SL darajalari</li>
                <li>Kripto yangiliklari</li>
              </ul>
              <button className="planBtn muted" disabled>
                Hozir faol
              </button>
            </div>

            <div className="planCard">
              <div className="planBadge" style={{ background: '#4aa8ff', color: '#0b0f14' }}>
                $9/oy
              </div>
              <div className="planName">Signal Pro</div>
              <div className="planPrice">
                $9<span>/oy</span>
              </div>
              <ul>
                <li>Telegram kanal orqali kunlik signallar</li>
                <li>Kripto yangiliklari</li>
                <li>Asosiy texnik tahlil</li>
              </ul>
              {status === 'loading' ? (
                <button className="planBtn" disabled>
                  ...
                </button>
              ) : session ? (
                <Link
                  href="/kabinet"
                  className="planBtn"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    background: '#4aa8ff',
                    color: '#0b0f14',
                  }}
                >
                  Kabinetda obuna bo‘lish
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="planBtn"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    background: '#4aa8ff',
                    color: '#0b0f14',
                  }}
                >
                  Avval ro‘yxatdan o‘ting
                </Link>
              )}
            </div>

            <div className="planCard featured">
              <div className="planBadge">$19/oy</div>
              <div className="planName">Premium</div>
              <div className="planPrice">
                $19<span>/oy</span>
              </div>
              <ul>
                <li>Kengaytirilgan AI tahlili</li>
                <li>AI yordamchi</li>
                <li>Telegram signal kanali</li>
                <li>Haftalik chuqur tahlil</li>
                <li>VIP qo‘llab-quvvatlash</li>
              </ul>
              {status === 'loading' ? (
                <button className="planBtn" disabled>
                  ...
                </button>
              ) : premium ? (
                <Link
                  href="/premium"
                  className="planBtn"
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                >
                  Premium ga o‘tish
                </Link>
              ) : session ? (
                <Link
                  href="/kabinet"
                  className="planBtn"
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                >
                  Kabinetda obuna bo‘lish
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="planBtn"
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                >
                  Avval ro‘yxatdan o‘ting
                </Link>
              )}
            </div>
          </div>

          <div className="subscribeNote">
            Obunani shaxsiy kabinetdan boshqarasiz. To‘lov (Payme / Click) keyin ulanadi.
          </div>
        </section>
      </main>

      <footer className="footer">
        GOLDENWEB.UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}
      </footer>
    </>
  )
}
