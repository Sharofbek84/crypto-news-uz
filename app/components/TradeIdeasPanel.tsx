'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type TradeIdea = {
  rank: number
  coin: string
  tf: string
  side: 'BUY' | 'SELL'
  rsi: number
  score: number
  strength: string
  title: string
  summary: string
  levels: number[]
  levelsLabel: string
}

type ApiResponse = {
  ok: boolean
  ideas?: TradeIdea[]
  updatedAt?: number
  error?: string
}

export default function TradeIdeasPanel() {
  const [ideas, setIdeas] = useState<TradeIdea[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/trade-ideas', { cache: 'no-store' })
      const data = (await res.json()) as ApiResponse
      if (!res.ok || !data.ok) throw new Error(data.error || 'Yuklash xatosi')
      setIdeas(data.ideas || [])
      setUpdatedAt(data.updatedAt ?? Date.now())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Xatolik')
      setIdeas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="tiPanel">
      <style>{`
        .tiPanel {
          background: #0d1117;
          border: 1px solid #252d38;
          border-radius: 16px;
          padding: 20px;
          color: #e6edf3;
        }
        .tiHead {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .tiTitle { margin: 0; font-size: 1.35rem; font-weight: 800; }
        .tiSub { margin: 8px 0 0; color: #8b949e; font-size: 0.86rem; line-height: 1.5; max-width: 640px; }
        .tiRefresh {
          border: 1px solid #303846;
          background: #111820;
          color: #aeb9c7;
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .tiRefresh:hover { border-color: #f0b90b; color: #f0b90b; }
        .tiGrid { display: flex; flex-direction: column; gap: 12px; }
        .tiCard {
          border: 1px solid #252d38;
          border-radius: 12px;
          padding: 14px 16px;
          background: #111820;
        }
        .tiCardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .tiRank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(240, 185, 11, 0.12);
          color: #f0b90b;
          font-weight: 800;
          font-size: 0.85rem;
          margin-right: 8px;
        }
        .tiCoin { font-weight: 800; font-size: 1rem; }
        .tiMeta { color: #8b949e; font-size: 0.8rem; }
        .tiSide {
          font-weight: 800;
          font-size: 0.78rem;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .tiSide.buy { background: rgba(32, 214, 122, 0.15); color: #20d67a; }
        .tiSide.sell { background: rgba(255, 83, 96, 0.15); color: #ff5360; }
        .tiSummary { margin: 0 0 10px; color: #c8d1dc; font-size: 0.88rem; line-height: 1.55; }
        .tiLevels { font-size: 0.84rem; color: #9aa7b8; }
        .tiLevels b { color: #e6edf3; }
        .tiEmpty, .tiError {
          text-align: center;
          padding: 36px 16px;
          color: #8b949e;
        }
        .tiError {
          background: rgba(194, 53, 53, 0.1);
          border: 1px solid rgba(194, 53, 53, 0.3);
          border-radius: 12px;
          color: #d8a1a1;
        }
        .tiFoot {
          margin-top: 14px;
          text-align: right;
          color: #8b949e;
          font-size: 0.76rem;
        }
        .tiFoot a { color: #f0b90b; text-decoration: none; }
        .tiFoot a:hover { text-decoration: underline; }
        @media (max-width: 560px) {
          .tiPanel { padding: 14px; }
        }
      `}</style>

      <div className="tiHead">
        <div>
          <h1 className="tiTitle">Savdo g&apos;oyalari</h1>
          <p className="tiSub">
            GOLDENWEB heatmap RSI va ATR darajalari asosida eng kuchli 10 ta setup.
            Manba: o&apos;z tahlil tizimimiz (Gate.io shamlar).
          </p>
        </div>
        <button type="button" className="tiRefresh" onClick={load} disabled={loading}>
          {loading ? 'Yuklanmoqda…' : 'Yangilash'}
        </button>
      </div>

      {loading && !ideas.length ? (
        <div className="tiEmpty">G&apos;oyalar yuklanmoqda…</div>
      ) : error ? (
        <div className="tiError">
          {error}{' '}
          <button type="button" className="tiRefresh" onClick={load}>
            Qayta urinish
          </button>
        </div>
      ) : !ideas.length ? (
        <div className="tiEmpty">
          Hozircha kuchli oversold/overbought setup topilmadi. Keyinroq qayta tekshiring.
        </div>
      ) : (
        <div className="tiGrid">
          {ideas.map((idea) => (
            <article key={`${idea.coin}-${idea.tf}-${idea.side}`} className="tiCard">
              <div className="tiCardTop">
                <div>
                  <span className="tiRank">{idea.rank}</span>
                  <span className="tiCoin">{idea.coin}/USDT</span>
                  <span className="tiMeta"> · {idea.tf} · RSI {idea.rsi.toFixed(1)}</span>
                </div>
                <span className={`tiSide ${idea.side === 'BUY' ? 'buy' : 'sell'}`}>
                  {idea.side === 'BUY' ? 'SOTIB OLISH' : 'SOTISH'}
                </span>
              </div>
              <p className="tiSummary">{idea.summary}</p>
              <div className="tiLevels">
                <b>{idea.side === 'BUY' ? 'Sotib olish:' : 'Sotish:'}</b> {idea.levelsLabel}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="tiFoot">
        {updatedAt ? `Yangilandi: ${new Date(updatedAt).toLocaleString()}` : null}
        {' · '}
        <Link href="/spot-heatmap">Heatmap →</Link>
      </div>
    </section>
  )
}
