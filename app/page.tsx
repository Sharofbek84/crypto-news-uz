async function getPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron&order=market_cap_desc',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getNews() {
  try {
    const res = await fetch('https://cryptocurrency.cv/api/news?limit=10', {
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error('news fail')
    const data = await res.json()
    return data.articles || data || []
  } catch {
    return [
      { title: 'Bitcoin bozori faol', url: 'https://coindesk.com', source: 'CoinDesk' },
      { title: 'Ethereum yangilanishlari', url: 'https://cointelegraph.com', source: 'CoinTelegraph' },
      { title: 'Solana ekotizimi', url: 'https://theblock.co', source: 'The Block' },
    ]
  }
}

function fmt(p: number) {
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1) return '$' + p.toFixed(2)
  return '$' + p.toFixed(4)
}

export default async function Home() {
  const [prices, news] = await Promise.all([getPrices(), getNews()])

  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo">Crypto<span>News</span> UZ</div>
          <span style={{ fontSize: '0.8rem', color: '#848e9c' }}>Jonli narxlar</span>
        </div>
      </header>

      <main className="container">
        <h2 className="section">Top Kriptovalyutalar</h2>
        <div className="prices">
          {prices.map((c: any) => (
            <div key={c.id} className="card">
              <img src={c.image} alt={c.name} width={32} height={32} />
              <div>
                <h3>{c.name}</h3>
                <div className="sym">{c.symbol}</div>
              </div>
              <div className="right">
                <div className="price">{fmt(c.current_price)}</div>
                <div className={c.price_change_percentage_24h >= 0 ? 'up' : 'down'}>
                  {c.price_change_percentage_24h >= 0 ? '+' : ''}
                  {c.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="section">So'nggi Yangiliklar</h2>
        <div className="news">
          {(Array.isArray(news) ? news : []).slice(0, 10).map((item: any, i: number) => (
            <article key={i} className="item">
              <h3>
                <a href={item.url || item.link || '#'} target="_blank" rel="noopener noreferrer">
                  {item.title || 'Yangilik'}
                </a>
              </h3>
              <div className="meta">{item.source?.name || item.source || 'Crypto'}</div>
            </article>
          ))}
        </div>
      </main>

      <footer className="footer">
        Crypto News UZ • CoinGecko + ochiq manbalar • {new Date().getFullYear()}
      </footer>
    </>
  )
}
