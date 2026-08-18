import Link from 'next/link'
import newsData from '../../data/news.json'

export const metadata = {
  title: 'So‘nggi Yangiliklar | Crypto Tahlil UZ',
  description: 'Kriptovalyuta bozori haqida o‘zbek tilidagi so‘nggi yangiliklar va tahlillar.',
}

type NewsItem = {
  slug: string
  title: string
  summary?: string
  body?: string
  url?: string
  source?: string
  date?: string
}

export default function YangiliklarPage() {
  const news = (Array.isArray(newsData) ? newsData : []) as NewsItem[]

  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">Crypto <span>Tahlil</span> UZ</Link>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Link href="/" style={{ color: '#9aa7b8', fontSize: '.9rem', fontWeight: 600 }}>← Bosh sahifa</Link>
            <Link href="/obuna" className="headerCta">Obuna bo‘lish</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="newsPageHead">
          <div className="subscribeKicker">📰 YANGILIKLAR</div>
          <h1>So‘nggi Yangiliklar</h1>
          <p>Kriptovalyuta bozori, ETF, tartibga solish va texnologiya haqida o‘zbek tilidagi qisqa xabarlar.</p>
        </div>

        <div className="newsList">
          {news.map((item) => (
            <article key={item.slug} className="newsCard">
              <div className="newsCardMeta">
                <span>{item.source || 'Crypto Tahlil UZ'}</span>
                {item.date ? <span>• {item.date}</span> : null}
              </div>
              <h2>
                <Link href={`/yangiliklar/${item.slug}`}>{item.title}</Link>
              </h2>
              {item.summary ? <p className="newsCardSummary">{item.summary}</p> : null}
              <Link href={`/yangiliklar/${item.slug}`} className="newsReadMore">
                Batafsil o‘qish →
              </Link>
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
