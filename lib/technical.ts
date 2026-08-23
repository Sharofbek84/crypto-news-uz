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
  if (interval === '1d') return 12
  if (interval === '4h') return 10
  if (interval === '15m') return 8
  return 8
}

/** Buffer beyond swing extreme (slightly under min / over max) */
function swingBuffer(interval: string, last: number) {
  const pct =
    interval === '15m' ? 0.0006 : interval === '1h' ? 0.001 : interval === '4h' ? 0.0015 : 0.0025
  return Math.max(last * pct, last * 0.0003)
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
    interval === '1d' ? 80 : interval === '4h' ? 70 : interval === '15m' ? 80 : 60
  const tol =
    last *
    (interval === '15m' ? 0.0015 : interval === '1h' ? 0.002 : interval === '4h' ? 0.003 : 0.005)
  const lb = tfLookback(interval)
  // Max SL distance from price (safety cap only)
  const maxSlPct =
    interval === '15m' ? 0.02 : interval === '1h' ? 0.03 : interval === '4h' ? 0.045 : 0.06
  return { window, tol, lb, maxSlPct }
}

/**
 * BUY: SL = oxirgi minimum (recent swing low / window low) TAGIDA
 * Entry zone = current price at top, above SL
 */
function longLevels(candles: Candle[], last: number, interval: string) {
  const { window, tol, lb, maxSlPct } = structureParams(interval, last)
  const recent = candles.slice(-Math.min(candles.length, window))
  const swings = findSwingPoints(recent, 2, 2)

  const swingLows = swings.filter(s => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter(s => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map(s => s.price)
  const rawHighs = swingHighs.map(s => s.price)
  const windowLow = Math.min(...recent.slice(-lb).map(c => c.low))
  const windowHigh = Math.max(...recent.slice(-lb).map(c => c.high))
  if (!rawLows.length) rawLows.push(windowLow)
  if (!rawHighs.length) rawHighs.push(windowHigh)

  const supports = clusterLevels(rawLows, tol).filter(p => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter(p => p > last).sort((a, b) => a - b)

  // Oxirgi minimum: eng so'nggi swing low (narxdan past), yo'q bo'lsa window low
  const lastSwingMin = swingLows.find(s => s.price < last)?.price
  const lastMin = lastSwingMin != null ? Math.min(lastSwingMin, windowLow) : windowLow

  const buf = swingBuffer(interval, last)
  // SL always under the last minimum
  let invalidation = lastMin - buf

  // Safety: agar SL juda uzoq bo'lsa, oxirgi minimumni saqlab, faqat ekstremal holatda qisqartirish
  if (last - invalidation > last * maxSlPct) {
    // Prefer staying under lastMin; only cap if lastMin itself is extreme
    const capped = last - last * maxSlPct
    invalidation = Math.min(capped, lastMin - buf)
  }

  // Entry zone: from slightly above SL up to current price
  const entryHigh = last
  let entryLow = Math.min(last * 0.999, Math.max(invalidation + buf * 2, lastMin))
  if (entryLow >= entryHigh) entryLow = entryHigh * 0.9995
  // Never let entry include SL
  if (entryLow <= invalidation) entryLow = Math.min(entryHigh * 0.9995, invalidation + buf * 2)

  const risk = Math.max(last - invalidation, last * 0.002)
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

  // Nearest supports + eng uzoq (deep) support
  const fullWindowLow = Math.min(...recent.map(c => c.low))
  const deepLevel = supports.length
    ? Math.min(supports[supports.length - 1], fullWindowLow)
    : fullWindowLow
  const supportArr: number[] = []
  for (const s of supports) {
    if (supportArr.length >= 2) break
    if (!supportArr.length || Math.abs(supportArr[supportArr.length - 1] - s) / last > 0.0015) {
      supportArr.push(s)
    }
  }
  // Always append deepest support if meaningfully lower
  if (deepLevel < last && (!supportArr.length || deepLevel < Math.min(...supportArr) - last * 0.002)) {
    supportArr.push(deepLevel)
  }
  if (!supportArr.length) supportArr.push(lastMin)

  const resistanceArr = resistances.slice(0, 3)
  if (!resistanceArr.length) resistanceArr.push(tp1)

  return {
    support: supportArr,
    resistance: resistanceArr,
    invalidation,
    entryLow,
    entryHigh,
    tp: [tp1, tp2, tp3],
  }
}

/**
 * SELL: SL = oxirgi maksimum (recent swing high / window high) USTIDA
 * Entry zone = current price at bottom, below SL
 */
function shortLevels(candles: Candle[], last: number, interval: string) {
  const { window, tol, lb, maxSlPct } = structureParams(interval, last)
  const recent = candles.slice(-Math.min(candles.length, window))
  const swings = findSwingPoints(recent, 2, 2)

  const swingLows = swings.filter(s => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter(s => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map(s => s.price)
  const rawHighs = swingHighs.map(s => s.price)
  const windowLow = Math.min(...recent.slice(-lb).map(c => c.low))
  const windowHigh = Math.max(...recent.slice(-lb).map(c => c.high))
  if (!rawLows.length) rawLows.push(windowLow)
  if (!rawHighs.length) rawHighs.push(windowHigh)

  const supports = clusterLevels(rawLows, tol).filter(p => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter(p => p > last).sort((a, b) => a - b)

  // Oxirgi maksimum: eng so'nggi swing high (narxdan yuqori), yo'q bo'lsa window high
  const lastSwingMax = swingHighs.find(s => s.price > last)?.price
  const lastMax = lastSwingMax != null ? Math.max(lastSwingMax, windowHigh) : windowHigh

  const buf = swingBuffer(interval, last)
  // SL always above the last maximum
  let invalidation = lastMax + buf

  if (invalidation - last > last * maxSlPct) {
    const capped = last + last * maxSlPct
    invalidation = Math.max(capped, lastMax + buf)
  }

  const entryLow = last
  let entryHigh = Math.max(last * 1.001, Math.min(invalidation - buf * 2, lastMax))
  if (entryHigh <= entryLow) entryHigh = entryLow * 1.0005
  if (entryHigh >= invalidation) entryHigh = Math.max(entryLow * 1.0005, invalidation - buf * 2)

  const risk = Math.max(invalidation - last, last * 0.002)
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
  if (!resistanceArr.length) resistanceArr.push(lastMax)

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

  // Bearish senariy: eng uzoq (eng past) support
  const deepSupport = support.length
    ? Math.min(...support)
    : side === 'SELL'
      ? tp[2]
      : Math.min(invalidation, last * 0.97)

  const tf = tfLabel(interval)

  let bullish: string
  let bearish: string
  let summary: string

  if (side === 'SELL') {
    bullish =
      `Narx ${fmt(invalidation)} resistance zonasini qayta test qilib, EMA20 ustiga chiqsa, ` +
      `qisqa muddatli rebound ehtimoli oshadi va SELL signal bekor bo'lishi mumkin.`
    bearish =
      `Narx EMA20/EMA50 ostida qolsa va momentum salbiy bo'lsa, ` +
      `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} zonalarga pasayish ssenariysi kuchayadi.`

    if (trend === 'BEARISH') {
      summary =
        `${tf} grafikda trend BEARISH. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, narx pastga tushishi mumkin. ` +
        `Agar narx ${fmt(invalidation)} dan yuqorisida yopilsa, rebound ehtimoli oshadi.`
    } else {
      summary =
        `${tf} grafikda trend NEUTRAL, biroq bearish momentum belgilari mavjud. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, narx pastga tushishi mumkin. ` +
        `Agar narx ${fmt(invalidation)} dan yuqorisida yopilsa, rebound ehtimoli oshadi.`
    }
  } else {
    bullish =
      `Narx EMA20 ustida va momentum ijobiy bo'lsa, ` +
      `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} gacha rebound/breakout ssenariysi kuzatiladi.`
    bearish =
      `Narx EMA20/EMA50 ostida qolish va momentum susayishi ` +
      `${fmt(deepSupport)} support zonasini qayta test qilish xavfini oshiradi.`

    if (trend === 'BULLISH') {
      summary =
        `${tf} grafikda trend BULLISH. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, narx tepaga ko'tarilishi mumkin. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, pasayish ehtimoli oshadi.`
    } else {
      summary =
        `${tf} grafikda trend NEUTRAL, biroq bullish momentum belgilari mavjud. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, narx tepaga ko'tarilishi mumkin. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, pasayish ehtimoli oshadi.`
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
