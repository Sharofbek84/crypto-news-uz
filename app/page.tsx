import Link from 'next/link'
import HomeAnalyst from './components/HomeAnalyst'
import newsData from '../data/news.json'

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

async function getPrices() {
  try {
    const ids = TOP_COINS.map(c => c.geckoId).join(',')
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`,
      { next: { revalidate: 60 }, headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    // CoinGecko tartibini saqlamaydi — bizning tartibimiz bo‘yicha joylashtiramiz
    const byId = new Map(data.map((c: any) => [c.id, c]))
    return TOP_COINS.map(({ symbol, geckoId }) => {
      const c = byId.get(geckoId)
      if (!c) return { id: geckoId, symbol, name: symbol, image: '', current_price: null, price_change_percentage_24h: null, missing: true }
      return { ...c, symbol, missing: false }
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
  const prices = await getPrices()
  const news = Array.isArray(newsData) ? newsData : []

  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo">Crypto <span>Tahlil</span> UZ</div>
          <Link href="/obuna" className="headerCta">Obuna bo‘lish</Link>
        </div>
      </header>

      <main className="container">
        <div id="tahlil">
          <HomeAnalyst />
        </div>

        <h2 className="section">Top Kriptovalyutalar</h2>
        {prices.length === 0 ? (
          <p style={{ color: '#848e9c', marginBottom: 24 }}>Narxlar vaqtincha yuklanmadi. Keyinroq yangilang.</p>
        ) : (
          <div className="prices">
            {prices.map((c: any) => (
              <Link
                key={c.symbol}
                href={`/?symbol=${c.symbol}#tahlil`}
                className="card cardLink"
                title={`${c.symbol} texnik tahlilini ochish`}
              >
                {c.image ? <img src={c.image} alt={c.name} width={32} height={32} /> : <div className="coinPlaceholder">{c.symbol.slice(0, 2)}</div>}
                <div>
                  <h3>{c.name || c.symbol}</h3>
                  <div className="sym">{c.symbol}</div>
                </div>
                <div className="right">
                  <div className="price">{fmt(c.current_price)}</div>
                  <div className={(c.price_change_percentage_24h ?? 0) >= 0 ? 'up' : 'down'}>
                    {(c.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                    {(c.price_change_percentage_24h ?? 0).toFixed?.(2) ?? '0.00'}%
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <h2 className="section">So‘nggi Yangiliklar</h2>
        <div className="news">
          {news.map((item: any, i: number) => (
            <article key={i} className="item">
              <h3>
                <a href={item.url || '#'} target="_blank" rel="noopener noreferrer">{item.title}</a>
              </h3>
              <div className="meta">
                {item.source || 'Crypto Tahlil UZ'}
                {item.date ? ` • ${item.date}` : ''}
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="footer">
        Crypto Tahlil UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}
      </footer>
    </>
  )
}
