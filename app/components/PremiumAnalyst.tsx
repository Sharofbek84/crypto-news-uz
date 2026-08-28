'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CryptoAnalystAI from './CryptoAnalystAI'

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }
type Result = {
  ema10: number
  ema20: number
  ema50: number
  rsi: number
  macd: number
  signal: number
  histogram: number
  trend: string
  side?: string
  support: number[]
  resistance: number[]
  entryLow: number
  entryHigh: number
  invalidation: number
  tp: number[]
  bullish: string
  bearish: string
  summary: string
}

type Pivot = { i: number; price: number; rsi: number }
type DivLine = {
  kind: 'bull-div' | 'bear-div' | 'bull-hid' | 'bear-hid'
  a: Pivot
  b: Pivot
}

const coins = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM', 'XAUT', 'XRP', 'XLM', 'BCH', 'LINK', 'AVAX']
const intervals = [
  ['1h', 'H1'],
  ['4h', 'H4'],
  ['1d', 'D1'],
] as const

function money(n: number) {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}
function money$(n: number) {
  return '$' + money(n)
}
function tfShort(i: string) {
  return ({ '1h': 'H1', '4h': 'H4', '1d': 'D1' } as any)[i] || i
}
function tfLong(i: string) {
  return i === '4h' ? '4 soatlik (H4)' : i === '1d' ? '1 kunlik (D1)' : '1 soatlik (H1)'
}
function rsiSeries(c: Candle[], p = 14) {
  const out: number[] = []
  let g = 0
  let l = 0
  for (let i = 0; i < c.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const d = c[i].close - c[i - 1].close
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
function emaSeries(c: Candle[], p: number) {
  let a = c[0]?.close || 0
  const k = 2 / (p + 1)
  return c.map((x, i) => {
    if (i) a = x.close * k + a * (1 - k)
    return a
  })
}

function findPivots(candles: Candle[], rs: number[], left = 3, right = 3) {
  const highs: Pivot[] = []
  const lows: Pivot[] = []
  for (let i = left; i < candles.length - right; i++) {
    let isHigh = true
    let isLow = true
    for (let j = 1; j <= left; j++) {
      if (candles[i - j].high >= candles[i].high) isHigh = false
      if (candles[i - j].low <= candles[i].low) isLow = false
    }
    for (let j = 1; j <= right; j++) {
      if (candles[i + j].high > candles[i].high) isHigh = false
      if (candles[i + j].low < candles[i].low) isLow = false
    }
    if (isHigh) highs.push({ i, price: candles[i].high, rsi: rs[i] })
    if (isLow) lows.push({ i, price: candles[i].low, rsi: rs[i] })
  }
  return { highs, lows }
}

function detectRsiDivergences(candles: Candle[], rs: number[]): DivLine[] {
  if (candles.length < 30) return []
  const { highs, lows } = findPivots(candles, rs, 3, 3)
  const out: DivLine[] = []
  const minGap = 5

  if (lows.length >= 2) {
    const a = lows[lows.length - 2]
    const b = lows[lows.length - 1]
    if (b.i - a.i >= minGap) {
      if (b.price < a.price && b.rsi > a.rsi) out.push({ kind: 'bull-div', a, b })
      else if (b.price > a.price && b.rsi < a.rsi) out.push({ kind: 'bull-hid', a, b })
    }
  }

  if (highs.length >= 2) {
    const a = highs[highs.length - 2]
    const b = highs[highs.length - 1]
    if (b.i - a.i >= minGap) {
      if (b.price > a.price && b.rsi < a.rsi) out.push({ kind: 'bear-div', a, b })
      else if (b.price < a.price && b.rsi > a.rsi) out.push({ kind: 'bear-hid', a, b })
    }
  }

  return out
}

function divLabel(kind: DivLine['kind']) {
  if (kind === 'bull-div') return 'Bull Div'
  if (kind === 'bear-div') return 'Bear Div'
  if (kind === 'bull-hid') return 'Bull Hid'
  return 'Bear Hid'
}

function divColor(kind: DivLine['kind']) {
  return kind.startsWith('bull') ? '#20d67a' : '#ff5360'
}

function CleanChart({
  candles,
  result,
  coin,
  interval,
}: {
  candles: Candle[]
  result: Result
  coin: string
  interval: string
}) {
  const [zoom, setZoom] = useState(1)
  if (!candles?.length || !result) return null

  const W = 1700
  const H = 820
  const L = 68
  const R = 210
  const T = 78
  const MB = 540
  const RT = 580
  const RB = 740
  const plotRight = W - R
  const candleRight = L + (plotRight - L) * 0.93
  const min = Math.min(...candles.map((c) => c.low), result.entryLow, ...result.tp, result.invalidation) * 0.997
  const max = Math.max(...candles.map((c) => c.high), result.entryHigh, ...result.tp, result.invalidation) * 1.003
  const span = Math.max(max - min, 1e-9)
  const n = candles.length
  const visible = Math.max(35, Math.floor(n / zoom))
  const start = Math.max(0, n - visible)
  const data = candles.slice(start)
  const xStep = (candleRight - L) / Math.max(data.length - 1, 1)
  const y = (p: number) => T + ((max - p) / span) * (MB - T)
  const rs = rsiSeries(candles)
  const ema20 = emaSeries(candles, 20)
  const ema50 = emaSeries(candles, 50)
  const divs = detectRsiDivergences(candles, rs)
  const last = candles[candles.length - 1]
  const bodyW = Math.max(2, Math.min(12, xStep * 0.62))
  const support = result.support || []
  const resistance = result.resistance || []

  const pricePath = (series: number[]) => {
    const pts: string[] = []
    for (let i = start; i < series.length; i++) {
      const x = L + (i - start) * xStep
      pts.push(`${x},${y(series[i])}`)
    }
    return pts.join(' ')
  }
  const rsiY = (v: number) => RT + ((80 - v) / 60) * (RB - RT)
  const rsiStep = (candleRight - L) / Math.max(data.length - 1, 1)
  const rsiPath = (series: number[]) => {
    const pts: string[] = []
    for (let i = start; i < series.length; i++) {
      const x = L + (i - start) * rsiStep
      pts.push(`${x},${rsiY(series[i])}`)
    }
    return pts.join(' ')
  }
  const timeLabel = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[980px] h-auto select-none">
        <rect x="0" y="0" width={W} height={H} rx="16" fill="#020617" />
        <text x={L} y="36" fill="#e2e8f0" fontSize="22" fontWeight="700">{coin}/USDT · {tfShort(interval)} · Gate.io</text>
        <text x={L} y="60" fill="#64748b" fontSize="14">{tfLong(interval)} · {last ? money$(last.close) : '-'}</text>

        {[0, 1, 2, 3, 4, 5].map((g) => {
          const gy = T + (MB - T) * (g / 5)
          const p = max - span * (g / 5)
          return <g key={g}><line x1={L} y1={gy} x2={plotRight} y2={gy} stroke="#1e293b" /><text x={plotRight + 8} y={gy + 5} fill="#64748b" fontSize="13">{money$(p)}</text></g>
        })}

        {data.map((c, idx) => {
          const x = L + idx * xStep
          const openY = y(c.open)
          const closeY = y(c.close)
          const highY = y(c.high)
          const lowY = y(c.low)
          const up = c.close >= c.open
          const fill = up ? '#20d67a' : '#ff5360'
          return <g key={c.time}><line x1={x} y1={highY} x2={x} y2={lowY} stroke={fill} strokeWidth="2" /><rect x={x - bodyW / 2} y={Math.min(openY, closeY)} width={bodyW} height={Math.max(1, Math.abs(closeY - openY))} fill={fill} rx="1" /></g>
        })}

        <polyline points={pricePath(ema20)} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.85" />
        <polyline points={pricePath(ema50)} fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.85" />

        {support.map((p, i) => <g key={`s${i}`}><line x1={L} y1={y(p)} x2={plotRight} y2={y(p)} stroke="#20d67a" strokeDasharray="6 6" opacity="0.45" /><text x={plotRight + 8} y={y(p) + 5} fill="#20d67a" fontSize="12">S{i + 1} {money$(p)}</text></g>)}
        {resistance.map((p, i) => <g key={`r${i}`}><line x1={L} y1={y(p)} x2={plotRight} y2={y(p)} stroke="#ff5360" strokeDasharray="6 6" opacity="0.45" /><text x={plotRight + 8} y={y(p) + 5} fill="#ff5360" fontSize="12">R{i + 1} {money$(p)}</text></g>)}

        <line x1={L} y1={y(result.entryLow)} x2={plotRight} y2={y(result.entryLow)} stroke="#facc15" strokeWidth="2" strokeDasharray="10 6" />
        <line x1={L} y1={y(result.entryHigh)} x2={plotRight} y2={y(result.entryHigh)} stroke="#facc15" strokeWidth="2" strokeDasharray="10 6" />
        <text x={plotRight + 8} y={y((result.entryLow + result.entryHigh) / 2) + 5} fill="#facc15" fontSize="13" fontWeight="700">ENTRY</text>

        {result.tp.map((p, i) => <g key={`tp${i}`}><line x1={L} y1={y(p)} x2={plotRight} y2={y(p)} stroke="#22c55e" strokeWidth="2" strokeDasharray="4 8" /><text x={plotRight + 8} y={y(p) + 5} fill="#22c55e" fontSize="13" fontWeight="700">TP{i + 1} {money$(p)}</text></g>)}
        <line x1={L} y1={y(result.invalidation)} x2={plotRight} y2={y(result.invalidation)} stroke="#ef4444" strokeWidth="2" strokeDasharray="4 8" />
        <text x={plotRight + 8} y={y(result.invalidation) + 5} fill="#ef4444" fontSize="13" fontWeight="700">SL {money$(result.invalidation)}</text>

        <text x={L} y={RT - 18} fill="#94a3b8" fontSize="14" fontWeight="700">RSI 14</text>
        <line x1={L} y1={rsiY(70)} x2={plotRight} y2={rsiY(70)} stroke="#334155" strokeDasharray="4 4" />
        <line x1={L} y1={rsiY(30)} x2={plotRight} y2={rsiY(30)} stroke="#334155" strokeDasharray="4 4" />
        <polyline points={rsiPath(rs)} fill="none" stroke="#a78bfa" strokeWidth="2" />
        <text x={plotRight + 8} y={rsiY(70) + 4} fill="#64748b" fontSize="12">70</text>
        <text x={plotRight + 8} y={rsiY(30) + 4} fill="#64748b" fontSize="12">30</text>

        {divs.map((d, idx) => {
          const x1 = L + (d.a.i - start) * xStep
          const x2 = L + (d.b.i - start) * xStep
          if (x1 < L || x2 > plotRight) return null
          const yy1 = y(d.a.price)
          const yy2 = y(d.b.price)
          return <g key={`div-${idx}`}><line x1={x1} y1={yy1} x2={x2} y2={yy2} stroke={divColor(d.kind)} strokeWidth="3" /><text x={(x1 + x2) / 2} y={Math.min(yy1, yy2) - 8} fill={divColor(d.kind)} fontSize="12" fontWeight="700">{divLabel(d.kind)}</text></g>
        })}

        {data.map((c, idx) => idx % Math.max(1, Math.floor(data.length / 8)) === 0 ? <text key={`d${c.time}`} x={L + idx * xStep} y={MB + 24} fill="#64748b" fontSize="11">{timeLabel(c.time)}</text> : null)}
        <text x={L} y={H - 24} fill="#475569" fontSize="12">Support / Resistance · EMA20 · EMA50 · RSI divergence</text>
      </svg>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={() => setZoom((z) => Math.max(1, z / 1.4))} className="px-3 py-1 rounded-lg border border-slate-700 text-slate-300">−</button>
        <button onClick={() => setZoom((z) => Math.min(6, z * 1.4))} className="px-3 py-1 rounded-lg border border-slate-700 text-slate-300">+</button>
      </div>
    </div>
  )
}

export default function PremiumAnalyst() {
  const sp = useSearchParams()
  const [coin, setCoin] = useState(sp.get('coin')?.toUpperCase() || 'BTC')
  const [interval, setInterval] = useState(sp.get('interval') || '4h')
  const [candles, setCandles] = useState<Candle[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`/api/analyze?symbol=${encodeURIComponent(coin)}&interval=${encodeURIComponent(interval)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error || 'Market data xatosi')
        return data
      })
      .then((data) => {
        setCandles(data.candles || [])
        setResult(data.result || null)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message || 'Xatolik') })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [coin, interval])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('coin', coin)
    url.searchParams.set('interval', interval)
    window.history.replaceState({}, '', url.toString())
  }, [coin, interval])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {coins.map((c) => <button key={c} onClick={() => setCoin(c)} className={`px-3 py-2 rounded-xl border ${coin === c ? 'border-amber-400 bg-amber-400/10 text-amber-300' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>{c}</button>)}
      </div>
      <div className="flex gap-2">
        {intervals.map(([value, label]) => <button key={value} onClick={() => setInterval(value)} className={`px-4 py-2 rounded-xl border ${interval === value ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300' : 'border-slate-800 bg-slate-900 text-slate-300'}`}>{label}</button>)}
      </div>
      {loading ? <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-slate-400">Grafik yuklanmoqda...</div> : error ? <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-6 text-red-300">{error}</div> : <CleanChart candles={candles} result={result as Result} coin={coin} interval={interval} />}
      <CryptoAnalystAI />
    </div>
  )
}
