import type { Candle, StructureSignal } from './technical-helpers-a'
import { findSwingPoints } from './technical-helpers-a'

export type { StructureSignal }

/**
 * Break + retest — faqat NEUTRAL trendda:
 * - Oxirgi swing low pastga yoriladi → darajaga qaytish = SELL
 * - Oxirgi swing high yuqoriga yoriladi → darajaga qaytish = BUY
 * BULLISH/BEARISH da null (asosiy trend logikasi buzilmasin).
 */
export function detectStructureBreakRetest(
  candles: Candle[],
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  opts?: { searchBars?: number; retestWindow?: number; tolPct?: number }
): StructureSignal | null {
  if (candles.length < 30) return null
  if (trend !== 'NEUTRAL') return null

  const searchBars = opts?.searchBars ?? 80
  const retestWindow = opts?.retestWindow ?? 12
  const tolPct = opts?.tolPct ?? 0.0025

  const start = Math.max(0, candles.length - searchBars)
  const slice = candles.slice(start)
  const swings = findSwingPoints(slice, 2, 2)
  if (swings.length < 2) return null

  const absIndex = (local: number) => start + local
  const minRetestAge = Math.max(0, candles.length - 10)

  // SELL: oxirgi swing low yorilishi + retest
  const lows = swings.filter((s) => s.type === 'low').sort((a, b) => b.index - a.index)
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
        if (i < minRetestAge) continue
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

  // BUY: oxirgi swing high yorilishi + retest
  const highs = swings.filter((s) => s.type === 'high').sort((a, b) => b.index - a.index)
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
        if (i < minRetestAge) continue
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

  return null
}
