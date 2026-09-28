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
  if (price == null || !Number.isFinite(price)) return '\u2014'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return '$' + price.toPrecision(4)
}

function money(n: number) {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}

function arrow(d: Direction) {
  if (d === 'up') return '\u2191'
  if (d === 'down') return '\u2193'
  return ''
}

function rsiLabel(rsi: number | null) {
  if (rsi == null) return 'N/A'
  if (rsi < 30) return 'Oversold'
  if (rsi >= 70) return 'Overbought'
  if (rsi >= 55) return 'Bullish'
  return 'Neutral'
}

export default function SpotRSIHeatmap() {
  const { data: session } = useSession()
  const hasPremium = Boolean((session?.user as { premium?: boolean } | undefined)?.premium)
  const premiumHref = hasPremium ? '/premium' : '/obuna'
  const [payload, setPayload] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tf, setTf] = useState<'H4' | 'D1' | 'W1'>('D1')

  const loadHeatmap = useCallback(async () => {
    try {
      setError(false)
      const res = await fetch('/api/spot-heatmap', { cache: 'no-store' })
      if (!res.ok) throw new Error('Heatmap API error')
      setPayload(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHeatmap()
    const t = setInterval(loadHeatmap, 60_000)
    return () => clearInterval(t)
  }, [loadHeatmap])

  const cells = payload?.data

  return (
    <section className="rsiHeat">
      <style>{`
        .rsiHeat { color: #e6edf3; }
        .rsiHeat h1 { margin: 0 0 8px; font-size: 1.4rem; font-weight: 800; }
        .rsiSub { color: #8b949e; font-size: 0.88rem; margin: 0 0 16px; line-height: 1.5; }
        .rsiTfRow { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
        .rsiTfBtn {
          border: 1px solid #303846; background: #111820; color: #c8d1dc;
          border-radius: 8px; padding: 8px 14px; font-weight: 700; cursor: pointer; font-size: 0.84rem;
        }
        .rsiTfBtn.active { border-color: #f0b90b; color: #f0b90b; background: #1a1610; }
        .rsiGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
        }
        .rsiCard {
          border-radius: 12px; padding: 14px 12px; min-height: 96px;
          display: flex; flex-direction: column; justify-content: center; gap: 4px;
          border: 1px solid #252d38; text-decoration: none; color: inherit;
          transition: transform 0.12s ease, border-color 0.12s ease;
        }
        .rsiCard:hover { transform: translateY(-2px); border-color: #f0b90b66; }
        .rsiCoin { font-size: 0.95rem; font-weight: 800; letter-spacing: 0.02em; }
        .rsiVal { font-size: 1.35rem; font-weight: 800; }
        .rsiMeta { font-size: 0.72rem; opacity: 0.9; }
        .rsiPrice { font-size: 0.78rem; opacity: 0.85; margin-top: 2px; }
        .rsiErr, .rsiLoad { padding: 28px; text-align: center; color: #8b949e; }
        .rsiUpdated { font-size: 0.75rem; color: #8b949e; margin-top: 14px; }
        .rsiLegend { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0 16px; font-size: 0.72rem; color: #8b949e; }
        .rsiLeg { display: inline-flex; align-items: center; gap: 6px; }
        .rsiLeg i { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
      `}</style>

      <h1>RSI Heatmap</h1>
      <p className="rsiSub">
        Spot bozor RSI (14) — H4 / D1 / W1. Kartalar: Gate.io ma&apos;lumotlari.
      </p>

      <div className="rsiTfRow">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`rsiTfBtn${tf === t.key ? ' active' : ''}`}
            onClick={() => setTf(t.key)}
          >
            {t.key}
          </button>
        ))}
      </div>

      <div className="rsiLegend">
        <span className="rsiLeg"><i style={{ background: '#148f55' }} /> Oversold</span>
        <span className="rsiLeg"><i style={{ background: '#2ecc71' }} /> Bullish</span>
        <span className="rsiLeg"><i style={{ background: '#3a424d' }} /> Neutral</span>
        <span className="rsiLeg"><i style={{ background: '#c47a12' }} /> Warm</span>
        <span className="rsiLeg"><i style={{ background: '#c62828' }} /> Overbought</span>
      </div>

      {loading && !payload ? (
        <div className="rsiLoad">Yuklanmoqda\u2026</div>
      ) : error ? (
        <div className="rsiErr">Ma&apos;lumot yuklanmadi. Qayta urinib ko&apos;ring.</div>
      ) : (
        <div className="rsiGrid">
          {COINS.map((coin) => {
            const cell = cells?.[coin]?.[tf]
            const rsi = cell?.rsi ?? null
            return (
              <Link
                key={coin}
                href={`${premiumHref}?coin=${coin}&tf=${tf}`}
                className="rsiCard"
                style={{ background: rsiColor(rsi) }}
              >
                <div className="rsiCoin">{coin}</div>
                <div className="rsiVal">
                  {rsi != null ? rsi.toFixed(1) : '\u2014'}{' '}
                  <span style={{ fontSize: '0.85rem' }}>{arrow(cell?.rsiDirection ?? null)}</span>
                </div>
                <div className="rsiMeta">{rsiLabel(rsi)}</div>
                <div className="rsiPrice">{formatPrice(cell?.price ?? null)}</div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="rsiUpdated">
        Yangilangan:{' '}
        {payload?.updatedAt
          ? new Date(payload.updatedAt).toLocaleString('uz-UZ')
          : '\u2014'}
        {' \u00b7 '}Gate.io
      </div>
    </section>
  )
}
