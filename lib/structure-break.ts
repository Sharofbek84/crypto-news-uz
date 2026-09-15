import type { Candle } from './technical-helpers-a'
import { findSwingPoints } from './technical-helpers-a'

export type StructureSignal = {
  type: 'BUY' | 'SELL'
  /** Broken swing level price */
  level: number
  swingIndex: number
  breakIndex: number
  retestIndex: number
  /** EMA trend context: uptrend sell / downtrend buy */
  context: 'uptrend-break' | 'downtrend-break'
}

/**
 * Trend structure break + retest:
 * - O'suvchi trend: oxirgi swing low pastga yoriladi → keyin shu darajaga qaytish = SELL
 * - Tushuvchi trend: oxirgi swing high yuqoriga yoriladi → keyin shu darajaga qaytish = BUY
 *
 * Faqat oxirgi ~80 shamchada qidiriladi; retest oxirgi 12 yopilgan shamchada bo'lishi shart.
 */
export function detectStructureBreakRetest(
  candles: Candle[],
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  opts?: { searchBars?: number; retestWindow?: number; tolPct?: number }
): StructureSignal | null {
  if (candles.length < 30) return null
  if (trend === 'NEUTRAL') return null

  const searchBars = opts?.searchBars ?? 80
  const retestWindow = opts?.retestWindow ?? 12
  const tolPct = opts?.tolPct ?? 0.0025

  const start = Math.max(0, candles.length - searchBars)
  const slice = candles.slice(start)
  const swings = findSwingPoints(slice, 2, 2)
  if (swings.length < 2) return null

  const absIndex = (local: number) => start + local

  if (trend === 'BULLISH') {
    const lows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
    if (!lows.length) return null

    for (const swing of lows.slice(0, 4)) {
      const level = swing.price
      const swingAbs = absIndex(swing.index)
      const tol = Math.max(level * tolPct, level * 0.0008)

      let breakIndex = -1
      for (let i = swingAbs + 2; i < candles.length; i++) {
        if (candles[i].close < level - tol * 0.35) {
          breakIndex = i
          break
        }
      }
      if (breakIndex < 0) continue

      const retestFrom = breakIndex + 1
      const retestTo = Math.min(candles.length - 1, breakIndex + retestWindow)
      for (let i = retestFrom; i <= retestTo; i++) {
        const c = candles[i]
        const touched = c.high >= level - tol && c.low <= level + tol
        const bodyTop = Math.max(c.open, c.close)
        const rejected =
          c.close <= level + tol * 2 &&
          c.high - bodyTop >= Math.abs(c.close - c.open) * 0.35
        if (touched && (rejected || c.close < level + tol)) {
          if (i < candles.length - 10) continue
          return {
            type: 'SELL',
            level,
            swingIndex: swingAbs,
            breakIndex,
            retestIndex: i,
            context: 'uptrend-break',
          }
        }
      }
    }
  }

  if (trend === 'BEARISH') {
    const highs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)
    if (!highs.length) return null

    for (const swing of highs.slice(0, 4)) {
      const level = swing.price
      const swingAbs = absIndex(swing.index)
      const tol = Math.max(level * tolPct, level * 0.0008)

      let breakIndex = -1
      for (let i = swingAbs + 2; i < candles.length; i++) {
        if (candles[i].close > level + tol * 0.35) {
          breakIndex = i
          break
        }
      }
      if (breakIndex < 0) continue

      const retestFrom = breakIndex + 1
      const retestTo = Math.min(candles.length - 1, breakIndex + retestWindow)
      for (let i = retestFrom; i <= retestTo; i++) {
        const c = candles[i]
        const touched = c.low <= level + tol && c.high >= level - tol
        const bodyBot = Math.min(c.open, c.close)
        const rejected =
          c.close >= level - tol * 2 &&
          bodyBot - c.low >= Math.abs(c.close - c.open) * 0.35
        if (touched && (rejected || c.close > level - tol)) {
          if (i < candles.length - 10) continue
          return {
            type: 'BUY',
            level,
            swingIndex: swingAbs,
            breakIndex,
            retestIndex: i,
            context: 'downtrend-break',
          }
        }
      }
    }
  }

  return null
}
