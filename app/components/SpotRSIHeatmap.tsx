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
  'WCT',
  'MYX',
  'FHE',
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
  rsiDirection: Direction
  price: number | null
}

type Payload = {
  updatedAt: string
  cells: Record<string, Record<string, Cell>>
}

type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

type Levels = {
  entry?: number
  sl?: number
  tp1?: number
  tp2?: number
  tp3?: number
}

function rsiColor(rsi: number | null): string {
  if (rsi == null) return 'rgba(48, 54, 61, 0.6)'
  if (rsi >= 70) return 'rgba(231, 76, 60, 0.35)'
  if (rsi <= 30) return 'rgba(46, 204, 113, 0.35)'
  if (rsi >= 55) return 'rgba(241, 196, 15, 0.25)'
  if (rsi <= 45) return 'rgba(52, 152, 219, 0.25)'
  return 'rgba(48, 54, 61, 0.6)'
}

function rsiLabel(rsi: number | null): string {
  if (rsi == null) return '—'
  if (rsi >= 70) return 'Ortiqcha sotilgan'
  if (rsi <= 30) return 'Ortiqcha sotib olingan'
  if (rsi >= 55) return 'Bullish'
  if (rsi <= 45) return 'Bearish'
  return 'Neytral'
}

function arrow(d: Direction): string {
  if (d === 'up') return '↑'
  if (d === 'down') return '↓'
  return '→'
}

function formatPrice(p: number | null): string {
  if (p == null) return '—'
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return p.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function CandleChart({
  candles,
  coin,
  tf,
  levels,
}: {
  candles: Candle[]
  coin: string
  tf: string
  levels: Levels | null
}) {
  if (!candles.length) return null

  const w = 640
  const h = 280
  const padL = 48
  const padR = 12
  const padT = 16
  const padB = 28
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  let min = Math.min(...lows)
  let max = Math.max(...highs)
  if (levels) {
    const vals = [levels.entry, levels.sl, levels.tp1, levels.tp2, levels.tp3].filter(
      (v): v is number => typeof v === 'number'
    )
    if (vals.length) {
      min = Math.min(min, ...vals)
      max = Math.max(max, ...vals)
    }
  }
  const range = max - min || 1

  const x = (i: number) => padL + (i / Math.max(candles.length - 1, 1)) * chartW
  const y = (v: number) => padT + ((max - v) / range) * chartH

  const candleW = Math.max(2, (chartW / candles.length) * 0.6)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="rsiSvg" role="img" aria-label={`${coin} ${tf} chart`}>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = padT + t * chartH
        const val = max - t * range
        return (
          <g key={t}>
            <line x1={padL} y1={yy} x2={w - padR} y2={yy} stroke="#30363d" strokeWidth={1} />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fill="#8b949e" fontSize={10}>
              {formatPrice(val)}
            </text>
          </g>
        )
      })}

      {candles.map((c, i) => {
        const cx = x(i)
        const openY = y(c.open)
        const closeY = y(c.close)
        const highY = y(c.high)
        const lowY = y(c.low)
        const up = c.close >= c.open
        const color = up ? '#2ecc71' : '#e74c3c'
        const bodyTop = Math.min(openY, closeY)
        const bodyH = Math.max(1, Math.abs(closeY - openY))
        return (
          <g key={i}>
            <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1} />
            <rect
              x={cx - candleW / 2}
              y={bodyTop}
              width={candleW}
              height={bodyH}
              fill={color}
            />
          </g>
        )
      })}

      {levels &&
        ([
          { key: 'entry', val: levels.entry, color: '#58a6ff', label: 'Kirish' },
          { key: 'sl', val: levels.sl, color: '#e74c3c', label: 'SL' },
          { key: 'tp1', val: levels.tp1, color: '#2ecc71', label: 'TP1' },
          { key: 'tp2', val: levels.tp2, color: '#27ae60', label: 'TP2' },
          { key: 'tp3', val: levels.tp3, color: '#1abc9c', label: 'TP3' },
        ] as const).map(({ key, val, color, label }) => {
          if (val == null) return null
          const yy = y(val)
          return (
            <g key={key}>
              <line
                x1={padL}
                y1={yy}
                x2={w - padR}
                y2={yy}
                stroke={color}
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              <text x={w - padR - 2} y={yy - 3} textAnchor="end" fill={color} fontSize={10}>
                {label} {formatPrice(val)}
              </text>
            </g>
          )
        })}
    </svg>
  )
}

