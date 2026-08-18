import Link from 'next/link'
import { notFound } from 'next/navigation'
import newsData from '../../../data/news.json'

type NewsItem = {
  slug: string
  title: string
  summary?: string
  body?: string
  url?: string
  source?: string
  date?: string
}

const news = (Array.isArray(newsData) ? newsData : []) as NewsItem[]

export function generateStaticParams() {
  return news.map((item) => ({ slug: item.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const item = news.find((n) => n.slug === params.slug)
  if (!item) return { title: 'Yangilik topilmadi | Crypto Tahlil UZ' }
  return {
    title: `${item.title} | Crypto Tahlil UZ`,
    description: item.summary || item.title,
  }
}

export default function YangilikDetailPage({ params }: { params: { slug: string } }) {
  const item = news.find((n) => n.slug === params.slug)
  if (!item) notFound()

  const paragraphs = (item.body || item.summary || '').split('\n\n').filter(Boolean)

  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">Crypto <span>Tahlil</span> UZ</Link>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Link href="/yangiliklar" style={{ color: '#9aa7b8', fontSize: '.9rem', fontWeight: 600 }}>← Yangiliklar</Link>
            <Link href="/obuna" className="headerCta">Obuna bo‘lish</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <article className="articlePage">
          <div className="articleMeta">
            <span>{item.source || 'Crypto Tahlil UZ'}</span>
            {item.date ? <span>• {item.date}</span> : null}
          </div>
          <h1>{item.title}</h1>
          {item.summary ? <p className="articleLead">{item.summary}</p> : null}

          <div className="articleBody">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {item.url ? (
            <div className="articleSource">
              <span>Manba:</span>{' '}
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Asl xabarni ko‘rish ↗
              </a>
            </div>
          ) : null}

          <div className="articleNav">
            <Link href="/yangiliklar">← Barcha yangiliklar</Link>
            <Link href="/">Bosh sahifa</Link>
          </div>
        </article>
      </main>

      <footer className="footer">
        Crypto Tahlil UZ • AI texnik tahlil va kripto yangiliklari • {new Date().getFullYear()}
      </footer>
    </>
  )
}
