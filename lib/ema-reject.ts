import type { Candle } from './technical-helpers-a'

export type EmaRejectSignal = {
  type: 'BUY' | 'SELL'
  index: number
  price: number
}

function emaSeries(values: number[], period: number): number[] {
  if (!values.length) return []
  const k = 2 / (period + 1)
  const out = [values[0]]
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k))
  }
  return out
}

/**
 * EMA20 rad etish (rejection) signallari:
 * - SELL: narx EMA20 ni pastdan yuqoriga kesib o'tdi, lekin tagida yopildi; EMA20 < EMA50
 * - BUY:  narx EMA20 ni yuqoridan pastga kesib o'tdi, lekin tepasida yopildi; EMA20 > EMA50
 *
 * Faqat grafik markerlari uchun; asosiy xulosa/side o'zgarmaydi.
 */
export function detectEmaRejectSignals(candles: Candle[]): EmaRejectSignal[] {
  if (candles.length < 55) return []

  const closes = candles.map((c) => c.close)
  const e20 = emaSeries(closes, 20)
  const e50 = emaSeries(closes, 50)
  const out: EmaRejectSignal[] = []

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const prev = candles[i - 1]
    const ema20 = e20[i]
    const ema50 = e50[i]
    const prevEma20 = e20[i - 1]

    // SELL: pastdan yuqoriga kesib o'tish + tagida yopilish + EMA20 EMA50 ostida
    if (
      ema20 < ema50 &&
      prev.close <= prevEma20 &&
      c.high > ema20 &&
      c.close < ema20
    ) {
      out.push({ type: 'SELL', index: i, price: c.close })
      continue
    }

    // BUY: yuqoridan pastga kesib o'tish + tepasida yopilish + EMA20 EMA50 ustida
    if (
      ema20 > ema50 &&
      prev.close >= prevEma20 &&
      c.low < ema20 &&
      c.close > ema20
    ) {
      out.push({ type: 'BUY', index: i, price: c.close })
    }
  }

  return out
}
