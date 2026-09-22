'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
  'XAUT',
  'XRP',
  'XLM',
  'BCH',
  'LINK',
  'AVAX',
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

function emaSeries(candles: Candle[], period: number) {
  const out: number[] = []
  const k = 2 / (period + 1)
  let ema = candles[0]?.close ?? 0
  for (let i = 0; i < candles.length; i++) {
    ema = i === 0 ? candles[i].close : candles[i].close * k + ema * (1 - k)
    out.push(ema)
  }
  return out
}

function rsiSeries(candles: Candle[], p = 14) {
  const out: number[] = []
  let g = 0
  let l = 0
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const d = candles[i].close - candles[i - 1].close
    const gg = Math.max(d, 0)
    const ll = Math.max(-d, 0)
    if (i <= p) {
      g += gg
      l += ll
      out.push(i === p ? (l === 0 ? 100 : 100 - 100 / (1 + g / l)) : 50)
    } else {
      g = (g * (p - 1) + gg) / p
      l = (l * (p - 1) + ll) / p
      out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l))
    }
  }
  return out
}

/** Premium CleanChart uslubidagi shamchali grafik (ko‘proq sham) */
function CandleChart({
  candles,
  coin,
  tf,
}: {
  candles: Candle[]
  coin: string
  tf: string
}) {
  const [zoom, setZoom] = useState(1)
  if (!candles.length) return <div className="rsiChartEmpty">Grafik ma&apos;lumoti yo&apos;q</div>

  const W = 1700
  const H = 720
  const L = 68
  const R = 120
  const T = 56
  const MB = 480
  const RT = 520
  const RB = 680
  const plotRight = W - R
  const candleRight = L + (plotRight - L) * 0.96

  const min = Math.min(...candles.map((c) => c.low)) * 0.997
  const max = Math.max(...candles.map((c) => c.high)) * 1.003
  const x = (i: number) => L + (i * (candleRight - L)) / Math.max(1, candles.length - 1)
  const y = (v: number) => MB - ((v - min) / (max - min || 1)) * (MB - T)
  const ry = (v: number) => RB - (Math.max(0, Math.min(100, v)) / 100) * (RB - RT)
  const e10 = emaSeries(candles, 10)
  const e20 = emaSeries(candles, 20)
  const e50 = emaSeries(candles, 50)
  const rs = rsiSeries(candles)
  const poly = (arr: number[]) => arr.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const rpoly = (arr: number[]) => arr.map((v, i) => `${x(i)},${ry(v)}`).join(' ')
  const cw = Math.max(2.2, ((candleRight - L) / candles.length) * 0.62)

  const last = candles[candles.length - 1]
  const first = candles[0]
  const chg = last.close - first.close
  const chgPct = (chg / first.close) * 100
  const up = chg >= 0

  return (
    <div className="homeChartWrap">
      <div className="chartZoomControls">
        <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}>
          +
        </button>
      </div>
      <div className="homeChartScroller">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="homeChart"
          style={{ minWidth: `${Math.round(100 * zoom)}%` }}
          role="img"
          aria-label={`${coin} ${tf} chart`}
        >
          <rect x="0" y="0" width={W} height={H} fill="#0b1018" />

          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const v = min + (max - min) * (1 - t)
            const yy = y(v)
            return (
              <g key={i}>
                <line x1={L} x2={candleRight} y1={yy} y2={yy} stroke="#1e2530" strokeWidth="1" />
                <text x={L - 8} y={yy + 4} textAnchor="end" fill="#6b7585" fontSize="12">
                  {money(v)}
                </text>
              </g>
            )
          })}

          <text x={L} y="28" fill="#e6edf3" fontSize="18" fontWeight="800">
            {coin}/USDT · {tf}
          </text>
          <text x={L + 220} y="28" fill={up ? '#36d66f' : '#ff4d5a'} fontSize="16" fontWeight="700">
            ${money(last.close)}{' '}
            {up ? '+' : ''}
            {money(chg)} ({chgPct >= 0 ? '+' : ''}
            {chgPct.toFixed(2)}%)
          </text>
          <text x={L} y="48" fill="#ff9f0a" fontSize="12" fontWeight="700">
            EMA 10: {money(e10[e10.length - 1])}
          </text>
          <text x={L + 200} y="48" fill="#00c7e6" fontSize="12" fontWeight="700">
            EMA 20: {money(e20[e20.length - 1])}
          </text>
          <text x={L + 400} y="48" fill="#4aa8ff" fontSize="12" fontWeight="700">
            EMA 50: {money(e50[e50.length - 1])}
          </text>

          {candles.map((c, i) => {
            const bull = c.close >= c.open
            return (
              <g key={c.time}>
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1={y(c.high)}
                  y2={y(c.low)}
                  stroke={bull ? '#36d66f' : '#ff4d5a'}
                  strokeWidth="1.15"
                />
                <rect
                  x={x(i) - cw / 2}
                  y={Math.min(y(c.open), y(c.close))}
                  width={cw}
                  height={Math.max(1.4, Math.abs(y(c.open) - y(c.close)))}
                  fill={bull ? '#36d66f' : '#ff4d5a'}
                  rx="1"
                />
              </g>
            )
          })}

          <polyline points={poly(e10)} fill="none" stroke="#ff9f0a" strokeWidth="1.9" />
          <polyline points={poly(e20)} fill="none" stroke="#00c7e6" strokeWidth="1.9" />
          <polyline points={poly(e50)} fill="none" stroke="#4aa8ff" strokeWidth="1.9" />

          {/* RSI panel */}
          <line x1={L} x2={candleRight} y1={RT} y2={RT} stroke="#252d38" strokeWidth="1" />
          <text x={L} y={RT - 8} fill="#8b949e" fontSize="12" fontWeight="700">
            RSI(14): {rs[rs.length - 1]?.toFixed(1) ?? '—'}
          </text>
          <line
            x1={L}
            x2={candleRight}
            y1={ry(70)}
            y2={ry(70)}
            stroke="#c62828"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.5"
          />
          <line
            x1={L}
            x2={candleRight}
            y1={ry(30)}
            y2={ry(30)}
            stroke="#2d6fd4"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.5"
          />
          <polyline points={rpoly(rs)} fill="none" stroke="#c9a227" strokeWidth="1.6" />
        </svg>
      </div>
    </div>
  )
}

