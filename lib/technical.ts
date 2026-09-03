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
  if (interval === '1w') return 'W1'
  if (interval === '1d') return 'D1'
  if (interval === '4h') return 'H4'
  if (interval === '15m') return 'M15'
  return 'H1'
}

function atr(candles: Candle[], period = 14): number {
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
function atrParams(interval: string, last: number, atrVal: number) {
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

function structureWindow(interval: string) {
  return interval === '1w' ? 52 : interval === '1d' ? 80 : interval === '4h' ? 70 : interval === '15m' ? 60 : 48
}

/**
 * NEUTRAL trend: support/resistance yaqinligi + oxirgi candle react.
 * return: 'BUY' | 'SELL' | null (struktura aniq emas)
 */
function neutralStructureBias(
  candles: Candle[],
  last: number,
  interval: string
): { side: 'BUY' | 'SELL'; level: number } | null {
  if (candles.length < 20) return null
  const window = structureWindow(interval)
  const recent = candles.slice(-Math.min(candles.length, window))
  const atrVal = atr(recent, 14)
  if (atrVal <= 0) return null

  const tol = Math.max(atrVal * 0.35, last * 0.0015)
  const nearBand = Math.max(atrVal * 1.1, last * 0.004)

  const swings = findSwingPoints(recent, 2, 2)
  const lows = swings.filter((s) => s.type === 'low').map((s) => s.price)
  const highs = swings.filter((s) => s.type === 'high').map((s) => s.price)

  const supports = clusterLevels(lows, tol).filter((p) => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(highs, tol).filter((p) => p > last).sort((a, b) => a - b)

  const nearestSup = supports[0]
  const nearestRes = resistances[0]

  const c = candles[candles.length - 1]
  const prev = candles[candles.length - 2] ?? c
  const bullReact =
    c.close > c.open ||
    (c.low < prev.low && c.close > prev.close) ||
    c.close >= (c.high + c.low) / 2
  const bearReact =
    c.close < c.open ||
    (c.high > prev.high && c.close < prev.close) ||
    c.close <= (c.high + c.low) / 2

  const distSup = nearestSup != null ? last - nearestSup : Infinity
  const distRes = nearestRes != null ? nearestRes - last : Infinity

  const nearSup = nearestSup != null && distSup <= nearBand
  const nearRes = nearestRes != null && distRes <= nearBand

  if (nearSup && bullReact && (!nearRes || distSup <= distRes)) {
    return { side: 'BUY', level: nearestSup }
  }
  if (nearRes && bearReact && (!nearSup || distRes <= distSup)) {
    return { side: 'SELL', level: nearestRes }
  }

  if (nearSup && !nearRes) return { side: 'BUY', level: nearestSup }
  if (nearRes && !nearSup) return { side: 'SELL', level: nearestRes }

  return null
}

function buildAtrTakeProfits(
  last: number,
  risk: number,
  direction: 'long' | 'short',
  tpR: [number, number, number],
  structureLevels: number[]
): [number, number, number] {
  const r = Math.max(risk, last * 0.0015)
  const minGap = r * 0.35
  const snapBand = r * 0.35

  const rrTargets = tpR.map((m) => (direction === 'long' ? last + r * m : last - r * m))

  const levels =
    direction === 'long'
      ? structureLevels.filter((p) => p > last).sort((a, b) => a - b)
      : structureLevels.filter((p) => p < last).sort((a, b) => b - a)

  const tps: number[] = []
  for (let i = 0; i < 3; i++) {
    let tp = rrTargets[i]

    for (const lvl of levels) {
      if (Math.abs(lvl - rrTargets[i]) <= snapBand) {
        if (tps.length === 0 || Math.abs(lvl - tps[tps.length - 1]) >= minGap) {
          tp = lvl
          break
        }
      }
    }

    if (tps.length > 0) {
      if (direction === 'long') tp = Math.max(tp, tps[tps.length - 1] + minGap)
      else tp = Math.min(tp, tps[tps.length - 1] - minGap)
    }

    tps.push(tp)
  }

  return [tps[0], tps[1], tps[2]]
}

function longLevels(candles: Candle[], last: number, interval: string) {
  const window = structureWindow(interval)
  const recent = candles.slice(-Math.min(candles.length, window))
  const atrVal = atr(recent, 14)
  const { slDist, tpR, entryGap, buf, minSl, maxSl } = atrParams(interval, last, atrVal)

  const tol = last * (interval === '1h' ? 0.002 : interval === '4h' ? 0.003 : 0.004)
  const swings = findSwingPoints(recent, 2, 2)
  const swingLows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map((s) => s.price)
  const rawHighs = swingHighs.map((s) => s.price)
  if (!rawLows.length) rawLows.push(last - slDist)
  if (!rawHighs.length) rawHighs.push(last + slDist)

  const supports = clusterLevels(rawLows, tol).filter((p) => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter((p) => p > last).sort((a, b) => a - b)

  let invalidation = last - slDist
  const structCandidates = swingLows
    .map((s) => s.price - buf)
    .filter((p) => last - p >= minSl && last - p <= maxSl)
  if (structCandidates.length) {
    const nearest = Math.max(...structCandidates)
    const atrSl = last - slDist
    if (Math.abs(nearest - atrSl) <= atrVal * 0.45 || nearest < atrSl) {
      invalidation = Math.min(nearest, atrSl)
    }
  }
  if (last - invalidation < minSl) invalidation = last - minSl
  if (last - invalidation > maxSl) invalidation = last - maxSl

  const entryHigh = last
  const risk = Math.max(last - invalidation, last * 0.0015)
  let entryLow = last - risk * 0.3
  if (entryLow - invalidation < entryGap) entryLow = invalidation + entryGap
  if (entryLow >= entryHigh) entryLow = entryHigh - Math.min(risk * 0.2, last * 0.0025)
  if (entryLow <= invalidation) entryLow = invalidation + entryGap

  const [tp1, tp2, tp3] = buildAtrTakeProfits(last, risk, 'long', tpR, resistances)

  const supportArr = supports.slice(0, 3)
  if (!supportArr.length) supportArr.push(invalidation)
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

function shortLevels(candles: Candle[], last: number, interval: string) {
  const window = structureWindow(interval)
  const recent = candles.slice(-Math.min(candles.length, window))
  const atrVal = atr(recent, 14)
  const { slDist, tpR, entryGap, buf, minSl, maxSl } = atrParams(interval, last, atrVal)

  const tol = last * (interval === '1h' ? 0.002 : interval === '4h' ? 0.003 : 0.004)
  const swings = findSwingPoints(recent, 2, 2)
  const swingLows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map((s) => s.price)
  const rawHighs = swingHighs.map((s) => s.price)
  if (!rawLows.length) rawLows.push(last - slDist)
  if (!rawHighs.length) rawHighs.push(last + slDist)

  const supports = clusterLevels(rawLows, tol).filter((p) => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter((p) => p > last).sort((a, b) => a - b)

  let invalidation = last + slDist
  const structCandidates = swingHighs
    .map((s) => s.price + buf)
    .filter((p) => p - last >= minSl && p - last <= maxSl)
  if (structCandidates.length) {
    const nearest = Math.min(...structCandidates)
    const atrSl = last + slDist
    if (Math.abs(nearest - atrSl) <= atrVal * 0.45 || nearest > atrSl) {
      invalidation = Math.max(nearest, atrSl)
    }
  }
  if (invalidation - last < minSl) invalidation = last + minSl
  if (invalidation - last > maxSl) invalidation = last + maxSl

  const entryLow = last
  const risk = Math.max(invalidation - last, last * 0.0015)
  let entryHigh = last + risk * 0.3
  if (invalidation - entryHigh < entryGap) entryHigh = invalidation - entryGap
  if (entryHigh <= entryLow) entryHigh = entryLow + Math.min(risk * 0.2, last * 0.0025)
  if (entryHigh >= invalidation) entryHigh = invalidation - entryGap

  const [tp1, tp2, tp3] = buildAtrTakeProfits(last, risk, 'short', tpR, supports)

  const supportArr = supports.slice(0, 3)
  if (!supportArr.length) supportArr.push(tp1)
  const resistanceArr = resistances.slice(0, 3)
  if (!resistanceArr.length) resistanceArr.push(invalidation)

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
  const closes = candles.map((c) => c.close)
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

  // Barcha TF: EMA20 + EMA50 stack
  const isBull = last > e20 && e20 > e50 && r >= 50 && hist >= 0
  const isBear = last < e20 && e20 < e50 && r < 50 && hist < 0
  const trend = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL'

  let side: 'BUY' | 'SELL'
  let neutralTone: 'strong' | 'caution' | null = null

  if (trend === 'BEARISH') {
    side = 'SELL'
  } else if (trend === 'BULLISH') {
    side = 'BUY'
  } else {
    // NEUTRAL: RSI > 50 → ehtiyotkor BUY, RSI < 50 → ehtiyotkor SELL
    if (r > 50) {
      side = 'BUY'
      neutralTone = 'caution'
    } else {
      side = 'SELL'
      neutralTone = 'caution'
    }
  }

  const sr =
    side === 'SELL'
      ? shortLevels(candles, last, interval)
      : longLevels(candles, last, interval)
  const { support, resistance, invalidation, entryLow, entryHigh, tp } = sr

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
      `Narx EMA20 ostida qolsa va momentum salbiy bo'lsa, ` +
      `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} zonalarga pasayish ssenariysi kuchayadi.`

    if (trend === 'BEARISH') {
      summary =
        `${tf} grafikda trend BEARISH. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, pasayish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan yuqorisida yopilsa, signal bekor bo'ladi.`
    } else {
      summary =
        `${tf} grafikda trend NEUTRAL, biroq zaif bearish momentum belgilari mavjud. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, pasayish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan yuqorisida yopilsa, signal bekor bo'ladi.`
    }
  } else {
    bullish =
      `Narx EMA20 ustida va momentum ijobiy bo'lsa, ` +
      `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} gacha rebound/breakout ssenariysi kuzatiladi.`
    bearish =
      `Narx EMA20 ostida qolish va momentum susayishi ` +
      `${fmt(deepSupport)} support zonasini qayta test qilish xavfini oshiradi.`

    if (trend === 'BULLISH') {
      summary =
        `${tf} grafikda trend BULLISH. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, o'sish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, signal bekor bo'ladi.`
    } else {
      summary =
        `${tf} grafikda trend NEUTRAL, biroq zaif bullish momentum belgilari mavjud. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, o'sish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, signal bekor bo'ladi.`
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
    signalTone: neutralTone,
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
