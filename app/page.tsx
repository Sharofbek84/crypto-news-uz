import Link from 'next/link'
import { Suspense } from 'react'
import HomeAnalyst from './components/HomeAnalyst'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import SubscribeSection from './components/SubscribeSection'
import { getRecentNews } from '@/lib/news'

/** Tartib: BTC, ETH, LTC, SOL, BNB, NEAR, GRAM, SUI, APT, ATOM */
const TOP_COINS: { symbol: string; name: string; image: string }[] = [
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

export default async function Home() {
  const prices = await getPrices(TOP_COINS)
  const news = getRecentNews()

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
                  <Link
                    key={c.symbol}
                    href={`/?symbol=${c.symbol}#tahlil`}
                    className="priceRow"
                    title={`${c.symbol} texnik tahlilini ochish`}
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
            <div id="tahlil">
              <Suspense fallback={<div className="homeLoading">Grafik va tahlil yuklanmoqda...</div>}>
                <HomeAnalyst />
              </Suspense>
            </div>

            <SubscribeSection />

            <div className="sectionRow">
              <h2 className="section" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
                So‘nggi Yangiliklar
              </h2>
              <Link href="/yangiliklar" className="sectionMore">
                Barchasi →
              </Link>
            </div>
            <div className="news">
              {news.map((item) => (
                <article key={item.slug || item.title} className="item">
                  <h3>
                    <Link href={item.slug ? `/yangiliklar/${item.slug}` : '/yangiliklar'}>{item.title}</Link>
                  </h3>
                  <div className="meta">
                    {item.source || 'GOLDENWEB.UZ'}
                    {item.date ? ` • ${item.date}` : ''}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
