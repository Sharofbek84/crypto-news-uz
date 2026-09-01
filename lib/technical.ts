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

/** RSI series for pivot/divergence (same formula as rsi(), per-bar). */
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
    if (i < period) {
      avgGain += gain
      avgLoss += loss
      out.push(50)
    } else if (i === period) {
      avgGain = (avgGain + gain) / period
      avgLoss = (avgLoss + loss) / period
      out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
    }
  }
  return out
}

type RsiDiv = 'bull' | 'bear' | null

/**
 * Regular divergence on last two swing highs/lows:
 * - bear: price higher high, RSI lower high → Ehtiyotkor SELL
 * - bull: price lower low, RSI higher low → Ehtiyotkor BUY
 */
function detectRegularRsiDivergence(candles: Candle[], left = 3, right = 3): RsiDiv {
  if (candles.length < 30) return null
  const closes = candles.map((c) => c.close)
  const rs = rsiSeries(closes)
  const highs: { i: number; price: number; rsi: number }[] = []
  const lows: { i: number; price: number; rsi: number }[] = []

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

  const minGap = 5
  let bear: { dist: number } | null = null
  let bull: { dist: number } | null = null

  if (highs.length >= 2) {
    const a = highs[highs.length - 2]
    const b = highs[highs.length - 1]
    if (b.i - a.i >= minGap && b.price > a.price && b.rsi < a.rsi) {
      bear = { dist: candles.length - 1 - b.i }
    }
  }
  if (lows.length >= 2) {
    const a = lows[lows.length - 2]
    const b = lows[lows.length - 1]
    if (b.i - a.i >= minGap && b.price < a.price && b.rsi > a.rsi) {
      bull = { dist: candles.length - 1 - b.i }
    }
  }

  // Faqat oxirgi 12 sham ichidagi divergensiya signalga ta'sir qilsin
  const maxAge = 12
  if (bear && bear.dist <= maxAge && bull && bull.dist <= maxAge) {
    return bear.dist <= bull.dist ? 'bear' : 'bull'
  }
  if (bear && bear.dist <= maxAge) return 'bear'
  if (bull && bull.dist <= maxAge) return 'bull'
  return null
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

function tfLookback(interval: string) {
  if (interval === '1w') return 26
  if (interval === '1d') return 20
  if (interval === '4h') return 16
  if (interval === '15m') return 12
  return 14
}

function slParams(interval: string, last: number, wider = false) {
  let minPct =
    interval === '15m' ? 0.005 : interval === '1h' ? 0.008 : interval === '4h' ? 0.012 : interval === '1w' ? 0.025 : 0.018
  let gapPct =
    interval === '15m' ? 0.003 : interval === '1h' ? 0.0045 : interval === '4h' ? 0.006 : interval === '1w' ? 0.012 : 0.009
  let bufPct =
    interval === '15m' ? 0.0015 : interval === '1h' ? 0.0025 : interval === '4h' ? 0.0035 : interval === '1w' ? 0.007 : 0.005
  const maxPct =
    interval === '15m' ? 0.025 : interval === '1h' ? 0.04 : interval === '4h' ? 0.055 : interval === '1w' ? 0.12 : 0.08

  if (wider && interval === '1h') {
    minPct *= 1.5
    gapPct *= 1.4
    bufPct *= 1.4
  }

  return {
    minSl: last * minPct,
    entryGap: last * gapPct,
    buf: last * bufPct,
    maxSl: last * maxPct,
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

function structureParams(interval: string, last: number) {
  const window =
    interval === '1w' ? 52 : interval === '1d' ? 80 : interval === '4h' ? 70 : interval === '15m' ? 80 : 60
  const tol =
    last *
    (interval === '15m' ? 0.0015 : interval === '1h' ? 0.002 : interval === '4h' ? 0.003 : interval === '1w' ? 0.008 : 0.005)
  const lb = tfLookback(interval)
  return { window, tol, lb }
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

function buildTakeProfits(
  last: number,
  risk: number,
  direction: 'long' | 'short',
  structureLevels: number[]
): [number, number, number] {
  const r = Math.max(risk, last * 0.002)
  const mults = [1, 2, 3]
  const minGap = r * 0.45
  const snapBand = r * 0.35

  const rrTargets = mults.map((m) =>
    direction === 'long' ? last + r * m : last - r * m
  )

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
      if (direction === 'long') {
        tp = Math.max(tp, tps[tps.length - 1] + minGap)
      } else {
        tp = Math.min(tp, tps[tps.length - 1] - minGap)
      }
    } else {
      if (direction === 'long') tp = Math.max(tp, last + r * 0.7)
      else tp = Math.min(tp, last - r * 0.7)
    }

    tps.push(tp)
  }

  return [tps[0], tps[1], tps[2]]
}

function longLevels(candles: Candle[], last: number, interval: string, widerSl = false) {
  const { window, tol, lb } = structureParams(interval, last)
  const { minSl, entryGap, buf, maxSl } = slParams(interval, last, widerSl)
  const recent = candles.slice(-Math.min(candles.length, window))
  const swings = findSwingPoints(recent, 2, 2)

  const swingLows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map((s) => s.price)
  const rawHighs = swingHighs.map((s) => s.price)
  const windowLow = Math.min(...recent.slice(-lb).map((c) => c.low))
  const windowHigh = Math.max(...recent.slice(-lb).map((c) => c.high))
  if (!rawLows.length) rawLows.push(windowLow)
  if (!rawHighs.length) rawHighs.push(windowHigh)

  const supports = clusterLevels(rawLows, tol).filter((p) => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter((p) => p > last).sort((a, b) => a - b)

  const farLows = swingLows.filter((s) => last - s.price >= minSl * 0.7)
  const lastSwingMin = swingLows.find((s) => s.price < last)?.price
  const structureLow = farLows.length
    ? Math.max(...farLows.map((s) => s.price))
    : Math.min(lastSwingMin ?? windowLow, windowLow, last - minSl)

  let invalidation = structureLow - buf
  if (last - invalidation < minSl) invalidation = last - minSl
  if (last - invalidation > maxSl) invalidation = last - maxSl

  const entryHigh = last
  const riskRange = Math.max(last - invalidation, last * 0.004)
  let entryLow = last - riskRange * 0.4
  if (entryLow - invalidation < entryGap) entryLow = invalidation + entryGap
  if (entryLow >= entryHigh) entryLow = entryHigh - Math.min(riskRange * 0.3, last * 0.004)
  if (entryLow <= invalidation) entryLow = invalidation + entryGap

  const atrVal = atr(recent)
  const risk = Math.max(last - invalidation, atrVal * 0.8, last * 0.002)
  const [tp1, tp2, tp3] = buildTakeProfits(last, risk, 'long', resistances)

  const fullWindowLow = Math.min(...recent.map((c) => c.low))
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
  if (deepLevel < last && (!supportArr.length || deepLevel < Math.min(...supportArr) - last * 0.002)) {
    supportArr.push(deepLevel)
  }
  if (!supportArr.length) supportArr.push(structureLow)

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

function shortLevels(candles: Candle[], last: number, interval: string, widerSl = false) {
  const { window, tol, lb } = structureParams(interval, last)
  const { minSl, entryGap, buf, maxSl } = slParams(interval, last, widerSl)
  const recent = candles.slice(-Math.min(candles.length, window))
  const swings = findSwingPoints(recent, 2, 2)

  const swingLows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map((s) => s.price)
  const rawHighs = swingHighs.map((s) => s.price)
  const windowLow = Math.min(...recent.slice(-lb).map((c) => c.low))
  const windowHigh = Math.max(...recent.slice(-lb).map((c) => c.high))
  if (!rawLows.length) rawLows.push(windowLow)
  if (!rawHighs.length) rawHighs.push(windowHigh)

  const supports = clusterLevels(rawLows, tol).filter((p) => p < last).sort((a, b) => b - a)
  const resistances = clusterLevels(rawHighs, tol).filter((p) => p > last).sort((a, b) => a - b)

  const farHighs = swingHighs.filter((s) => s.price - last >= minSl * 0.7)
  const lastSwingMax = swingHighs.find((s) => s.price > last)?.price
  const structureHigh = farHighs.length
    ? Math.min(...farHighs.map((s) => s.price))
    : Math.max(lastSwingMax ?? windowHigh, windowHigh, last + minSl)

  let invalidation = structureHigh + buf
  if (invalidation - last < minSl) invalidation = last + minSl
  if (invalidation - last > maxSl) invalidation = last + maxSl

  const entryLow = last
  const riskRange = Math.max(invalidation - last, last * 0.004)
  let entryHigh = last + riskRange * 0.4
  if (invalidation - entryHigh < entryGap) entryHigh = invalidation - entryGap
  if (entryHigh <= entryLow) entryHigh = entryLow + Math.min(riskRange * 0.3, last * 0.004)
  if (entryHigh >= invalidation) entryHigh = invalidation - entryGap

  const atrVal = atr(recent)
  const risk = Math.max(invalidation - last, atrVal * 0.8, last * 0.002)
  const [tp1, tp2, tp3] = buildTakeProfits(last, risk, 'short', supports)

  const supportArr = supports.slice(0, 3)
  const resistanceArr = resistances.slice(0, 3)
  if (!supportArr.length) supportArr.push(tp1)
  if (!resistanceArr.length) resistanceArr.push(structureHigh)

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
  const isBull = last > e20 && e20 > e50 && r >= 50 && hist >= 0
  const isBear = last < e20 && e20 < e50 && r < 50 && hist < 0
  const trend = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL'

  // NEUTRAL:
  //   EMA20 ≥ EMA50 && RSI ≥ 50 → BUY
  //   EMA20 ≥ EMA50 && RSI < 50 → Ehtiyotkor BUY
  //   EMA20 < EMA50 && RSI < 50 → SELL
  //   EMA20 < EMA50 && RSI ≥ 50 → Ehtiyotkor SELL
  let side: 'BUY' | 'SELL'
  let neutralTone: 'strong' | 'caution' | null = null

  if (trend === 'BEARISH') {
    side = 'SELL'
  } else if (trend === 'BULLISH') {
    side = 'BUY'
  } else if (e20 >= e50 && r >= 50) {
    side = 'BUY'
    neutralTone = 'strong'
  } else if (e20 >= e50 && r < 50) {
    side = 'BUY'
    neutralTone = 'caution'
  } else if (e20 < e50 && r < 50) {
    side = 'SELL'
    neutralTone = 'strong'
  } else {
    // EMA20 < EMA50 && RSI ≥ 50
    side = 'SELL'
    neutralTone = 'caution'
  }

  // RSI regular divergence → Ehtiyotkor BUY/SELL (ustuvor)
  const rsiDiv = detectRegularRsiDivergence(candles)
  if (rsiDiv === 'bear') {
    side = 'SELL'
    neutralTone = 'caution'
  } else if (rsiDiv === 'bull') {
    side = 'BUY'
    neutralTone = 'caution'
  }

  const widerSl = interval === '1h' && trend === 'NEUTRAL'
  const sr =
    side === 'SELL'
      ? shortLevels(candles, last, interval, widerSl)
      : longLevels(candles, last, interval, widerSl)
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
      `Narx EMA20/EMA50 ostida qolsa va momentum salbiy bo'lsa, ` +
      `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} zonalarga pasayish ssenariysi kuchayadi.`

    if (trend === 'BEARISH') {
      summary =
        `${tf} grafikda trend BEARISH. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, pasayish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan yuqorisida yopilsa, signal bekor bo'ladi.`
    } else if (neutralTone === 'strong') {
      summary =
        `${tf} grafikda trend NEUTRAL, biroq bearish momentum belgilari mavjud. ` +
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
      `Narx EMA20/EMA50 ostida qolish va momentum susayishi ` +
      `${fmt(deepSupport)} support zonasini qayta test qilish xavfini oshiradi.`

    if (trend === 'BULLISH') {
      summary =
        `${tf} grafikda trend BULLISH. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, o'sish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, signal bekor bo'ladi.`
    } else if (neutralTone === 'strong') {
      summary =
        `${tf} grafikda trend NEUTRAL, biroq bullish momentum belgilari mavjud. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, o'sish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, signal bekor bo'ladi.`
    } else {
      summary =
        `${tf} grafikda trend NEUTRAL, biroq zaif bullish momentum belgilari mavjud. ` +
        `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, o'sish ehtimoli bor. ` +
        `Agar narx ${fmt(invalidation)} dan pastida yopilsa, signal bekor bo'ladi.`
    }
  }

  // Divergensiya bo'lsa — xulosani aniqroq yozamiz
  if (rsiDiv === 'bear') {
    summary =
      `${tf} grafikda narx avvalgi maksimumni yangiladi, lekin RSI pasaymoqda (bearish divergence) — ehtiyotkorlik bilan SELL. ` +
      `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, pasayish ehtimoli bor. ` +
      `Agar narx ${fmt(invalidation)} dan yuqorisida yopilsa, signal bekor bo'ladi.`
  } else if (rsiDiv === 'bull') {
    summary =
      `${tf} grafikda narx avvalgi minimumni yangiladi, lekin RSI ko'tarilmoqda (bullish divergence) — ehtiyotkorlik bilan BUY. ` +
      `Agar ${fmt(entryLow)}–${fmt(entryHigh)} kirish zonasi saqlanib qolsa, o'sish ehtimoli bor. ` +
      `Agar narx ${fmt(invalidation)} dan pastida yopilsa, signal bekor bo'ladi.`
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
