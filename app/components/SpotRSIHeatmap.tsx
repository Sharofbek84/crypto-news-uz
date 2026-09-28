'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const COINS = [
  'BTC',
  'ETH',
  'LTC',
  'SOL',
  'BNB',
  'NEAR',
  'GRAM',
  'SUI',
  'APT',
  'ATOM',
  'TIA',
  'CORE',
  'FHE',
  'MYX',
  'WCT',
  'GTAI',
] as const

const TIMEFRAMES = [
  { key: 'H4' as const, interval: '4h' },
  { key: 'D1' as const, interval: '1d' },
  { key: 'W1' as const, interval: '1w' },
]

type Direction = 'up' | 'down' | 'flat' | null

type Cell = {
  rsi: number | null
  price: number | null
  timestamp: number | null
  priceDirection?: Direction
  rsiDirection?: Direction
}

type ApiResponse = {
  updatedAt: number
  data: Record<string, Record<string, Cell>>
}

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }

type TradeLevels = {
  buys: number[]
  sells: number[]
  side: string | null
}

function rsiColor(rsi: number | null): string {
  if (rsi == null || !Number.isFinite(rsi)) return '#2a3038'
  const v = Math.max(0, Math.min(100, rsi))
  if (v < 20) return lerpHex('#0a4d2e', '#148f55', v / 20)
  if (v < 30) return lerpHex('#148f55', '#2ecc71', (v - 20) / 10)
  if (v < 50) return lerpHex('#2ecc71', '#3a424d', (v - 30) / 20)
  if (v < 70) return lerpHex('#3a424d', '#c47a12', (v - 50) / 20)
  return lerpHex('#c62828', '#6b0f14', (v - 70) / 30)
}

function lerpHex(a: string, b: string, t: number) {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`
}

function formatPrice(price: number | null) {
  if (price == null || !Number.isFinite(price)) return '—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return '$' + price.toPrecision(4)
}

function rsiLabel(rsi: number | null) {
  if (rsi == null) return 'N/A'
  if (rsi < 30) return 'Oversold'
  if (rsi >= 70) return 'Overbought'
  if (rsi >= 55) return 'Bullish'
  if (rsi <= 45) return 'Bearish'
  return 'Neutral'
}

function dirArrow(d?: Direction) {
  if (d === 'up') return '▲'
  if (d === 'down') return '▼'
  return ''
}

export default function SpotRSIHeatmap() {
  const { data: session } = useSession()
  const isPremium = Boolean(session?.user && (session.user as { isPremium?: boolean }).isPremium)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<{ coin: string; tf: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/spot-heatmap', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Yuklash xatosi')
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Xatolik')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  const coins = useMemo(() => COINS, [])

  return (
    <section className="rsiHeat">
      <style>{`
        .rsiHeat { color: #e6edf3; }
        .rsiHeat h1 { margin: 0 0 8px; font-size: 1.4rem; }
        .rsiSub { color: #8b949e; font-size: 0.88rem; margin-bottom: 16px; }
        .rsiGrid {
          display: grid;
          grid-template-columns: 72px repeat(3, minmax(90px, 1fr));
          gap: 6px;
          overflow-x: auto;
        }
        .rsiHead, .rsiCoin {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.78rem;
          color: #9aa7b8;
          padding: 8px 4px;
        }
        .rsiCell {
          border-radius: 10px;
          padding: 10px 8px;
          min-height: 72px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.12s ease, border-color 0.12s ease;
        }
        .rsiCell:hover { transform: translateY(-1px); border-color: #f0b90b55; }
        .rsiVal { font-size: 1.05rem; font-weight: 800; }
        .rsiMeta { font-size: 0.7rem; opacity: 0.9; margin-top: 2px; }
        .rsiPrice { font-size: 0.72rem; margin-top: 4px; opacity: 0.85; }
        .rsiErr, .rsiLoad { padding: 24px; text-align: center; color: #8b949e; }
        .rsiUpdated { font-size: 0.75rem; color: #8b949e; margin-top: 12px; }
        @media (max-width: 640px) {
          .rsiGrid { grid-template-columns: 56px repeat(3, minmax(70px, 1fr)); gap: 4px; }
          .rsiCell { min-height: 64px; padding: 8px 4px; }
          .rsiVal { font-size: 0.95rem; }
        }
      `}</style>

      <h1>RSI Heatmap</h1>
      <p className="rsiSub">
        Spot bozor RSI (14) — H4 / D1 / W1. Kartani bosing: batafsil ko‘rish.
      </p>

      {loading && !data ? (
        <div className="rsiLoad">Yuklanmoqda…</div>
      ) : error ? (
        <div className="rsiErr">{error}</div>
      ) : data ? (
        <>
          <div className="rsiGrid">
            <div className="rsiHead">Coin</div>
            {TIMEFRAMES.map((tf) => (
              <div key={tf.key} className="rsiHead">{tf.key}</div>
            ))}
            {coins.map((coin) => (
              <>
                <div key={`${coin}-label`} className="rsiCoin">{coin}</div>
                {TIMEFRAMES.map((tf) => {
                  const cell = data.data?.[coin]?.[tf.key]
                  const rsi = cell?.rsi ?? null
                  return (
                    <button
                      key={`${coin}-${tf.key}`}
                      type="button"
                      className="rsiCell"
                      style={{ background: rsiColor(rsi) }}
                      onClick={() => setSelected({ coin, tf: tf.key })}
                    >
                      <div className="rsiVal">
                        {rsi != null ? rsi.toFixed(1) : '—'}{' '}
                        <span style={{ fontSize: '0.7rem' }}>{dirArrow(cell?.rsiDirection)}</span>
                      </div>
                      <div className="rsiMeta">{rsiLabel(rsi)}</div>
                      <div className="rsiPrice">{formatPrice(cell?.price ?? null)}</div>
                    </button>
                  )
                })}
              </>
            ))}
          </div>
          <div className="rsiUpdated">
            Yangilangan:{' '}
            {data.updatedAt
              ? new Date(data.updatedAt).toLocaleString('uz-UZ')
              : '—'}
            {' · '}Gate.io
          </div>
        </>
      ) : null}

      {selected ? (
        <div style={{ marginTop: 16, fontSize: '0.9rem', color: '#9aa7b8' }}>
          Tanlangan: <b style={{ color: '#e6edf3' }}>{selected.coin}</b> / {selected.tf}
          {isPremium ? null : (
            <>
              {' · '}
              <Link href="/premium" style={{ color: '#f0b90b' }}>
                Premium tahlil
              </Link>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
