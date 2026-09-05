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
}

export function ema(values: number[], period: number) {
  if (values.length === 0) return 0
  const k = 2 / (period + 1)
  let prev = values[0]
  for (let i = 1; i < values.length; i++) prev = values[i] * k + prev * (1 - k)
  return prev
}

export function rsi(values: number[], period = 14) {
  if (values.length < period + 1) return 50
  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1]
    if (d >= 0) gains += d
    else losses -= d
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function rsiSeries(values: number[], period = 14): number[] {
  const out: number[] = []
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const d = values[i] - values[i - 1]
    const gain = Math.max(d, 0)
    const loss = Math.max(-d, 0)
    if (i <= period) {
      avgGain += gain
      avgLoss += loss
      if (i === period) {
        avgGain /= period
        avgLoss /= period
        out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
      } else {
        out.push(50)
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
    }
  }
  return out
}

function uniqSorted(nums: number[], desc = false) {
  const u = [...new Set(nums.map((n) => +n.toPrecision(8)))]
  return u.sort((a, b) => (desc ? b - a : a - b))
}

function nearestLevels(levels: number[], price: number, below: boolean, count: number) {
  const filtered = levels.filter((l) => (below ? l < price : l > price))
  const sorted = filtered.sort((a, b) => (below ? b - a : a - b))
  return sorted.slice(0, count)
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}

function tfLabel(interval: string) {
  if (interval === '1w') return '1 haftalik (W1)'
  if (interval === '1d') return '1 kunlik (D1)'
  if (interval === '4h') return '4 soatlik (H4)'
  return '1 soatlik (H1)'
}

function findSwingPoints(candles: Candle[], left = 2, right = 2) {
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

function atrLike(candles: Candle[], period = 14) {
  if (candles.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const p = candles[i - 1]
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)))
  }
  const slice = trs.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length)
}

/**
 * RSI divergensiya: grafik + NEUTRAL signal (RSI tasdiq bilan).
 * Pivotlar oxirgi ~60 shamchadan qidiriladi.
 * Ikki pivot oralig'i 5–40 shamcha.
 * Bullish: narx pastroq low, RSI yuqoriroq low.
 * Bearish: narx yuqoriroq high, RSI pastroq high.
 */
function detectRsiDivergence(
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

  let best: Divergence | null = null
  const rsiEps = 0.5

  for (let a = 0; a < lows.length; a++) {
    for (let b = a + 1; b < lows.length; b++) {
      const p1 = lows[a]
      const p2 = lows[b]
      const dist = p2.i - p1.i
      if (dist < lookbackMin || dist > lookbackMax) continue
      if (p2.price < p1.price && p2.rsi > p1.rsi + rsiEps) {
        if (!best || p2.i > best.i2 || (p2.i === best.i2 && dist < best.i2 - best.i1)) {
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

  for (let a = 0; a < highs.length; a++) {
    for (let b = a + 1; b < highs.length; b++) {
      const p1 = highs[a]
      const p2 = highs[b]
      const dist = p2.i - p1.i
      if (dist < lookbackMin || dist > lookbackMax) continue
      if (p2.price > p1.price && p2.rsi < p1.rsi - rsiEps) {
        if (!best || p2.i > best.i2 || (p2.i === best.i2 && dist < best.i2 - best.i1)) {
          best = {
            type: 'bearish',
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

  return best
}

/** Oxirgi confirmed swing low/high (pivot left=2, right=2) — NEUTRAL fallback uchun */
function lastSwingLevels(candles: Candle[], searchBars = 60): { low: number; high: number } | null {
  if (candles.length < 10) return null
  const left = 2
  const right = 2
  const start = Math.max(left, candles.length - searchBars)
  let lastLow: number | null = null
  let lastHigh: number | null = null
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
    if (isLow) lastLow = c.low
    if (isHigh) lastHigh = c.high
  }
  if (lastLow == null || lastHigh == null) return null
  return { low: lastLow, high: lastHigh }
}
