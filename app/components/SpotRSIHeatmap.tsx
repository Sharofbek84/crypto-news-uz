'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'LTC', 'NEAR', 'SUI', 'APT', 'ATOM', 'GRAM'] as const
const TIMEFRAMES = ['H4', 'D1', 'W1'] as const

type Direction = 'up' | 'down' | 'flat' | null

type Cell = {
  rsi: number | null
  price: number | null
  timestamp: number | null
  priceDirection?: Direction
  rsiDirection?: Direction
}

type ApiResponse = {
  source: string
  period: number
  updatedAt: number
  data: Record<string, Record<string, Cell>>
}

type ChartPoint = { t: number; o: number; h: number; l: number; c: number }

function rsiColor(rsi: number | null): string {
  if (rsi == null || !Number.isFinite(rsi)) return '#2a3038'
  const v = Math.max(0, Math.min(100, rsi))
  if (v < 30) return lerpHex('#1a4a9e', '#2d6fd4', v / 30)
  if (v < 50) return lerpHex('#2d6fd4', '#3a424d', (v - 30) / 20)
  if (v < 70) return lerpHex('#3a424d', '#c47a12', (v - 50) / 20)
  return lerpHex('#c47a12', '#c62828', (v - 70) / 30)
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
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function arrow(d: Direction) {
  if (d === 'up') return '↑'
  if (d === 'down') return '↓'
  return ''
}

function rsiLabel(rsi: number | null) {
  if (rsi == null) return 'N/A'
  if (rsi < 30) return 'Oversold'
  if (rsi >= 70) return 'Overbought'
  if (rsi >= 55) return 'Bullish'
  return 'Neutral'
}

function PriceChart({ points, coin, tf }: { points: ChartPoint[]; coin: string; tf: string }) {
  if (!points.length) {
    return <div className="rsiChartEmpty">Grafik ma&apos;lumoti yo&apos;q</div>
  }

  const w = 720
  const h = 260
  const pad = { t: 16, r: 16, b: 28, l: 56 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b

  const closes = points.map((p) => p.c)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1

  const xAt = (i: number) => pad.l + (i / Math.max(points.length - 1, 1)) * iw
  const yAt = (v: number) => pad.t + (1 - (v - min) / range) * ih

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.c).toFixed(1)}`)
    .join(' ')

  const area =
    line +
    ` L${xAt(points.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)}` +
    ` L${xAt(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`

  const last = points[points.length - 1]
  const first = points[0]
  const up = last.c >= first.c
  const stroke = up ? '#0ecb81' : '#f6465d'
  const fill = up ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)'

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + range * (1 - t))

  return (
    <div className="rsiChartBox">
      <div className="rsiChartHead">
        <strong>
          {coin}/USDT · {tf}
        </strong>
        <span style={{ color: up ? '#0ecb81' : '#f6465d' }}>
          {formatPrice(last.c)}{' '}
          {up ? '↑' : '↓'}{' '}
          {(((last.c - first.c) / first.c) * 100).toFixed(2)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="rsiChartSvg" role="img" aria-label={`${coin} price chart`}>
        {yTicks.map((v, i) => {
          const y = yAt(min + range * (1 - i / 4))
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#252d38" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fill="#6b7585" fontSize="10">
                {formatPrice(v).replace('$', '')}
              </text>
            </g>
          )
        })}
        <path d={area} fill={fill} />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx={xAt(points.length - 1)} cy={yAt(last.c)} r="3.5" fill={stroke} />
      </svg>
    </div>
  )
}

export default function SpotRSIHeatmap() {
  const [payload, setPayload] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>('H4')
  const [coin, setCoin] = useState<(typeof COINS)[number]>('BTC')
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [chartLoading, setChartLoading] = useState(true)

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

  const loadChart = useCallback(async (c: string, timeframe: string) => {
    setChartLoading(true)
    try {
      const res = await fetch(
        `/api/spot-heatmap/chart?coin=${encodeURIComponent(c)}&tf=${encodeURIComponent(timeframe)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('chart')
      const data = await res.json()
      setChartPoints(Array.isArray(data.points) ? data.points : [])
    } catch {
      setChartPoints([])
    } finally {
      setChartLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHeatmap()
    const timer = window.setInterval(loadHeatmap, 60_000)
    return () => window.clearInterval(timer)
  }, [loadHeatmap])

  useEffect(() => {
    loadChart(coin, tf)
  }, [coin, tf, loadChart])

  const selectedCell = payload?.data?.[coin]?.[tf]

  const cards = useMemo(() => {
    return COINS.map((c) => {
      const cell = payload?.data?.[c]?.[tf]
      return { coin: c, cell }
    })
  }, [payload, tf])

  return (
    <section className="rsiHm">
      <style>{`
        .rsiHm{
          background:#0d1117;border:1px solid #252d38;border-radius:16px;
          padding:20px;color:#e6edf3
        }
        .rsiHmHead{
          display:flex;justify-content:space-between;gap:14px;
          align-items:flex-start;flex-wrap:wrap;margin-bottom:16px
        }
        .rsiHmTitle{margin:0;font-size:1.3rem;font-weight:800}
        .rsiHmSub{margin:6px 0 0;color:#8b949e;font-size:.84rem;line-height:1.45}
        .rsiTfGroup{display:flex;gap:6px;flex-wrap:wrap}
        .rsiTfBtn{
          border:1px solid #303846;background:#111820;color:#aeb9c7;
          border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.82rem;font-weight:700
        }
        .rsiTfBtn:hover{border-color:#f0b90b;color:#f0b90b}
        .rsiTfBtn.active{
          background:rgba(240,185,11,.12);border-color:#f0b90b;color:#f0b90b
        }
        .rsiCoinRow{
          display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px;
          -webkit-overflow-scrolling:touch
        }
        .rsiCoinChip{
          flex:0 0 auto;border:1px solid #303846;background:#111820;color:#c9d1d9;
          border-radius:999px;padding:7px 14px;cursor:pointer;font-size:.8rem;font-weight:700
        }
        .rsiCoinChip:hover{border-color:#f0b90b}
        .rsiCoinChip.active{
          background:rgba(240,185,11,.14);border-color:#f0b90b;color:#f0b90b
        }
        .rsiCards{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
          gap:10px;margin-bottom:16px
        }
        .rsiCard{
          border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;
          cursor:pointer;text-align:left;color:#fff;min-height:92px;
          transition:transform .12s ease,filter .12s ease,box-shadow .12s ease
        }
        .rsiCard:hover{filter:brightness(1.1);transform:translateY(-2px)}
        .rsiCard.active{
          box-shadow:0 0 0 2px #f0b90b,0 8px 20px rgba(0,0,0,.25)
        }
        .rsiCardTop{display:flex;justify-content:space-between;align-items:center;gap:6px}
        .rsiCardCoin{font-size:.78rem;font-weight:800}
        .rsiCardPrice{font-size:.68rem;opacity:.88}
        .rsiCardVal{font-size:1.45rem;font-weight:900;margin:8px 0 4px;line-height:1}
        .rsiCardState{font-size:.68rem;opacity:.9;font-weight:600}
        .rsiChartBox{
          border:1px solid #252d38;border-radius:12px;background:#0b0f14;padding:12px 12px 8px
        }
        .rsiChartHead{
          display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;
          font-size:.86rem;margin-bottom:6px;padding:0 4px
        }
        .rsiChartSvg{width:100%;height:auto;display:block}
        .rsiChartEmpty{padding:40px;text-align:center;color:#8b949e;font-size:.9rem}
        .rsiHmLoading,.rsiHmError{padding:40px 16px;text-align:center;color:#8b949e}
        .rsiHmError{
          background:rgba(194,53,53,.1);border:1px solid rgba(194,53,53,.3);
          border-radius:12px;color:#d8a1a1
        }
        .rsiHmFoot{margin-top:12px;color:#8b949e;font-size:.76rem;text-align:right}
        @media(max-width:560px){
          .rsiHm{padding:14px}
          .rsiCards{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
      `}</style>

      <div className="rsiHmHead">
        <div>
          <h1 className="rsiHmTitle">Spot RSI Heatmap</h1>
          <p className="rsiHmSub">
            Coin tanlang, RSI kartalarini ko&apos;ring va pastida narx grafigini kuzating.
          </p>
        </div>
        <div className="rsiTfGroup" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              className={`rsiTfBtn${tf === t ? ' active' : ''}`}
              onClick={() => setTf(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rsiCoinRow" role="tablist" aria-label="Coins">
        {COINS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={coin === c}
            className={`rsiCoinChip${coin === c ? ' active' : ''}`}
            onClick={() => setCoin(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rsiHmLoading">Ma&apos;lumot yuklanmoqda...</div>
      ) : error ? (
        <div className="rsiHmError">
          Ma&apos;lumot olinmadi.{' '}
          <button type="button" className="rsiTfBtn" onClick={loadHeatmap}>
            Qayta urinish
          </button>
        </div>
      ) : (
        <>
          <div className="rsiCards">
            {cards.map(({ coin: c, cell }) => {
              const rsi = cell?.rsi ?? null
              const active = c === coin
              return (
                <button
                  key={c}
                  type="button"
                  className={`rsiCard${active ? ' active' : ''}`}
                  style={{ background: rsiColor(rsi) }}
                  onClick={() => setCoin(c)}
                >
                  <div className="rsiCardTop">
                    <span className="rsiCardCoin">{c}</span>
                    <span className="rsiCardPrice">{formatPrice(cell?.price ?? null)}</span>
                  </div>
                  <div className="rsiCardVal">
                    {rsi == null ? '—' : rsi.toFixed(1)}
                    {arrow(cell?.rsiDirection ?? null)}
                  </div>
                  <div className="rsiCardState">{rsiLabel(rsi)}</div>
                </button>
              )
            })}
          </div>

          {chartLoading ? (
            <div className="rsiChartEmpty">Grafik yuklanmoqda...</div>
          ) : (
            <PriceChart points={chartPoints} coin={coin} tf={tf} />
          )}

          {selectedCell && (
            <div className="rsiHmFoot">
              {coin} · {tf} · RSI(14): {selectedCell.rsi ?? '—'} · Yangilandi:{' '}
              {payload?.updatedAt ? new Date(payload.updatedAt).toLocaleTimeString() : '—'}
            </div>
          )}
        </>
      )}
    </section>
  )
}