export default function SpotRSIHeatmap() {
  const [payload, setPayload] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tf, setTf] = useState<'H4' | 'D1' | 'W1'>('H4')
  const [coin, setCoin] = useState<(typeof COINS)[number]>('BTC')
  const [candles, setCandles] = useState<Candle[]>([])
  const [chartLoading, setChartLoading] = useState(true)

  const interval = TIMEFRAMES.find((t) => t.key === tf)?.interval || '4h'

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

  const loadChart = useCallback(async (c: string, intv: string) => {
    setChartLoading(true)
    try {
      // Premium bilan bir xil manba — ko‘proq sham (150)
      const res = await fetch(
        `/api/analyze?symbol=${encodeURIComponent(c)}&interval=${encodeURIComponent(intv)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('chart')
      const data = await res.json()
      setCandles(Array.isArray(data.candles) ? data.candles : [])
    } catch {
      setCandles([])
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
    loadChart(coin, interval)
  }, [coin, interval, loadChart])

  const selectedCell = payload?.data?.[coin]?.[tf]

  const cards = useMemo(() => {
    return COINS.map((c) => ({
      coin: c,
      cell: payload?.data?.[c]?.[tf],
    }))
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
        .rsiCards{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
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
        .rsiCardVal{font-size:1.4rem;font-weight:900;margin:8px 0 4px;line-height:1}
        .rsiCardState{font-size:.68rem;opacity:.9;font-weight:600}
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
            RSI kartasini bosing — pastida Premium uslubidagi shamchali grafik ochiladi.
          </p>
        </div>
        <div className="rsiTfGroup" role="group" aria-label="Timeframe">
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
            <CandleChart candles={candles} coin={coin} tf={tf} />
          )}

          {selectedCell && (
            <div className="rsiHmFoot">
              {coin} · {tf} · RSI(14): {selectedCell.rsi ?? '—'} · Shamlar: {candles.length} ·
              Yangilandi:{' '}
              {payload?.updatedAt ? new Date(payload.updatedAt).toLocaleTimeString() : '—'}
            </div>
          )}
        </>
      )}
    </section>
  )
}
