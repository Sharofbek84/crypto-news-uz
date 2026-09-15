export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Divergence = {
  type: 'bullish' | 'bearish'
  i1: number
  i2: number
  price1: number
  price2: number
  rsi1: number
  rsi2: number
}

export type StructureSignal = {
  type: 'BUY' | 'SELL'
  level: number
  swingIndex: number
  breakIndex: number
  retestIndex: number
  context: 'uptrend-break' | 'downtrend-break'
}

export type TechnicalResult = {
  ema10: number
  ema20: number
  ema50: number
  rsi: number
  macd: number
  signal: number
  histogram: number
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  side: 'BUY' | 'SELL'
  /** NEUTRAL: 'strong' | 'caution'; boshqa trendlarda null */
  signalTone: 'strong' | 'caution' | null
  support: number[]
  resistance: number[]
  entryLow: number
  entryHigh: number
  invalidation: number
  tp: number[]
  bullish: string
  bearish: string
  summary: string
  divergence: Divergence | null
  /** Premium: trend structure break + retest */
  structureSignal: StructureSignal | null
}

export function ema(values: number[], period: number) {
  if (!values.length) return 0
  const k = 2 / (period + 1)
  let out = values[0]
  for (let i = 1; i < values.length; i++) out = values[i] * k + out * (1 - k)
  return out
}

export function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  let avgGain = gain / period
  let avgLoss = loss / period
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

export function rsiSeries(values: number[], period = 14): number[] {
  const out: number[] = []
  let g = 0
  let l = 0
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const d = values[i] - values[i - 1]
    const gg = Math.max(d, 0)
    const ll = Math.max(-d, 0)
    if (i <= period) {
      g += gg
      l += ll
      out.push(i === period ? (l === 0 ? 100 : 100 - 100 / (1 + g / l)) : 50)
    } else {
      g = (g * (period - 1) + gg) / period
      l = (l * (period - 1) + ll) / period
      out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l))
    }
  }
  return out
}

export function fmt(n: number) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(5)
}

export function tfLabel(interval?: string) {
  if (interval === '1w') return 'W1'
  if (interval === '1d') return 'D1'
  if (interval === '4h') return 'H4'
  if (interval === '15m') return 'M15'
  return 'H1'
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const p = candles[i - 1]
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)))
  }
  const slice = trs.slice(-period)
  if (!slice.length) return 0
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

/** TF bo'yicha ATR koeffitsientlari — optimal SL/TP */
export function atrParams(interval: string, last: number, atrVal: number) {
  const atrSlMult =
    interval === '15m' ? 1.0 : interval === '1h' ? 1.2 : interval === '4h' ? 1.5 : interval === '1w' ? 2.1 : 1.7
  const tpR: [number, number, number] =
    interval === '15m' || interval === '1h'
      ? [1.0, 1.8, 2.5]
      : interval === '4h'
        ? [1.2, 2.0, 3.0]
        : [1.5, 2.5, 3.5]

  const minPct =
    interval === '15m' ? 0.003 : interval === '1h' ? 0.004 : interval === '4h' ? 0.007 : interval === '1w' ? 0.018 : 0.01
  const maxPct =
    interval === '15m' ? 0.015 : interval === '1h' ? 0.018 : interval === '4h' ? 0.038 : interval === '1w' ? 0.1 : 0.06
  const gapPct =
    interval === '15m' ? 0.0025 : interval === '1h' ? 0.0035 : interval === '4h' ? 0.006 : interval === '1w' ? 0.012 : 0.008
  const bufPct =
    interval === '15m' ? 0.0008 : interval === '1h' ? 0.0012 : interval === '4h' ? 0.002 : interval === '1w' ? 0.005 : 0.003

  const minSl = last * minPct
  const maxSl = last * maxPct
  const raw = Math.max(atrVal * atrSlMult, last * 0.002)
  const slDist = Math.min(maxSl, Math.max(minSl, raw))

  return {
    slDist,
    tpR,
    entryGap: last * gapPct,
    buf: last * bufPct,
    minSl,
    maxSl,
  }
}

