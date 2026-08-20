export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
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

function fmt(n: number) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(5)
}

function tfLabel(interval?: string) {
  if (interval === '1d') return 'D1'
  if (interval === '4h') return 'H4'
  return 'H1'
}

function tfLookback(interval: string) {
  if (interval === '1d') return 10
  if (interval === '4h') return 8
  return 6
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

function clusterLevels(prices: number[], tolerance: number) {
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

/** Support / Resistance + Breakout — faqat SL/TP (grafikda chizilmaydi) */
function srBreakoutLevels(candles: Candle[], last: number, interval: string) {
  const window = Math.min(candles.length, interval === '1d' ? 60 : interval === '4h' ? 50 : 40)
  const recent = candles.slice(-window)
  const swings = findSwingPoints(recent, 2, 2)
  const tol = last * (interval === '1h' ? 0.002 : interval === '4h' ? 0.003 : 0.005)
  const lb = tfLookback(interval)

  const rawLows: number[] = swings.filter(s => s.type === 'low').map(s => s.price)
  const rawHighs: number[] = swings.filter(s => s.type === 'high').map(s => s.price)

  if (!rawLows.length) {
    rawLows.push(Math.min(...recent.slice(-lb).map(c => c.low)))
  }
  if (!rawHighs.length) {
    rawHighs.push(Math.max(...recent.slice(-lb).map(c => c.high)))
  }

  const supports = clusterLevels(rawLows, tol).filter(p => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter(p => p > last).sort((a, b) => a - b)

  const allRes = clusterLevels(rawHighs, tol).sort((a, b) => a - b)
  const nearestResBelow = [...allRes].reverse().find(p => p <= last)
  const isBreakout =
    nearestResBelow != null && last > nearestResBelow && (last - nearestResBelow) / last < 0.02

  let structureLow: number
  if (isBreakout && nearestResBelow != null) {
    structureLow = supports[0] ?? nearestResBelow * 0.995
  } else {
    structureLow = supports[0] ?? Math.min(...recent.slice(-lb).map(c => c.low))
  }

  const nextResHint = resistances[0] ?? last * 1.01
  const rangeHint = Math.max(nextResHint - structureLow, last * 0.004)
  const buffer = rangeHint * (interval === '1h' ? 0.08 : interval === '4h' ? 0.1 : 0.12)
  let invalidation = structureLow - buffer

  const maxSl = interval === '1h' ? last * 0.015 : interval === '4h' ? last * 0.025 : last * 0.04
  if (last - invalidation > maxSl) invalidation = last - maxSl
  const minSl = last * (interval === '1h' ? 0.004 : interval === '4h' ? 0.006 : 0.01)
  if (last - invalidation < minSl) invalidation = last - minSl

  const risk = Math.max(last - invalidation, last * 0.003)
  let tp1: number
  let tp2: number
  let tp3: number

  if (resistances.length >= 3) {
    tp1 = resistances[0]
    tp2 = resistances[1]
    tp3 = resistances[2]
  } else if (resistances.length === 2) {
    tp1 = resistances[0]
    tp2 = resistances[1]
    tp3 = resistances[1] + risk
  } else if (resistances.length === 1) {
    tp1 = resistances[0]
    tp2 = resistances[0] + risk
    tp3 = resistances[0] + risk * 2
  } else if (isBreakout) {
    tp1 = last + risk * 0.8
    tp2 = last + risk * 1.5
    tp3 = last + risk * 2.2
  } else {
    tp1 = last + risk * 1.2
    tp2 = last + risk * 2
    tp3 = last + risk * 3
  }

  tp1 = Math.max(tp1, last + risk * 0.5)
  tp2 = Math.max(tp2, tp1 + risk * 0.4)
  tp3 = Math.max(tp3, tp2 + risk * 0.4)

  const supportArr = supports.slice(0, 3)
  const resistanceArr = resistances.slice(0, 3)
  if (!supportArr.length) supportArr.push(structureLow)
  if (!resistanceArr.length) resistanceArr.push(tp1)

  const entryHigh = last
  let entryLow: number
  if (isBreakout && nearestResBelow != null) {
    entryLow = Math.max(invalidation + risk * 0.25, nearestResBelow)
  } else {
    entryLow = Math.max(invalidation + risk * 0.2, structureLow)
  }

  return {
    support: supportArr,
    resistance: resistanceArr,
    invalidation,
    entryLow: Math.min(entryLow, last),
    entryHigh,
    tp: [tp1, tp2, tp3],
  }
}

export function analyze(candles: Candle[], interval: string = '1h'): TechnicalResult {
  const closes = candles.map(c => c.close)
  const last = closes.at(-1) ?? 0
  const e10 = ema(closes, 10)
  const e20 = ema(closes, 20)
  const e50 = ema(closes, 50)
  const r = rsi(closes)
  const macdLine = ema(closes, 12) - ema(closes, 26)
  const signal = ema(
    closes.map((_, i) => ema(closes.slice(0, i + 1), 12) - ema(closes.slice(0, i + 1), 26)),
    9
  )
  const hist = macdLine - signal
  const isBull = last > e20 && e20 > e50 && r >= 50 && hist >= 0
  const isBear = last < e20 && e20 < e50 && r < 50 && hist < 0
  const trend = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL'

  const sr = srBreakoutLevels(candles, last, interval)
  const { support, resistance, invalidation, entryLow, entryHigh, tp } = sr

  const s = support[0] ?? invalidation
  const tf = tfLabel(interval)

  const bullish = `Narx EMA20 ustida va momentum ijobiy bo‘lsa, ${fmt(tp[2])} gacha rebound/breakout ssenariysi kuzatiladi.`
  const bearish = `Narx EMA20/EMA50 ostida qolish va momentum susayishi ${fmt(s)} support zonasini qayta test qilish xavfini oshiradi.`

  let summary: string
  if (trend === 'BULLISH') {
    summary = `${tf}: Narx ${fmt(entryLow)}–${fmt(entryHigh)} zona ustida ushlanib tursa, yuqoriga davom etishi ehtimoli yuqori. ${fmt(invalidation)} pastga buzilsa, pasayish ssenariysi kuchayadi.`
  } else if (trend === 'BEARISH') {
    summary = `${tf}: Narx ${fmt(entryHigh)} atrofida bosim ostida. ${fmt(invalidation)} pastga yopilsa, pasayish davom etishi mumkin. ${fmt(entryLow)}–${fmt(entryHigh)} zona ustida qayta ushlansa, rebound kutiladi.`
  } else {
    summary = `${tf}: Narx ${fmt(entryLow)}–${fmt(entryHigh)} zona atrofida neytral. Ushbu zona ustida ushlanib tursa, yuqoriga davom etishi ehtimoli bor. ${fmt(invalidation)} pastga buzilsa, pasayish davom etishi mumkin.`
  }

  return {
    ema10: e10,
    ema20: e20,
    ema50: e50,
    rsi: r,
    macd: macdLine,
    signal,
    histogram: hist,
    trend,
    support,
    resistance,
    entryLow,
    entryHigh,
    invalidation,
    tp,
    bullish,
    bearish,
    summary,
  }
}
