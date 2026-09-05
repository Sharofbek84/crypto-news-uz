import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { getNewsPage } from '@/lib/news'

export const metadata: Metadata = {
  title: 'So‘nggi Yangiliklar',
  description:
    'Kriptovalyuta bozori, ETF, tartibga solish va texnologiya haqida o‘zbek tilidagi so‘nggi yangiliklar va tahlillar.',
  alternates: {
    canonical: '/yangiliklar',
  },
  openGraph: {
    title: 'So‘nggi Yangiliklar | GOLDENWEB.UZ',
    description:
      'Kriptovalyuta bozori haqida o‘zbek tilidagi so‘nggi yangiliklar va tahlillar.',
    url: '/yangiliklar',
    type: 'website',
  },
}

export default function YangiliklarPage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const raw = Number(searchParams?.page || '1')
  const { items: news, page, totalPages } = getNewsPage(raw)

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
          {news.length === 0 ? (
            <p style={{ color: '#8b98a6' }}>Hozircha ko‘rsatish uchun yangilik yo‘q.</p>
          ) : (
            news.map((item) => (
              <article key={item.slug} className="newsCard">
                {item.image ? (
                  <Link href={`/yangiliklar/${item.slug}`} className="newsCardImageLink" tabIndex={-1}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt=""
                      className="newsCardImage"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                ) : null}
                <div className="newsCardBody">
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
                </div>
              </article>
            ))
          )}
        </div>

        {news.length > 0 ? (
          <nav className="newsPagination" aria-label="Yangiliklar sahifalari">
            {page > 1 ? (
              <Link
                href={page - 1 === 1 ? '/yangiliklar' : `/yangiliklar?page=${page - 1}`}
                className="newsPageBtn"
              >
                ←
              </Link>
            ) : (
              <span className="newsPageBtn disabled">←</span>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={n === 1 ? '/yangiliklar' : `/yangiliklar?page=${n}`}
                className={'newsPageBtn' + (n === page ? ' active' : '')}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </Link>
            ))}

            {page < totalPages ? (
              <Link href={`/yangiliklar?page=${page + 1}`} className="newsPageBtn">
                →
              </Link>
            ) : (
              <span className="newsPageBtn disabled">→</span>
            )}
          </nav>
        ) : null}
      </main>

      <SiteFooter />
    </>
  )
}