export function findSwingPoints(candles: Candle[], left = 2, right = 2) {
  const swings: { price: number; type: 'high' | 'low'; index: number }[] = []
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i]
    let isHigh = true
    let isLow = true
    for (let j = 1; j <= left; j++) {
      if (candles[i - j].high >= c.high) isHigh = false
      if (candles[i - j].low <= c.low) isLow = false
    }
    for (let j = 1; j <= right; j++) {
      if (candles[i + j].high >= c.high) isHigh = false
      if (candles[i + j].low <= c.low) isLow = false
    }
    if (isHigh) swings.push({ price: c.high, type: 'high', index: i })
    if (isLow) swings.push({ price: c.low, type: 'low', index: i })
  }
  return swings
}

export function clusterLevels(prices: number[], tolerance: number) {
  if (!prices.length) return [] as number[]
  const sorted = [...prices].sort((a, b) => a - b)
  const clusters: number[] = []
  let group = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - group[group.length - 1] <= tolerance) {
      group.push(sorted[i])
    } else {
      clusters.push(group.reduce((a, b) => a + b, 0) / group.length)
      group = [sorted[i]]
    }
  }
  clusters.push(group.reduce((a, b) => a + b, 0) / group.length)
  return clusters
}

export function structureWindow(interval: string) {
  return interval === '1w' ? 52 : interval === '1d' ? 80 : interval === '4h' ? 70 : interval === '15m' ? 60 : 48
}

/**
 * RSI divergensiya: grafik + NEUTRAL signal (RSI tasdiq bilan).
 */
export function detectRsiDivergence(
  candles: Candle[],
  lookbackMin = 5,
  lookbackMax = 40,
  searchBars = 60
): Divergence | null {
  if (candles.length < lookbackMin + 10) return null

  const closes = candles.map((c) => c.close)
  const rs = rsiSeries(closes)
  const left = 2
  const right = 2
  const start = Math.max(left, candles.length - searchBars)

  type Pivot = { i: number; price: number; rsi: number }
  const lows: Pivot[] = []
  const highs: Pivot[] = []

  for (let i = start; i < candles.length - right; i++) {
    const c = candles[i]
    let isLow = true
    let isHigh = true
    for (let j = 1; j <= left; j++) {
      if (candles[i - j].low <= c.low) isLow = false
      if (candles[i - j].high >= c.high) isHigh = false
    }
    for (let j = 1; j <= right; j++) {
      if (candles[i + j].low <= c.low) isLow = false
      if (candles[i + j].high >= c.high) isHigh = false
    }
    if (isLow) lows.push({ i, price: c.low, rsi: rs[i] })
    if (isHigh) highs.push({ i, price: c.high, rsi: rs[i] })
  }

  const rsiEps = 0.5
  let best: Divergence | null = null

  if (lows.length >= 2) {
    const p2 = lows[lows.length - 1]
    for (let a = 0; a < lows.length - 1; a++) {
      const p1 = lows[a]
      const dist = p2.i - p1.i
      if (dist < lookbackMin || dist > lookbackMax) continue
      if (p2.price < p1.price && p2.rsi > p1.rsi + rsiEps) {
        if (!best || best.type !== 'bullish' || p1.i > best.i1) {
          best = {
            type: 'bullish',
            i1: p1.i,
            i2: p2.i,
            price1: p1.price,
            price2: p2.price,
            rsi1: p1.rsi,
            rsi2: p2.rsi,
          }
        }
      }
    }
  }

  if (highs.length >= 2) {
    const p2 = highs[highs.length - 1]
    for (let a = 0; a < highs.length - 1; a++) {
      const p1 = highs[a]
      const dist = p2.i - p1.i
      if (dist < lookbackMin || dist > lookbackMax) continue
      if (p2.price > p1.price && p2.rsi < p1.rsi - rsiEps) {
        const bear: Divergence = {
          type: 'bearish',
          i1: p1.i,
          i2: p2.i,
          price1: p1.price,
          price2: p2.price,
          rsi1: p1.rsi,
          rsi2: p2.rsi,
        }
        if (
          !best ||
          bear.i2 > best.i2 ||
          (bear.i2 === best.i2 && bear.i1 > best.i1)
        ) {
          best = bear
        }
      }
    }
  }

  return best
}
