export type SignalType = 'BUY' | 'SELL'

export type SignalInput = {
  time: number
  close: number
  ema20: number
  ema50: number
  rsi: number
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

/**
 * AI-free, deterministic signal rules. All inputs are calculated from the
 * candle itself and earlier candles, so historical markers do not depend on
 * today's support/resistance levels.
 */
export function calculateSignal(c: SignalInput): Signal | null {
  const bullishTrend = c.ema20 > c.ema50
  const bearishTrend = c.ema20 < c.ema50
  const bullishRsi = c.rsi >= 50 && c.rsi < 70
  const bearishRsi = c.rsi <= 50 && c.rsi > 30
  const aboveEma20 = c.close >= c.ema20
  const belowEma20 = c.close <= c.ema20

  const buyScore = (bullishTrend ? 35 : 0) + (bullishRsi ? 30 : 0) + (aboveEma20 ? 35 : 0)
  const sellScore = (bearishTrend ? 35 : 0) + (bearishRsi ? 30 : 0) + (belowEma20 ? 35 : 0)

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
 * Pass CLOSED candles only. Only the first signal after a state change is
 * returned, keeping the chart clean instead of printing repeated markers.
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
