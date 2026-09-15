import type { Candle } from './technical-helpers-a'
import {
  structureWindow,
  atr,
  atrParams,
  findSwingPoints,
  clusterLevels,
} from './technical-helpers-a'

/** Oxirgi confirmed swing low/high (pivot left=2, right=2) — NEUTRAL fallback uchun */
export function lastSwingLevels(candles: Candle[], searchBars = 60): { low: number; high: number } | null {
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

export function buildAtrTakeProfits(
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

export function longLevels(candles: Candle[], last: number, interval: string) {
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

export function shortLevels(candles: Candle[], last: number, interval: string) {
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
