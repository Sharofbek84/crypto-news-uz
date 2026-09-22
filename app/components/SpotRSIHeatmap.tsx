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

type TradeLevels = {
  buys: number[]
  sells: number[]
  side: string | null
}

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

function uniqLevels(values: number[], maxCount: number, minGapPct = 0.03) {
  const out: number[] = []
  for (const v of values) {
    if (!Number.isFinite(v) || v <= 0) continue
    if (out.some((x) => Math.abs(x - v) / Math.max(Math.abs(x), Math.abs(v), 1) < minGapPct)) continue
    out.push(v)
    if (out.length >= maxCount) break
  }
  return out
}

function toNums(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n))
}

function buildTradeLevels(result: Record<string, unknown> | null | undefined, price: number): TradeLevels {
  if (!result || !Number.isFinite(price) || price <= 0) return { buys: [], sells: [], side: null }

  const side = typeof result.side === 'string' ? result.side : null
  const support = toNums(result.support)
  const resistance = toNums(result.resistance)
  const tp = toNums(result.tp)

  // Premium: BUY ← support, SELL ← TP1/TP2 (yoki qarshilik)
  const supportsBelow = support
    .filter((v: number) => v < price * 0.999)
    .sort((a: number, b: number) => b - a)

  const resistsAbove = resistance
    .filter((v: number) => v > price * 1.001)
    .sort((a: number, b: number) => a - b)

  const tpAbove: number[] = []
  const tpBelow: number[] = []
  for (let i = 0; i < Math.min(2, tp.length); i++) {
    const v = tp[i]
    if (!Number.isFinite(v)) continue
    if (v > price * 1.001) tpAbove.push(v)
    else if (v < price * 0.999) tpBelow.push(v)
  }

  let buys: number[] = []
  let sells: number[] = []

  // 0.3% min farq — XAUT kabi yaqin zonalar ham chiqadi
  if (side === 'SELL') {
    sells = uniqLevels(resistsAbove, 2, 0.003)
    buys = uniqLevels(tpBelow.length ? tpBelow : supportsBelow, 2, 0.003)
  } else {
    buys = uniqLevels(supportsBelow, 2, 0.003)
    sells = uniqLevels(tpAbove.length ? tpAbove : resistsAbove, 2, 0.003)
  }

  return { buys: buys.slice(0, 2), sells: sells.slice(0, 2), side }
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
  levels: TradeLevels | null
}) {
  if (!candles.length) return <div className="rsiChartEmpty">Grafik ma'lumoti yo'q</div>

  const W = 1700
  const H = 720
  const L = 24
  const R = 200
  const T = 56
  const MB = 480
  const RT = 520
  const RB = 680
  const plotRight = W - R
  const candleRight = L + (plotRight - L) * 0.97
  const priceLabelX = plotRight + 6
  const labelX = plotRight + 72

  const levelPrices = [...(levels?.buys || []), ...(levels?.sells || [])]
  const min = Math.min(...candles.map((c) => c.low), ...(levelPrices.length ? levelPrices : [Infinity])) * 0.997
  const max = Math.max(...candles.map((c) => c.high), ...(levelPrices.length ? levelPrices : [0])) * 1.003
  const x = (i: number) => L + (i * (candleRight - L)) / Math.max(1, candles.length - 1)
  const y = (v: number) => MB - ((v - min) / (max - min || 1)) * (MB - T)
  const ry = (v: number) => RB - (Math.max(0, Math.min(100, v)) / 100) * (RB - RT)
  const e10 = emaSeries(candles, 10)
  const e20 = emaSeries(candles, 20)
  const e50 = emaSeries(candles, 50)
  const rs = rsiSeries(candles)
  const poly = (arr: number[]) => arr.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const rpoly = (arr: number[]) => arr.map((v, i) => `${x(i)},${ry(v)}`).join(' ')
  const cw = Math.max(1.6, Math.min(8, ((candleRight - L) / candles.length) * 0.65))

  const last = candles[candles.length - 1]
  const prevC = candles[candles.length - 2]?.close ?? last.close
  const latest = last.close
  const chg = latest - prevC
  const chgPct = prevC ? (chg / prevC) * 100 : 0
  const up = chg >= 0
  const lx = x(candles.length - 1)

  const priceTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => max - (max - min) * t)

  const sideLabel = levels?.side === 'SELL' ? 'SELL' : levels?.side === 'BUY' ? 'BUY' : ''

  const levelLabels: { p: number; label: string; bg: string }[] = []
  levels?.buys.forEach((p, i) =>
    levelLabels.push({ p, label: `BUY${i + 1}  ${money(p)}`, bg: '#148f55' })
  )
  levels?.sells.forEach((p, i) =>
    levelLabels.push({ p, label: `SELL${i + 1}  ${money(p)}`, bg: '#c52f3a' })
  )
  levelLabels.sort((a, b) => b.p - a.p)
  const placedLabels: { yy: number; p: number; label: string; bg: string }[] = []
  const minGap = 28
  for (const it of levelLabels) {
    let yy = y(it.p)
    for (const prev of placedLabels) {
      if (Math.abs(yy - prev.yy) < minGap) {
        if (yy >= prev.yy) yy = prev.yy + minGap
        else yy = prev.yy - minGap
      }
    }
    yy = Math.max(T + 14, Math.min(MB - 14, yy))
    placedLabels.push({ yy, p: it.p, label: it.label, bg: it.bg })
  }

  return (
    <div className="homeChartWrap">
      <div className="homeChartScroller">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="homeChart"
          style={{ width: '100%', maxWidth: 'none' }}
          role="img"
          aria-label={`${coin} ${tf} chart`}
        >
          <defs>
            <linearGradient id="hmMain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a1018" />
              <stop offset="1" stopColor="#070b11" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#hmMain)" />
          <rect x="0" y={RT - 16} width={W} height={RB - RT + 50} fill="#0e1320" />

          {priceTicks.map((v, i) => {
            const yy = y(v)
            return (
              <g key={i}>
                <line x1={L} x2={plotRight} y1={yy} y2={yy} stroke="#182230" />
                <text x={priceLabelX} y={yy + 4} fill="#8b949e" fontSize="11" fontWeight="600">
                  {money(v)}
                </text>
              </g>
            )
          })}

          <text x={L + 8} y="28" fill="#f0b90b" fontSize="18" fontWeight="800">
            {coin}/USDT · {tf}
            {sideLabel ? ` · ${sideLabel}` : ''}
          </text>
          <text x={L + 8} y="50" fill="#9aa7b8" fontSize="12">
            O {money(last.open)} H {money(last.high)} L {money(last.low)} C {money(latest)}{' '}
            <tspan fill={up ? '#20d67a' : '#ff5360'}>
              {chg >= 0 ? '+' : ''}
              {money(chg)} ({chgPct >= 0 ? '+' : ''}
              {chgPct.toFixed(2)}%)
            </tspan>
          </text>

          <text x={L + 8} y="70" fill="#ff9f0a" fontSize="12" fontWeight="700">
            EMA 10: {money(e10[e10.length - 1])}
          </text>
          <text x={L + 200} y="70" fill="#00c7e6" fontSize="12" fontWeight="700">
            EMA 20: {money(e20[e20.length - 1])}
          </text>
          <text x={L + 400} y="70" fill="#4aa8ff" fontSize="12" fontWeight="700">
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
                  strokeWidth="1.05"
                />
                <rect
                  x={x(i) - cw / 2}
                  y={Math.min(y(c.open), y(c.close))}
                  width={cw}
                  height={Math.max(1.2, Math.abs(y(c.open) - y(c.close)))}
                  fill={bull ? '#36d66f' : '#ff4d5a'}
                  rx="1"
                />
              </g>
            )
          })}

          <polyline points={poly(e10)} fill="none" stroke="#ff9f0a" strokeWidth="1.9" />
          <polyline points={poly(e20)} fill="none" stroke="#00c7e6" strokeWidth="1.9" />
          <polyline points={poly(e50)} fill="none" stroke="#4aa8ff" strokeWidth="1.9" />

          {placedLabels.map((it, i) => (
            <g key={i}>
              <line
                x1={L}
                x2={plotRight}
                y1={y(it.p)}
                y2={y(it.p)}
                stroke={it.bg}
                strokeWidth="1.3"
                strokeDasharray="6 5"
                opacity="0.85"
              />
              <line
                x1={plotRight}
                x2={labelX}
                y1={y(it.p)}
                y2={it.yy}
                stroke={it.bg}
                strokeWidth="1"
                opacity="0.45"
              />
              <rect x={labelX} y={it.yy - 12} width={118} height={24} rx="4" fill={it.bg} />
              <text
                x={labelX + 59}
                y={it.yy + 5}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                fontWeight="800"
              >
                {it.label}
              </text>
            </g>
          ))}

          <line
            x1={L}
            x2={plotRight}
            y1={y(latest)}
            y2={y(latest)}
            stroke="#65d9ff"
            strokeDasharray="3 4"
            strokeWidth="1.2"
          />
          <rect x={labelX} y={y(latest) - 13} width={118} height={26} rx="4" fill="#1a6f9a" />
          <text x={labelX + 59} y={y(latest) + 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">
            {money(latest)}
          </text>
          <circle cx={lx} cy={y(latest)} r="3.5" fill="#65d9ff" />

          <text x={L + 8} y={RT + 6} fill="#e6edf3" fontSize="14" fontWeight="800">
            RSI 14 {rs[rs.length - 1]?.toFixed(2) ?? '—'}
          </text>
          {[30, 50, 70].map((v) => (
            <line key={v} x1={L} x2={plotRight} y1={ry(v)} y2={ry(v)} stroke="#3a4658" strokeDasharray="4 6" />
          ))}
          <polyline points={rpoly(rs)} fill="none" stroke="#a78bfa" strokeWidth="2" />
          <rect x={labelX} y={ry(rs[rs.length - 1] ?? 50) - 12} width={70} height={24} rx="4" fill="#5b4a9a" />
          <text
            x={labelX + 35}
            y={ry(rs[rs.length - 1] ?? 50) + 5}
            textAnchor="middle"
            fill="#fff"
            fontSize="12"
            fontWeight="700"
          >
            {(rs[rs.length - 1] ?? 0).toFixed(1)}
          </text>
          <text x={plotRight - 6} y={ry(70) - 5} textAnchor="end" fill="#7a8796" fontSize="11">
            70
          </text>
          <text x={plotRight - 6} y={ry(50) - 5} textAnchor="end" fill="#7a8796" fontSize="11">
            50
          </text>
          <text x={plotRight - 6} y={ry(30) - 5} textAnchor="end" fill="#7a8796" fontSize="11">
            30
          </text>
        </svg>
      </div>
    </div>
  )
}

