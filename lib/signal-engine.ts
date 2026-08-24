export type SignalType = 'BUY' | 'SELL'

export type SignalInput = {
  time: number
  close: number
  ema20: number
  ema50: number
  rsi: number
  support?: number[]
  resistance?: number[]
}

export type Signal = {
  type: SignalType
  time: number
  price: number
  strength: number
  entryLow: number
  entryHigh: number
  stopLoss: number
  tp1: number
  tp2: number
  tp3: number
}

export function calculateSignal(c: SignalInput): Signal | null {
  const bullishTrend = c.ema20 > c.ema50
  const bearishTrend = c.ema20 < c.ema50
  const bullishRsi = c.rsi >= 50 && c.rsi < 70
  const bearishRsi = c.rsi <= 50 && c.rsi > 30
  const nearSupport = (c.support ?? []).some(v => Math.abs(c.close - v) / Math.max(c.close, 1) <= 0.004)
  const nearResistance = (c.resistance ?? []).some(v => Math.abs(c.close - v) / Math.max(c.close, 1) <= 0.004)

  const buyScore = (bullishTrend ? 30 : 0) + (bullishRsi ? 25 : 0) + (nearSupport ? 25 : 0) + (c.close >= c.ema20 ? 20 : 0)
  const sellScore = (bearishTrend ? 30 : 0) + (bearishRsi ? 25 : 0) + (nearResistance ? 25 : 0) + (c.close <= c.ema20 ? 20 : 0)

  if (buyScore >= 70 && buyScore > sellScore) return makeSignal('BUY', c, buyScore)
  if (sellScore >= 70) return makeSignal('SELL', c, sellScore)
  return null
}

function makeSignal(type: SignalType, c: SignalInput, strength: number): Signal {
  const range = Math.max(Math.abs(c.ema20 - c.ema50), c.close * 0.003)
  const entryLow = Math.min(c.close, c.ema20)
  const entryHigh = Math.max(c.close, c.ema20)
  const stopLoss = type === 'BUY'
    ? Math.min(entryLow - range, c.ema50 - range * 0.25)
    : Math.max(entryHigh + range, c.ema50 + range * 0.25)
  const risk = Math.max(Math.abs(entryHigh - stopLoss), c.close * 0.001)

  return {
    type,
    time: c.time,
    price: c.close,
    strength,
    entryLow,
    entryHigh,
    stopLoss,
    tp1: type === 'BUY' ? entryHigh + risk : entryLow - risk,
    tp2: type === 'BUY' ? entryHigh + risk * 2 : entryLow - risk * 2,
    tp3: type === 'BUY' ? entryHigh + risk * 3 : entryLow - risk * 3,
  }
}

/**
 * Pass CLOSED candles only. A marker is returned only when the signal type
 * changes, so repeated BUY/SELL states do not fill the chart with markers.
 */
export function detectFirstSignals(candles: SignalInput[]): Signal[] {
  const result: Signal[] = []
  let previous: SignalType | null = null

  for (const candle of candles) {
    const signal = calculateSignal(candle)
    if (!signal) continue
    if (signal.type !== previous) {
      result.push(signal)
      previous = signal.type
    }
  }

  return result
}
