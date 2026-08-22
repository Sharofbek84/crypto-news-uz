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
  side: 'BUY' | 'SELL'
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
  if (interval === '15m') return 'M15'
  return 'H1'
}

function tfLookback(interval: string) {
  if (interval === '1d') return 10
  if (interval === '4h') return 8
  if (interval === '15m') return 5
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

function structureParams(interval: string, last: number) {
  const window =
    interval === '1d' ? 60 : interval === '4h' ? 50 : interval === '15m' ? 36 : 40
  const tol =
    last *
    (interval === '15m' ? 0.0015 : interval === '1h' ? 0.002 : interval === '4h' ? 0.003 : 0.005)
  const lb = tfLookback(interval)
  const bufferMul =
    interval === '15m' ? 0.06 : interval === '1h' ? 0.08 : interval === '4h' ? 0.1 : 0.12
  const maxSlPct =
    interval === '15m' ? 0.01 : interval === '1h' ? 0.015 : interval === '4h' ? 0.025 : 0.04
  const minSlPct =
    interval === '15m' ? 0.003 : interval === '1h' ? 0.004 : interval === '4h' ? 0.006 : 0.01
  return { window, tol, lb, bufferMul, maxSlPct, minSlPct }
}

/** Long (BUY): SL pastida, TP yuqorida */
function longLevels(candles: Candle[], last: number, interval: string) {
  const { window, tol, lb, bufferMul, maxSlPct, minSlPct } = structureParams(interval, last)
  const recent = candles.slice(-Math.min(candles.length, window))
  const swings = findSwingPoints(recent, 2, 2)

  const rawLows: number[] = swings.filter(s => s.type === 'low').map(s => s.price)
  const rawHighs: number[] = swings.filter(s => s.type === 'high').map(s => s.price)
  if (!rawLows.length) rawLows.push(Math.min(...recent.slice(-lb).map(c => c.low)))
  if (!rawHighs.length) rawHighs.push(Math.max(...recent.slice(-lb).map(c => c.high)))

  const supports = clusterLevels(rawLows, tol).filter(p => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter(p => p > last).sort((a, b) => a - b)

  const structureLow = supports[0] ?? Math.min(...recent.slice(-lb).map(c => c.low))
  const nextResHint = resistances[0] ?? last * 1.01
  const rangeHint = Math.max(nextResHint - structureLow, last * 0.004)
  let invalidation = structureLow - rangeHint * bufferMul

  if (last - invalidation > last * maxSlPct) invalidation = last - last * maxSlPct
  if (last - invalidation < last * minSlPct) invalidation = last - last * minSlPct

  const risk = Math.max(last - invalidation, last * 0.003)
  let tp1: number, tp2: number, tp3: number
  if (resistances.length >= 3) {
    ;[tp1, tp2, tp3] = [resistances[0], resistances[1], resistances[2]]
  } else if (resistances.length === 2) {
    ;[tp1, tp2, tp3] = [resistances[0], resistances[1], resistances[1] + risk]
  } else if (resistances.length === 1) {
    ;[tp1, tp2, tp3] = [resistances[0], resistances[0] + risk, resistances[0] + risk * 2]
  } else {
    ;[tp1, tp2, tp3] = [last + risk * 1.2, last + risk * 2, last + risk * 3]
  }
  tp1 = Math.max(tp1, last + risk * 0.5)
  tp2 = Math.max(tp2, tp1 + risk * 0.4)
  tp3 = Math.max(tp3, tp2 + risk * 0.4)

  const supportArr = supports.slice(0, 3)
  const resistanceArr = resistances.slice(0, 3)
  if (!supportArr.length) supportArr.push(structureLow)
  if (!resistanceArr.length) resistanceArr.push(tp1)

  const entryHigh = last
  const entryLow = Math.min(last, Math.max(invalidation + risk * 0.2, structureLow))

  return {
    support: supportArr,
    resistance: resistanceArr,
    invalidation,
    entryLow,
    entryHigh,
    tp: [tp1, tp2, tp3],
  }
}

/** Short (SELL): SL yuqorida, TP pastda */
function shortLevels(candles: Candle[], last: number, interval: string) {
  const { window, tol, lb, bufferMul, maxSlPct, minSlPct } = structureParams(interval, last)
  const recent = candles.slice(-Math.min(candles.length, window))
  const swings = findSwingPoints(recent, 2, 2)

  const rawLows: number[] = swings.filter(s => s.type === 'low').map(s => s.price)
  const rawHighs: number[] = swings.filter(s => s.type === 'high').map(s => s.price)
  if (!rawLows.length) rawLows.push(Math.min(...recent.slice(-lb).map(c => c.low)))
  if (!rawHighs.length) rawHighs.push(Math.max(...recent.slice(-lb).map(c => c.high)))

  const supports = clusterLevels(rawLows, tol).filter(p => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter(p => p > last).sort((a, b) => a - b)

  const structureHigh = resistances[0] ?? Math.max(...recent.slice(-lb).map(c => c.high))
  const nextSupHint = supports[0] ?? last * 0.99
  const rangeHint = Math.max(structureHigh - nextSupHint, last * 0.004)
  let invalidation = structureHigh + rangeHint * bufferMul

  if (invalidation - last > last * maxSlPct) invalidation = last + last * maxSlPct
  if (invalidation - last < last * minSlPct) invalidation = last + last * minSlPct

  const risk = Math.max(invalidation - last, last * 0.003)
  let tp1: number, tp2: number, tp3: number
  if (supports.length >= 3) {
    ;[tp1, tp2, tp3] = [supports[0], supports[1], supports[2]]
  } else if (supports.length === 2) {
    ;[tp1, tp2, tp3] = [supports[0], supports[1], supports[1] - risk]
  } else if (supports.length === 1) {
    ;[tp1, tp2, tp3] = [supports[0], supports[0] - risk, supports[0] - risk * 2]
  } else {
    ;[tp1, tp2, tp3] = [last - risk * 1.2, last - risk * 2, last - risk * 3]
  }
  tp1 = Math.min(tp1, last - risk * 0.5)
  tp2 = Math.min(tp2, tp1 - risk * 0.4)
  tp3 = Math.min(tp3, tp2 - risk * 0.4)

  const supportArr = supports.slice(0, 3)
  const resistanceArr = resistances.slice(0, 3)
  if (!supportArr.length) supportArr.push(tp1)
  if (!resistanceArr.length) resistanceArr.push(structureHigh)

  const entryLow = last
  const entryHigh = Math.max(last, Math.min(invalidation - risk * 0.2, structureHigh))

  return {
    support: supportArr,
    resistance: resistanceArr,
    invalidation,
    entryLow,
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
  const side: 'BUY' | 'SELL' = trend === 'BEARISH' ? 'SELL' : 'BUY'

  const sr = side === 'SELL' ? shortLevels(candles, last, interval) : longLevels(candles, last, interval)
  const { support, resistance, invalidation, entryLow, entryHigh, tp } = sr

  const deepSupport =
    support.length >= 2 ? support[support.length - 1] : support[0] ?? (side === 'SELL' ? tp[2] : invalidation)
  const deepRes =
    resistance.length >= 1 ? resistance[resistance.length - 1] : invalidation

  const tf = tfLabel(interval)

  let bullish: string
  let bearish: string
  let summary: string

  if (side === 'SELL') {
    // BUY uslubidagi kabi: zona + davom ehtimoli + SL
    bullish = `Narx EMA20 ustiga qaytsa va momentum tiklansa, ${fmt(deepRes)} resistance zonasiga rebound xavfi bor.`
    bearish = `Narx EMA20/EMA50 ostida va momentum salbiy bo‘lsa, ${fmt(tp[2])} gacha pasayish ssenariysi kuzatiladi.`
    summary = `${tf}: BEARISH — SELL. Zona ${fmt(entryLow)}–${fmt(entryHigh)} ostida ushlansa, pastga davom ehtimoli yuqori. ${fmt(invalidation)} yuqoriga buzilsa, rebound kuchayadi.`
  } else {
    bullish = `Narx EMA20 ustida va momentum ijobiy bo‘lsa, ${fmt(tp[2])} gacha rebound/breakout ssenariysi kuzatiladi.`
    bearish = `Narx EMA20/EMA50 ostida qolish va momentum susayishi ${fmt(deepSupport)} support zonasini qayta test qilish xavfini oshiradi.`
    if (trend === 'BULLISH') {
      summary = `${tf}: BULLISH — BUY. Zona ${fmt(entryLow)}–${fmt(entryHigh)} ustida ushlansa, yuqoriga davom ehtimoli yuqori. ${fmt(invalidation)} pastga buzilsa, pasayish ssenariysi kuchayadi.`
    } else {
      summary = `${tf}: NEUTRAL — BUY. Zona ${fmt(entryLow)}–${fmt(entryHigh)} atrofida. Ushbu zona ustida ushlansa yuqoriga davom ehtimoli bor. ${fmt(invalidation)} pastga buzilsa, pasayish kuchayadi.`
    }
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
    side,
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
