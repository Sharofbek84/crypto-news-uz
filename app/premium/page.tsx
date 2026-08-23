import Link from 'next/link'
import { Suspense } from 'react'
import PremiumAnalyst from '../components/PremiumAnalyst'
import CryptoAnalystAI from '../components/CryptoAnalystAI'

export const metadata = {
  title: 'Premium tahlil | GOLDENWEB.UZ',
  description: 'Kengaytirilgan kripto tahlil: 20 coin, M15/H1/H4/D1, Entry, TP, SL',
}

export default function PremiumPage() {
  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
            GOLDENWEB<span>.UZ</span>
          </Link>
          <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/" style={{ color: '#9aa7b8', fontSize: 14 }}>Bosh sahifa</Link>
            <Link href="/obuna" className="headerCta">Obuna bo‘lish</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <Suspense fallback={<div className="homeLoading">Premium tahlil yuklanmoqda...</div>}>
          <PremiumAnalyst />
        </Suspense>
      </main>

      <CryptoAnalystAI />

      <footer className="footer">
        GOLDENWEB.UZ • Premium AI texnik tahlil • {new Date().getFullYear()}
      </footer>
    </>
  )
}
