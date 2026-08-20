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
  const lows = recent.map(c => c.low).sort((a, b) => a - b)
  const highs = recent.map(c => c.high).sort((a, b) => b - a)
  return { support: lows.slice(0, 3), resistance: highs.slice(0, 3) }
}

/** Oxirgi N ta shamdan eng past low (yaqin swing low) */
function recentSwingLow(candles: Candle[], lookback: number) {
  const slice = candles.slice(-lookback)
  return Math.min(...slice.map(c => c.low))
}

/** Oddiy ATR (Average True Range) – volatillik o‘lchovi */
function atr(candles: Candle[], period = 14) {
  if (candles.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1]
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)))
  }
  const recent = trs.slice(-period)
  return recent.reduce((a, b) => a + b, 0) / recent.length
}

function fmt(n: number) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(5)
}

function tfLabel(interval?: string) {
  if (interval === '1d') return 'D1'
  if (interval === '4h') return 'H4'
  return 'H1'
}

/** Timeframe bo‘yicha SL/TP multiplikatorlari – qisqa SL, realistik TP */
function tfParams(interval: string) {
  // lookback: yaqin swing low uchun shamlar soni
  // slBuffer: SL ni swing low dan biroz pastroqqa siljitish (ATR ulushi)
  // tpMult: TP1/TP2/TP3 uchun ATR multiplikatorlari
  if (interval === '1d') {
    return { lookback: 18, slBuffer: 0.4, tpMult: [1.5, 2.5, 4] }
  }
  if (interval === '4h') {
    return { lookback: 10, slBuffer: 0.35, tpMult: [1.2, 2.2, 3.5] }
  }
  // 1h – eng qisqa SL
  return { lookback: 6, slBuffer: 0.25, tpMult: [1.0, 1.8, 2.8] }
}

export function analyze(candles: Candle[], interval: string = '1h'): TechnicalResult {
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

  const params = tfParams(interval)
  const vol = atr(candles, 14) || last * 0.005
  const swingLow = recentSwingLow(candles, params.lookback)

  // SL: yaqin swing low dan biroz pastroq (ATR buffer bilan) – iloji boricha qisqa
  let invalidation = swingLow - vol * params.slBuffer
  // SL hech qachon narxdan haddan tashqari uzoq bo‘lmasin
  const maxSlDistance = interval === '1h' ? last * 0.015 : interval === '4h' ? last * 0.025 : last * 0.04
  if (last - invalidation > maxSlDistance) {
    invalidation = last - maxSlDistance
  }
  // Minimal masofa – juda yaqin SL ham bo‘lmasin (noise)
  const minSlDistance = vol * 0.5
  if (last - invalidation < minSlDistance) {
    invalidation = last - minSlDistance
  }

  // Entry zona: narx atrofida, SL dan yuqoriroq
  const entryHigh = last
  const entryLow = Math.max(invalidation + vol * 0.3, last - vol * 0.8)

  // TP: ATR asosida timeframe bo‘yicha
  const tp = params.tpMult.map(m => last + vol * m)

  const s = Math.min(...support)
  const rr = Math.max(...resistance)
  const tf = tfLabel(interval)

  let summary: string
  if (trend === 'BULLISH') {
    summary = `${tf}: Narx ${fmt(entryLow)}–${fmt(entryHigh)} zona ustida ushlanib tursa, yuqoriga davom etishi ehtimoli yuqori. ${fmt(invalidation)} pastga buzilsa, pasayish ssenariysi kuchayadi.`
  } else if (trend === 'BEARISH') {
    summary = `${tf}: Narx ${fmt(entryHigh)} atrofida bosim ostida. ${fmt(invalidation)} pastga yopilsa, pasayish davom etishi mumkin. ${fmt(entryLow)}–${fmt(entryHigh)} zona ustida qayta ushlansa, rebound kutiladi.`
  } else {
    summary = `${tf}: Narx ${fmt(entryLow)}–${fmt(entryHigh)} zona atrofida neytral. Ushbu zona ustida ushlanib tursa, yuqoriga davom etishi ehtimoli bor. ${fmt(invalidation)} pastga buzilsa, pasayish davom etishi mumkin.`
  }

  const bullish = `Narx EMA20 ustida va momentum ijobiy bo‘lsa, ${fmt(rr)} gacha rebound/breakout ssenariysi kuzatiladi.`
  const bearish = `EMA20/EMA50 ostida qolish va momentum susayishi ${fmt(s)} support zonasini qayta test qilish xavfini oshiradi.`

  return {
    ema10: e10, ema20: e20, ema50: e50, rsi: r, macd: macdLine, signal, histogram: hist,
    trend, support, resistance,
    entryLow, entryHigh, invalidation, tp,
    bullish, bearish, summary
  }
}
