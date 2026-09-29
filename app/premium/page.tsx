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
  alternates: { canonical: '/premium' },
  openGraph: {
    title: 'Premium texnik tahlil | GOLDENWEB.UZ',
    description: 'Kengaytirilgan kripto texnik tahlil, RSI divergensiya va savdo darajalari.',
    url: '/premium',
    type: 'website',
  },
  robots: { index: true, follow: true },
}

const PREMIUM_COINS: { symbol: string; name: string; image: string }[] = [
  { symbol: 'BTC', name: 'Bitcoin', image: 'https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png' },
  { symbol: 'ETH', name: 'Ethereum', image: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png' },
  { symbol: 'LTC', name: 'Litecoin', image: 'https://coin-images.coingecko.com/coins/images/2/small/litecoin.png' },
  { symbol: 'SOL', name: 'Solana', image: 'https://coin-images.coingecko.com/coins/images/4128/small/solana.png' },
  { symbol: 'BNB', name: 'BNB', image: 'https://coin-images.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { symbol: 'NEAR', name: 'NEAR', image: 'https://coin-images.coingecko.com/coins/images/10365/small/near.jpg' },
  { symbol: 'GRAM', name: 'Toncoin', image: 'https://coin-images.coingecko.com/coins/images/17980/small/ton_symbol.png' },
  { symbol: 'SUI', name: 'Sui', image: 'https://coin-images.coingecko.com/coins/images/26375/small/sui-ocean-square.png' },
  { symbol: 'APT', name: 'Aptos', image: 'https://coin-images.coingecko.com/coins/images/26455/small/aptos_round.png' },
  { symbol: 'ATOM', name: 'Cosmos', image: 'https://coin-images.coingecko.com/coins/images/1481/small/cosmos_hub.png' },
  { symbol: 'XAUT', name: 'Tether Gold', image: 'https://coin-images.coingecko.com/coins/images/10481/small/Tether_Gold.png' },
  { symbol: 'XRP', name: 'XRP', image: 'https://coin-images.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { symbol: 'XLM', name: 'Stellar', image: 'https://coin-images.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png' },
  { symbol: 'BCH', name: 'Bitcoin Cash', image: 'https://coin-images.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png' },
  { symbol: 'LINK', name: 'Chainlink', image: 'https://coin-images.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
  { symbol: 'AVAX', name: 'Avalanche', image: 'https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
]

async function getPrices(coins: { symbol: string; name: string; image: string }[]) {
  try {
    const res = await fetch('https://api.gateio.ws/api/v4/spot/tickers', {
      next: { revalidate: 30 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    const byPair = new Map(
      data.map((t: any) => [String(t.currency_pair || ''), t])
    )

    return coins.map(({ symbol, name, image }) => {
      const t = byPair.get(`${symbol}_USDT`)
      if (!t) {
        return {
          symbol,
          name,
          image,
          current_price: null as number | null,
          price_change_percentage_24h: null as number | null,
        }
      }
      const price = parseFloat(t.last)
      const change = parseFloat(t.change_percentage)
      return {
        symbol,
        name,
        image,
        current_price: Number.isFinite(price) ? price : null,
        price_change_percentage_24h: Number.isFinite(change) ? change : null,
      }
    })
  } catch {
    return []
  }
}

function fmt(p: number | null) {
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
                {prices.map((c) => (
                  <Link key={c.symbol} href={`/premium?symbol=${c.symbol}`} className="priceRow"
                    title={`${c.symbol} premium tahlilini ochish`}>
                    {c.image ? <img src={c.image} alt={c.name} width={28} height={28} /> :
                      <div className="coinPlaceholder sm">{c.symbol.slice(0, 2)}</div>}
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