export default function SpotRSIHeatmap() {
  const { data: session } = useSession()
  const isPremium = Boolean((session?.user as any)?.isPremium)

  const [tf, setTf] = useState<'H4' | 'D1' | 'W1'>('H4')
  const [coin, setCoin] = useState<string>('BTC')
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [candles, setCandles] = useState<Candle[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [levels, setLevels] = useState<Levels | null>(null)

  const cells = payload?.cells

  const loadHeatmap = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/spot-rsi-heatmap', { cache: 'no-store' })
      if (!res.ok) throw new Error('fail')
      const data = (await res.json()) as Payload
      setPayload(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadChart = useCallback(async (c: string, t: string) => {
    setChartLoading(true)
    try {
      const res = await fetch(`/api/spot-rsi-chart?coin=${c}&tf=${t}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('fail')
      const data = await res.json()
      setCandles(data.candles || [])
      setLevels(data.levels || null)
    } catch {
      setCandles([])
      setLevels(null)
    } finally {
      setChartLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHeatmap()
  }, [loadHeatmap])

  useEffect(() => {
    loadChart(coin, tf)
  }, [coin, tf, loadChart])

  const selectedCell = useMemo(() => {
    return cells?.[coin]?.[tf] ?? null
  }, [cells, coin, tf])

  const premiumHref = '/premium'

  return (
    <section className="rsiHeat">
      <style>{`
        .rsiHeat { margin: 0; }
        .rsiHeadRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; flex-wrap: wrap; }
        .rsiSub { margin: 0; color: #8b949e; font-size: 0.9rem; }
        .rsiTfRow { display: flex; gap: 6px; }
        .rsiTfBtn {
          background: #21262d; border: 1px solid #30363d; color: #c9d1d9;
          border-radius: 6px; padding: 6px 12px; font-size: 0.85rem; cursor: pointer;
        }
        .rsiTfBtn.active { background: #238636; border-color: #2ea043; color: #fff; }
        .rsiGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 8px;
          margin-bottom: 16px;
        }
        .rsiCard {
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 10px 8px;
          text-align: left;
          cursor: pointer;
          color: #e6edf3;
          transition: border-color 0.15s;
        }
        .rsiCard:hover, .rsiCard.active { border-color: #58a6ff; }
        .rsiCardTop { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
        .rsiCoin { font-weight: 700; font-size: 0.95rem; }
        .rsiPrice { font-size: 0.75rem; color: #8b949e; }
        .rsiVal { font-size: 1.15rem; font-weight: 700; }
        .rsiMeta { font-size: 0.72rem; color: #8b949e; margin-top: 2px; }
        .rsiLoad, .rsiErr { text-align: center; padding: 24px; color: #8b949e; }
        .rsiErr { color: #e74c3c; }
        .rsiChartOuter {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 10px;
          padding: 8px;
          overflow: hidden;
        }
        .rsiSvg { width: 100%; height: auto; display: block; }
        .rsiHmFoot {
          margin-top: 6px;
          font-size: 0.78rem;
          color: #8b949e;
          text-align: center;
        }
        .rsiTradeBox {
          margin-top: 12px;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 0.85rem;
          color: #c9d1d9;
        }
        .rsiTradeTitle { font-weight: 700; margin-bottom: 6px; color: #e6edf3; }
        .rsiTradeLine { margin-bottom: 6px; }
        .rsiTradeLabel { color: #8b949e; font-weight: 600; }
        .rsiBuy { color: #2ecc71; margin-right: 6px; }
        .rsiSell { color: #e74c3c; margin-right: 6px; }
      `}</style>

      <div className="rsiHeadRow">
        <p className="rsiSub">
          Top kriptovalyutalar trendini bir joyda kuzating.
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
      </div>

      {loading && !payload ? (
        <div className="rsiLoad">Yuklanmoqda…</div>
      ) : error ? (
        <div className="rsiErr">Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>
      ) : (
        <>
          <div className="rsiGrid">
            {COINS.map((c) => {
              const cell = cells?.[c]?.[tf]
              const rsi = cell?.rsi ?? null
              return (
                <button
                  key={c}
                  type="button"
                  className={`rsiCard${coin === c ? ' active' : ''}`}
                  style={{ background: rsiColor(rsi) }}
                  onClick={() => setCoin(c)}
                >
                  <div className="rsiCardTop">
                    <span className="rsiCoin">{c}</span>
                    <span className="rsiPrice">{formatPrice(cell?.price ?? null)}</span>
                  </div>
                  <div className="rsiVal">
                    {rsi != null ? rsi.toFixed(1) : '—'}{' '}
                    <span style={{ fontSize: '0.8rem' }}>{arrow(cell?.rsiDirection ?? null)}</span>
                  </div>
                  <div className="rsiMeta">{rsiLabel(rsi)}</div>
                </button>
              )
            })}
          </div>

          {chartLoading ? (
            <div className="rsiLoad">Grafik yuklanmoqda…</div>
          ) : (
            <>
              <div className="rsiChartOuter">
                <CandleChart candles={candles} coin={coin} tf={tf} levels={levels} />
                {selectedCell && (
                  <div className="rsiHmFoot">
                    {coin} · {tf} · RSI(14): {selectedCell.rsi ?? '—'} ·
                    Yangilandi:{' '}
                    {payload?.updatedAt ? new Date(payload.updatedAt).toLocaleTimeString() : '—'}
                  </div>
                )}
              </div>
              {levels && (() => {
                const dir = selectedCell?.rsiDirection
                const isLong = dir === 'up' || (selectedCell?.rsi != null && selectedCell.rsi < 40)
                return (
                  <div className="rsiTradeBox">
                    <div className="rsiTradeTitle">
                      {isLong ? <span className="rsiBuy">LONG</span> : <span className="rsiSell">SHORT</span>}
                      {coin} · {tf}
                    </div>
                    <div className="rsiTradeLine">
                      <span className="rsiTradeLabel">Kirish:</span> {formatPrice(levels.entry ?? null)}
                    </div>
                    <div className="rsiTradeLine">
                      <span className="rsiTradeLabel">SL:</span> {formatPrice(levels.sl ?? null)}
                    </div>
                    <div className="rsiTradeLine">
                      <span className="rsiTradeLabel">TP1 / TP2 / TP3:</span>{' '}
                      {formatPrice(levels.tp1 ?? null)} / {formatPrice(levels.tp2 ?? null)} /{' '}
                      {formatPrice(levels.tp3 ?? null)}
                    </div>
                    {!isPremium && (
                      <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#8b949e' }}>
                        To‘liq signal va tahlil premium sahifada berilgan <Link href={premiumHref}>{'>>>'}</Link>
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          )}
        </>
      )}
    </section>
  )
}
