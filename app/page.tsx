async function getPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron&order=market_cap_desc',
      {
        next: { revalidate: 60 },
        headers: { Accept: 'application/json' },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function getNews() {
  // Fallback yangiliklar (API bo'sh bo'lsa ham ishlaydi)
  const fallback = [
    {
      title: 'Bitcoin bozori faol — eng so\'nggi tendensiyalar',
      url: 'https://www.coindesk.com',
      source: 'CoinDesk',
    },
    {
      title: 'Ethereum yangilanishlari va Layer-2 rivoji',
      url: 'https://cointelegraph.com',
      source: 'CoinTelegraph',
    },
    {
      title: 'Solana ekotizimi o\'smoqda',
      url: 'https://www.theblock.co',
      source: 'The Block',
    },
    {
      title: 'Kripto bozorida institutsional investitsiyalar',
      url: 'https://decrypt.co',
      source: 'Decrypt',
    },
    {
      title: 'Stablecoinlar va DeFi yangiliklari',
      url: 'https://www.thedefiant.io',
      source: 'The Defiant',
    },
  ]

  try {
    const res = await fetch('https://cryptocurrency.cv/api/news?limit=10', {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const articles = data.articles || data || []
    if (Array.isArray(articles) && articles.length > 0) {
      return articles
    }
    return fallback
  } catch {
    return fallback
  }
}

function fmt(p: number) {
  if (p == null || isNaN(p)) return '—'
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1) return '$' + p.toFixed(2)
  return '$' + p.toFixed(4)
}

export default async function Home() {
  const [prices, news] = await Promise.all([getPrices(), getNews()])

  return (
    <>
      <header className="header">
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="logo">
            Crypto<span>News</span> UZ
          </div>
          <span style={{ fontSize: '0.8rem', color: '#848e9c' }}>Jonli narxlar</span>
        </div>
      </header>

      <main className="container">
        <h2 className="section">Top Kriptovalyutalar</h2>

        {prices.length === 0 ? (
          <p style={{ color: '#848e9c', marginBottom: 24 }}>
            Narxlar vaqtincha yuklanmadi. Keyinroq yangilang.
          </p>
        ) : (
          <div className="prices">
            {prices.map((c: any) => (
              <div key={c.id} className="card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt={c.name} width={32} height={32} />
                <div>
                  <h3>{c.name}</h3>
                  <div className="sym">{c.symbol}</div>
                </div>
                <div className="right">
                  <div className="price">{fmt(c.current_price)}</div>
                  <div
                    className={
                      (c.price_change_percentage_24h ?? 0) >= 0 ? 'up' : 'down'
                    }
                  >
                    {(c.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                    {(c.price_change_percentage_24h ?? 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="section">Songgi Yangiliklar</h2>
        <div className="news">
          {(Array.isArray(news) ? news : []).slice(0, 10).map((item: any, i: number) => (
            <article key={i} className="item">
              <h3>
                <a
                  href={item.url || item.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.title || 'Yangilik'}
                </a>
              </h3>
              <div className="meta">
                {item.source?.name || item.source || 'Crypto'}
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="footer">
        Crypto News UZ • CoinGecko + ochiq manbalar •{' '}
        {new Date().getFullYear()}
      </footer>
    </>
  )
}
