import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteHeader from '../../components/SiteHeader'
import SiteFooter from '../../components/SiteFooter'
import { getAllFreshNews, getNewsBySlug } from '@/lib/news'

export function generateStaticParams() {
  return getAllFreshNews().map((item) => ({ slug: item.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = getNewsBySlug(params.slug)
  if (!item) {
    return {
      title: 'Yangilik topilmadi',
      robots: { index: false, follow: true },
    }
  }

  const title = item.title
  const description = item.summary || item.title
  const url = `/yangiliklar/${item.slug}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | GOLDENWEB.UZ`,
      description,
      url,
      type: 'article',
      publishedTime: item.date || undefined,
      images: item.image ? [{ url: item.image }] : undefined,
    },
    twitter: {
      card: item.image ? 'summary_large_image' : 'summary',
      title: `${title} | GOLDENWEB.UZ`,
      description,
      images: item.image ? [item.image] : undefined,
    },
  }
}

export default function YangilikDetailPage({ params }: { params: { slug: string } }) {
  const item = getNewsBySlug(params.slug)
  if (!item) notFound()

  const paragraphs = (item.body || item.summary || '').split('\n\n').filter(Boolean)

  return (
    <>
      <SiteHeader />

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <article className="articlePage">
          <div className="articleMeta">
            <span>{item.source || 'GOLDENWEB.UZ'}</span>
            {item.date ? <span>• {item.date}</span> : null}
          </div>
          <h1>{item.title}</h1>
          {item.summary ? <p className="articleLead">{item.summary}</p> : null}

          <div className="articleBody">
            {item.image ? (
              <div className="articleCover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="articleCoverImage"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
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

      <SiteFooter />
    </>
  )
}
