import type { Candle } from './technical-helpers-a'

export type EmaPullbackSignal = {
  type: 'BUY' | 'SELL'
  index: number
  price: number
  ema20: number
}

function emaSeries(values: number[], period: number): number[] {
  if (!values.length) return []
  const k = 2 / (period + 1)
  const out: number[] = []
  let prev = values[0]
  out.push(prev)
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out.push(prev)
  }
  return out
}

/**
 * Trend ichida EMA20 pullback:
 * - EMA20 > EMA50 → faqat BUY (narx EMA20 ga tushib, wick + close yuqorida)
 * - EMA20 < EMA50 → faqat SELL (narx EMA20 ga chiqib, wick + close pastida)
 * Birinchi signaldan keyin kamida 5 shamcha ichida takrorlanmaydi.
 * Qaytaradi: eng so'nggi (cooldown bilan) signal.
 */
export function detectEmaPullback(
  candles: Candle[],
  opts?: { lookback?: number; tolPct?: number; cooldown?: number }
): EmaPullbackSignal | null {
  if (candles.length < 55) return null

  const lookback = opts?.lookback ?? 40
  const tolPct = opts?.tolPct ?? 0.003
  const cooldown = opts?.cooldown ?? 5
  const closes = candles.map((c) => c.close)
  const e20s = emaSeries(closes, 20)
  const e50s = emaSeries(closes, 50)

  const from = Math.max(50, candles.length - lookback)
  const found: EmaPullbackSignal[] = []
  let lastSignalIndex = -999

  for (let i = from; i < candles.length; i++) {
    if (i - lastSignalIndex < cooldown) continue

    const c = candles[i]
    const e20 = e20s[i]
    const e50 = e50s[i]
    if (!e20 || !e50) continue

    const tol = Math.max(e20 * tolPct, e20 * 0.0005)
    const body = Math.abs(c.close - c.open)
    const range = c.high - c.low
    if (range <= 0) continue

    // BUY: EMA20 > EMA50, pastga teginish + yuqorida yopilish
    if (e20 > e50) {
      const touched = c.low <= e20 + tol
      const closedAbove = c.close > e20
      const lowerWick = Math.min(c.open, c.close) - c.low
      const bounced = lowerWick >= body * 0.25 || lowerWick >= range * 0.2
      let wasAbove = 0
      for (let j = Math.max(from, i - 4); j < i; j++) {
        if (candles[j].close > e20s[j] - tol) wasAbove++
      }
      if (touched && closedAbove && bounced && wasAbove >= 1) {
        found.push({ type: 'BUY', index: i, price: c.close, ema20: e20 })
        lastSignalIndex = i
        continue
      }
    }

    // SELL: EMA20 < EMA50, yuqoriga teginish + pastida yopilish
    if (e20 < e50) {
      const touched = c.high >= e20 - tol
      const closedBelow = c.close < e20
      const upperWick = c.high - Math.max(c.open, c.close)
      const bounced = upperWick >= body * 0.25 || upperWick >= range * 0.2
      let wasBelow = 0
      for (let j = Math.max(from, i - 4); j < i; j++) {
        if (candles[j].close < e20s[j] + tol) wasBelow++
      }
      if (touched && closedBelow && bounced && wasBelow >= 1) {
        found.push({ type: 'SELL', index: i, price: c.close, ema20: e20 })
        lastSignalIndex = i
      }
    }
  }

  return found.length ? found[found.length - 1] : null
}