export default function SpotRSIHeatmap() {
  const [payload, setPayload] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tf, setTf] = useState<'H4' | 'D1' | 'W1'>('W1')
  const [coin, setCoin] = useState<(typeof COINS)[number]>('BTC')
  const [candles, setCandles] = useState<Candle[]>([])
  const [levels, setLevels] = useState<TradeLevels | null>(null)
  const [chartLoading, setChartLoading] = useState(true)

  const interval = TIMEFRAMES.find((t) => t.key === tf)?.interval || '1w'

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

  const loadChart = useCallback(async (c: string, timeframe: string, intv: string) => {
    setChartLoading(true)
    try {
      const [chartRes, analyzeRes] = await Promise.all([
        fetch(`/api/spot-heatmap/chart?coin=${encodeURIComponent(c)}&tf=${encodeURIComponent(timeframe)}`, {
          cache: 'no-store',
        }),
        fetch(`/api/analyze?symbol=${encodeURIComponent(c)}&interval=${encodeURIComponent(intv)}`, {
          cache: 'no-store',
        }),
      ])

      if (chartRes.ok) {
        const data = await chartRes.json()
        setCandles(Array.isArray(data.candles) ? data.candles : [])
      } else {
        setCandles([])
      }

      if (analyzeRes.ok) {
        const data = await analyzeRes.json()
        const result = data.result || data
        const price =
          Array.isArray(data.candles) && data.candles.length
            ? data.candles[data.candles.length - 1].close
            : result?.entryHigh || 0
        setLevels(buildTradeLevels(result as Record<string, unknown>, Number(price)))
      } else {
        setLevels(null)
      }
    } catch {
      setCandles([])
      setLevels(null)
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
    loadChart(coin, tf, interval)
  }, [coin, tf, interval, loadChart])

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
        .rsiLevelsNote{
          margin-top:10px;padding:10px 12px;border-radius:10px;
          background:#111820;border:1px solid #252d38;font-size:.78rem;color:#9aa7b8;
          display:flex;flex-wrap:wrap;gap:10px 16px
        }
        .rsiLevelsNote b{color:#e6edf3}
        .rsiBuy{color:#20d67a}
        .rsiSell{color:#ff5360}
        @media(max-width:560px){
          .rsiHm{padding:14px}
          .rsiCards{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
      `}</style>

      <div className="rsiHmHead">
        <div>
          <h1 className="rsiHmTitle">Spot RSI Heatmap</h1>
          <p className="rsiHmSub">Top kriptovalyutalar trendini bir joyda kuzating.</p>
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
        <div className="rsiHmLoading">Ma'lumot yuklanmoqda...</div>
      ) : error ? (
        <div className="rsiHmError">
          Ma'lumot olinmadi.{' '}
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
            <>
              <CandleChart candles={candles} coin={coin} tf={tf} levels={levels} />
              {levels && (levels.buys.length > 0 || levels.sells.length > 0) && (
                <div className="rsiLevelsNote">
                  <span>
                    Signal: <b>{levels.side || '—'}</b>
                  </span>
                  {levels.buys.map((p, i) => (
                    <span key={`b${i}`} className="rsiBuy">
                      BUY{i + 1}: <b>{money(p)}</b>
                    </span>
                  ))}
                  {levels.sells.map((p, i) => (
                    <span key={`s${i}`} className="rsiSell">
                      SELL{i + 1}: <b>{money(p)}</b>
                    </span>
                  ))}
                </div>
              )}
            </>
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
