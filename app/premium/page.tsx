import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import PremiumAnalyst from '../components/PremiumAnalyst'
import TelegramPremiumButton from '../components/TelegramPremiumButton'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

export const metadata: Metadata = {
  title: 'Premium texnik tahlil',
  description:
    'GOLDENWEB.UZ Premium: kengaytirilgan kripto texnik tahlil, RSI divergensiya, Entry · TP · SL va AI yordamchi.',
  alternates: {
    canonical: '/premium',
  },
  openGraph: {
    title: 'Premium texnik tahlil | GOLDENWEB.UZ',
    description:
      'Kengaytirilgan kripto texnik tahlil, RSI divergensiya va savdo darajalari.',
    url: '/premium',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

/** Premium: 16 ta — Home + XAUT, XRP, XLM, BCH, LINK, AVAX */
const PREMIUM_COINS: { symbol: string; geckoId: string }[] = [
  { symbol: 'BTC', geckoId: 'bitcoin' },
  { symbol: 'ETH', geckoId: 'ethereum' },
  { symbol: 'LTC', geckoId: 'litecoin' },
  { symbol: 'SOL', geckoId: 'solana' },
  { symbol: 'BNB', geckoId: 'binancecoin' },
  { symbol: 'NEAR', geckoId: 'near' },
  { symbol: 'GRAM', geckoId: 'the-open-network' },
  { symbol: 'SUI', geckoId: 'sui' },
  { symbol: 'APT', geckoId: 'aptos' },
  { symbol: 'ATOM', geckoId: 'cosmos' },
  { symbol: 'XAUT', geckoId: 'tether-gold' },
  { symbol: 'XRP', geckoId: 'ripple' },
  { symbol: 'XLM', geckoId: 'stellar' },
  { symbol: 'BCH', geckoId: 'bitcoin-cash' },
  { symbol: 'LINK', geckoId: 'chainlink' },
  { symbol: 'AVAX', geckoId: 'avalanche-2' },
]

async function getPrices(coins: { symbol: string; geckoId: string }[]) {
  try {
    const ids = coins.map((c) => c.geckoId).join(',')
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`,
      { next: { revalidate: 60 }, headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    const byId = new Map(data.map((c: any) => [c.id, c]))
    return coins.map(({ symbol, geckoId }) => {
      const c = byId.get(geckoId)
      if (!c)
        return {
          id: geckoId,
          symbol,
          name: symbol,
          image: '',
          current_price: null,
          price_change_percentage_24h: null,
        }
      return { ...c, symbol }
    })
  } catch {
    return []
  }
}

function fmt(p: number) {
  if (p == null || isNaN(p)) return '—'
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1) return '$' + p.toFixed(2)
  return '$' + p.toFixed(4)
}

export default async function PremiumPage() {
  const prices = await getPrices(PREMIUM_COINS)

  return (
    <>
      <SiteHeader />
      <main className="container homeWide" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="homeLayout">
          <aside className="priceSidebar">
            {prices.length === 0 ? (
              <p className="priceSidebarEmpty">Narxlar vaqtincha yuklanmadi.</p>
            ) : (
              <div className="priceSidebarList">
                {prices.map((c: any) => (
                  <Link
                    key={c.symbol}
                    href={`/premium?symbol=${c.symbol}`}
                    className="priceRow"
                    title={`${c.symbol} premium tahlilini ochish`}
                  >
                    {c.image ? (
                      <img src={c.image} alt={c.name} width={28} height={28} />
                    ) : (
                      <div className="coinPlaceholder sm">{c.symbol.slice(0, 2)}</div>
                    )}
                    <div className="priceRowMain">
                      <span className="priceRowSym">{c.symbol}</span>
                      <span className="priceRowName">{c.name}</span>
                    </div>
                    <div className="priceRowRight">
                      <span className="priceRowPrice">{fmt(c.current_price)}</span>
                      <span className={(c.price_change_percentage_24h ?? 0) >= 0 ? 'up' : 'down'}>
                        {(c.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                        {Number(c.price_change_percentage_24h ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>

          <div className="homeMain">
            <Suspense fallback={<div className="homeLoading">Premium tahlil yuklanmoqda...</div>}>
              <PremiumAnalyst />
            </Suspense>
            <TelegramPremiumButton />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
