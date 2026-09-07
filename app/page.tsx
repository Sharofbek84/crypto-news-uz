import Link from 'next/link'
import { Suspense } from 'react'
import HomeAnalyst from './components/HomeAnalyst'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import SubscribeSection from './components/SubscribeSection'
import { getRecentNews } from '@/lib/news'

/** Tartib: BTC, ETH, LTC, SOL, BNB, NEAR, GRAM, SUI, APT, ATOM */
const TOP_COINS: { symbol: string; geckoId: string }[] = [
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

export default async function Home() {
  const prices = await getPrices(TOP_COINS)
  const news = getRecentNews()

  return (
    <>
      <SiteHeader />

      <main className="container homeWide">
        <div className="homeLayout">
          <aside className="priceSidebar">
            {prices.length === 0 ? (
              <p className="priceSidebarEmpty">Narxlar vaqtincha yuklanmadi.</p>
            ) : (
              <div className="priceSidebarList">
                {prices.map((c: any) => (
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
