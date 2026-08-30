'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import SiteHeader from '../components/SiteHeader'

const SIGNAL_PRO_URL =
  'https://t.me/tribute/app?startapp=ep_zdhegwwYthRyGnRV7ergnHtnqG9PWBxBD1bs2XG9gt7PYKPG3ao'

function TelegramIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

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
              <a
                href={SIGNAL_PRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="planBtn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  textAlign: 'center',
                  textDecoration: 'none',
                  background: '#2AABEE',
                  color: '#fff',
                }}
              >
                <TelegramIcon />
                Obuna bo‘lish
              </a>
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
