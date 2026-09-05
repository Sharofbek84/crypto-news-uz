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

function buildAtrTakeProfits(
  last: number,
  risk: number,
  direction: 'long' | 'short',
  tpR: [number, number, number],
  structureLevels: number[]
): [number, number, number] {
  const r = Math.max(risk, last * 0.0015)
  const minGap = r * 0.35
  const out: number[] = []
  let prev = last
  for (let i = 0; i < 3; i++) {
    const atrTp =
      direction === 'long' ? last + tpR[i] * r : last - tpR[i] * r
    let chosen = atrTp
    for (const lvl of structureLevels) {
      if (direction === 'long' && lvl > prev + minGap * 0.5 && lvl < atrTp * 1.02) {
        chosen = lvl
        break
      }
      if (direction === 'short' && lvl < prev - minGap * 0.5 && lvl > atrTp * 0.98) {
        chosen = lvl
        break
      }
    }
    if (direction === 'long' && chosen <= prev + minGap) chosen = prev + minGap
    if (direction === 'short' && chosen >= prev - minGap) chosen = prev - minGap
    out.push(chosen)
    prev = chosen
  }
  return [out[0], out[1], out[2]]
}

function longLevels(candles: Candle[], last: number, interval: string) {
  const recent = candles.slice(-80)
  const atr = atrLike(recent, 14)
  const swings = findSwingPoints(recent, 2, 2)
  const swingLows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map((s) => s.price)
  const rawHighs = swingHighs.map((s) => s.price)
  const supportArr = nearestLevels(uniqSorted(rawLows, true), last, true, 3)
  const resistanceArr = nearestLevels(uniqSorted(rawHighs), last, false, 3)

  const structCandidates = swingLows
    .map((s) => s.price)
    .filter((p) => p < last)
    .sort((a, b) => b - a)
  const invalidation =
    structCandidates[0] ?? last - Math.max(atr * 1.2, last * 0.008)

  const risk = Math.max(last - invalidation, last * 0.004)
  const entryLow = last - risk * 0.15
  const entryHigh = last + risk * 0.05
  const tp = buildAtrTakeProfits(last, risk, 'long', [1.2, 2.0, 3.2], resistanceArr)

  return {
    support: supportArr,
    resistance: resistanceArr,
    invalidation,
    entryLow,
    entryHigh,
    tp: [tp[0], tp[1], tp[2]],
  }
}

function shortLevels(candles: Candle[], last: number, interval: string) {
  const recent = candles.slice(-80)
  const atr = atrLike(recent, 14)
  const swings = findSwingPoints(recent, 2, 2)
  const swingLows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
  const swingHighs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)

  const rawLows = swingLows.map((s) => s.price)
  const rawHighs = swingHighs.map((s) => s.price)
  const supportArr = nearestLevels(uniqSorted(rawLows, true), last, true, 3)
  const resistanceArr = nearestLevels(uniqSorted(rawHighs), last, false, 3)

  const structCandidates = swingHighs
    .map((s) => s.price)
    .filter((p) => p > last)
    .sort((a, b) => a - b)
  const invalidation =
    structCandidates[0] ?? last + Math.max(atr * 1.2, last * 0.008)

  const risk = Math.max(invalidation - last, last * 0.004)
  const entryLow = last - risk * 0.05
  const entryHigh = last + risk * 0.15
  const tp = buildAtrTakeProfits(last, risk, 'short', [1.2, 2.0, 3.2], supportArr)

  return {
    support: supportArr,
    resistance: resistanceArr,
    invalidation,
    entryLow,
    entryHigh,
    tp: [tp[0], tp[1], tp[2]],
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

  const divergence = detectRsiDivergence(candles)

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
    // NEUTRAL + divergensiya: RSI tasdiqlash filtri
    // bullish div + RSI > 50 → BUY (ehtiyotkor)
    // bearish div + RSI < 50 → SELL (ehtiyotkor)
    // fallback: RSI + oxirgi swing strukturasi
    // BUY  = RSI > 50 && close >= lastSwingLow
    // SELL = RSI < 50 && close <= lastSwingHigh
    const swing = lastSwingLevels(candles)
    if (divergence?.type === 'bullish' && r > 50) {
      side = 'BUY'
      neutralTone = 'caution'
    } else if (divergence?.type === 'bearish' && r < 50) {
      side = 'SELL'
      neutralTone = 'caution'
    } else if (swing && r > 50 && last >= swing.low) {
      side = 'BUY'
      neutralTone = 'caution'
    } else if (swing && r < 50 && last <= swing.high) {
      side = 'SELL'
      neutralTone = 'caution'
    } else if (swing && last < swing.low) {
      // swing low sindirilgan — tuzilma pastga
      side = 'SELL'
      neutralTone = 'caution'
    } else if (swing && last > swing.high) {
      // swing high sindirilgan — tuzilma tepaga
      side = 'BUY'
      neutralTone = 'caution'
    } else if (r > 50) {
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
        `${tf} grafikda trend NEUTRAL, biroq bearish momentum belgilari mavjud. ` +
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
        `${tf} grafikda trend NEUTRAL, biroq bullish momentum belgilari mavjud. ` +
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
    divergence,
  }
}
