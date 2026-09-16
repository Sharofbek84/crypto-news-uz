import {
  ema,
  rsi,
  type Candle,
  type Divergence,
  type TechnicalResult,
  detectRsiDivergence,
  lastSwingLevels,
  longLevels,
  shortLevels,
  tfLabel,
  fmt,
  detectStructureBreakRetest,
  detectEmaPullback,
} from './technical-helpers'

export type { Candle, Divergence, TechnicalResult, StructureSignal, EmaPullbackSignal } from './technical-helpers'
export { ema, rsi }

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
    const swing = lastSwingLevels(candles)
    const useEma50Filter = interval === '4h' || interval === '1d' || interval === '1w'
    const aboveEma50 = last >= e50
    const belowEma50 = last <= e50
    const rsiBuyOk = r > 50 && (!useEma50Filter || aboveEma50)
    const rsiSellOk = r < 50 && (!useEma50Filter || belowEma50)

    if (
      divergence?.type === 'bullish' &&
      rsiBuyOk &&
      (!swing || last >= swing.low)
    ) {
      side = 'BUY'
      neutralTone = 'caution'
    } else if (
      divergence?.type === 'bearish' &&
      rsiSellOk &&
      (!swing || last <= swing.high)
    ) {
      side = 'SELL'
      neutralTone = 'caution'
    } else if (swing && rsiBuyOk && last >= swing.low) {
      side = 'BUY'
      neutralTone = 'caution'
    } else if (swing && rsiSellOk && last <= swing.high) {
      side = 'SELL'
      neutralTone = 'caution'
    } else if (swing && last < swing.low) {
      side = 'SELL'
      neutralTone = 'caution'
    } else if (swing && last > swing.high) {
      side = 'BUY'
      neutralTone = 'caution'
    } else if (rsiBuyOk) {
      side = 'BUY'
      neutralTone = 'caution'
    } else if (rsiSellOk) {
      side = 'SELL'
      neutralTone = 'caution'
    } else if (useEma50Filter) {
      side = aboveEma50 ? 'BUY' : 'SELL'
      neutralTone = 'caution'
    } else {
      side = 'SELL'
      neutralTone = 'caution'
    }
  }

  // Break+Retest — faqat NEUTRAL
  const structureSignal =
    trend === 'NEUTRAL' ? detectStructureBreakRetest(candles, trend) : null
  if (
    trend === 'NEUTRAL' &&
    structureSignal &&
    structureSignal.retestIndex >= candles.length - 6
  ) {
    side = structureSignal.type
    neutralTone = 'strong'
  }

  // EMA pullback — grafik uchburchak + side (xulosa o'zgarmaydi)
  const emaPullback = detectEmaPullback(candles)
  if (emaPullback && emaPullback.index >= candles.length - 6) {
    if (trend === 'BULLISH' && emaPullback.type === 'BUY') {
      side = 'BUY'
    } else if (trend === 'BEARISH' && emaPullback.type === 'SELL') {
      side = 'SELL'
    } else if (trend === 'NEUTRAL') {
      if (e20 > e50 && emaPullback.type === 'BUY') {
        side = 'BUY'
        neutralTone = 'strong'
      } else if (e20 < e50 && emaPullback.type === 'SELL') {
        side = 'SELL'
        neutralTone = 'strong'
      }
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
  const pullbackRecent =
    emaPullback && emaPullback.index >= candles.length - 6 ? emaPullback : null

  let bullish: string
  let bearish: string
  let summary: string

  if (side === 'SELL') {
    bullish =
      `Narx ${fmt(invalidation)} resistance zonasini qayta test qilib, EMA50 ustiga chiqsa, ` +
      `qisqa muddatli rebound ehtimoli oshadi va SELL signal bekor bo'lishi mumkin.`
    bearish =
      `Narx EMA50 ostida qolsa va momentum salbiy bo'lsa, ` +
      `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} zonalarga pasayish ssenariysi kuchayadi.`

    if (trend === 'NEUTRAL' && structureSignal?.type === 'SELL') {
      summary =
        `${tf}: neytral trendda oxirgi minimum (${fmt(structureSignal.level)}) yorildi va qayta test qilindi — SELL. ` +
        `Kirish ${fmt(entryLow)}–${fmt(entryHigh)}. SL: ${fmt(invalidation)}.`
    } else if (trend === 'BEARISH') {
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
      `Narx EMA50 ustida va momentum ijobiy bo'lsa, ` +
      `${fmt(tp[0])} → ${fmt(tp[1])} → ${fmt(tp[2])} gacha rebound/breakout ssenariysi kuzatiladi.`
    bearish =
      `Narx EMA50 ostida qolish va momentum susayishi ` +
      `${fmt(deepSupport)} support zonasini qayta test qilish xavfini oshiradi.`

    if (trend === 'NEUTRAL' && structureSignal?.type === 'BUY') {
      summary =
        `${tf}: neytral trendda oxirgi maksimum (${fmt(structureSignal.level)}) yorildi va qayta test qilindi — BUY. ` +
        `Kirish ${fmt(entryLow)}–${fmt(entryHigh)}. SL: ${fmt(invalidation)}.`
    } else if (trend === 'BULLISH') {
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
    structureSignal,
    emaPullback: pullbackRecent,
  }
}
