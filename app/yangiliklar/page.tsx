import Link from 'next/link'
import SiteHeader from '../components/SiteHeader'
import newsData from '../../data/news.json'

export const metadata = {
  title: 'So‘nggi Yangiliklar | GOLDENWEB.UZ',
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
      <SiteHeader />

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
                <span>{item.source || 'GOLDENWEB.UZ'}</span>
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
        GOLDENWEB.UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}
      </footer>
    </>
  )
}
