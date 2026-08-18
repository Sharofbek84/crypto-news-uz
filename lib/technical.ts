export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }

export type TechnicalResult = {
  ema10: number; ema20: number; ema50: number; rsi: number; macd: number; signal: number; histogram: number
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  support: number[]; resistance: number[]
  entryLow: number; entryHigh: number; invalidation: number; tp: number[]
  bullish: string; bearish: string; summary: string
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
  let gain = 0, loss = 0
  for (let i = 1; i <= period; i++) { const d = values[i] - values[i - 1]; if (d >= 0) gain += d; else loss -= d }
  let avgGain = gain / period, avgLoss = loss / period
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function levels(candles: Candle[]) {
  const recent = candles.slice(-50)
  const lows = recent.map(c => c.low).sort((a,b) => a-b)
  const highs = recent.map(c => c.high).sort((a,b) => b-a)
  return { support: lows.slice(0, 3), resistance: highs.slice(0, 3) }
}

function fmt(n: number) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(5)
}

export function analyze(candles: Candle[]): TechnicalResult {
  const closes = candles.map(c => c.close)
  const last = closes.at(-1) ?? 0
  const e10 = ema(closes, 10), e20 = ema(closes, 20), e50 = ema(closes, 50)
  const r = rsi(closes)
  const macdLine = ema(closes, 12) - ema(closes, 26)
  const signal = ema(closes.map((_, i) => ema(closes.slice(0, i + 1), 12) - ema(closes.slice(0, i + 1), 26)), 9)
  const hist = macdLine - signal
  const { support, resistance } = levels(candles)
  const isBull = last > e20 && e20 > e50 && r >= 50 && hist >= 0
  const isBear = last < e20 && e20 < e50 && r < 50 && hist < 0
  const trend = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL'
  const s = Math.min(...support)
  const rr = Math.max(...resistance)
  const range = Math.max(last - s, last * 0.01)
  const entryLow = Math.max(s, last - range * 0.35)
  const entryHigh = last
  const invalidation = s - range * 0.2
  const tp = [last + range, last + range * 2, last + range * 3]

  // Qisqa tahliliy xulosa (texnik ko'rsatkichlar ro'yxati emas)
  let summary: string
  if (trend === 'BULLISH') {
    summary = `Narx ${fmt(entryLow)}–${fmt(entryHigh)} zona ustida ushlanib tursa, yuqoriga davom etishi ehtimoli yuqori. ${fmt(invalidation)} pastga buzilsa, pasayish ssenariysi kuchayadi.`
  } else if (trend === 'BEARISH') {
    summary = `Narx ${fmt(entryHigh)} atrofida bosim ostida. ${fmt(invalidation)} pastga yopilsa, pasayish davom etishi mumkin. ${fmt(entryLow)}–${fmt(entryHigh)} zona ustida qayta ushlansa, rebound kutiladi.`
  } else {
    summary = `Narx ${fmt(entryLow)}–${fmt(entryHigh)} zona atrofida neytral. Ushbu zona ustida ushlanib tursa, yuqoriga davom etishi ehtimoli bor. ${fmt(invalidation)} pastga buzilsa, pasayish davom etishi mumkin.`
  }

  // Oldingi uslubdagi bullish / bearish ssenariylar
  const bullish = `Narx EMA20 ustida va momentum ijobiy bo‘lsa, ${fmt(rr)} gacha rebound/breakout ssenariysi kuzatiladi.`
  const bearish = `EMA20/EMA50 ostida qolish va momentum susayishi ${fmt(s)} support zonasini qayta test qilish xavfini oshiradi.`

  return {
    ema10: e10, ema20: e20, ema50: e50, rsi: r, macd: macdLine, signal, histogram: hist,
    trend, support, resistance,
    entryLow, entryHigh, invalidation, tp,
    bullish, bearish, summary
  }
}
