'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CryptoAnalystAI from './CryptoAnalystAI'
import SignalStatsPanel from './SignalStatsPanel'

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }
type Divergence = {
  type: 'bullish' | 'bearish'
  i1: number
  i2: number
  price1: number
  price2: number
  rsi1: number
  rsi2: number
}
type Result = {
  ema10: number
  ema20: number
  ema50: number
  rsi: number
  macd: number
  signal: number
  histogram: number
  trend: string
  side?: string
  signalTone?: 'strong' | 'caution' | null
  support: number[]
  resistance: number[]
  entryLow: number
  entryHigh: number
  invalidation: number
  tp: number[]
  bullish: string
  bearish: string
  summary: string
  divergence?: Divergence | null
}

const coins = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM', 'XAUT', 'XRP', 'XLM', 'BCH', 'LINK', 'AVAX']
const intervals = [
  ['1h', 'H1'],
  ['4h', 'H4'],
  ['1d', 'D1'],
  ['1w', 'W1'],
] as const

function money(n: number) {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}
function money$(n: number) {
  return '$' + money(n)
}
function tfShort(i: string) {
  return ({ '1h': 'H1', '4h': 'H4', '1d': 'D1', '1w': 'W1' } as any)[i] || i
}
function tfLong(i: string) {
  if (i === '1w') return '1 haftalik (W1)'
  if (i === '1d') return '1 kunlik (D1)'
  if (i === '4h') return '4 soatlik (H4)'
  return '1 soatlik (H1)'
}
function rsiSeries(c: Candle[], p = 14) {
  const out: number[] = []
  let g = 0
  let l = 0
  for (let i = 0; i < c.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const d = c[i].close - c[i - 1].close
    const gg = Math.max(d, 0)
    const ll = Math.max(-d, 0)
    if (i <= p) {
      g += gg
      l += ll
      out.push(i === p ? (l === 0 ? 100 : 100 - 100 / (1 + g / l)) : 50)
    } else {
      g = (g * (p - 1) + gg) / p
      l = (l * (p - 1) + ll) / p
      out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l))
    }
  }
  return out
}
function emaSeries(c: Candle[], p: number) {
  let a = c[0]?.close || 0
  const k = 2 / (p + 1)
  return c.map((x, i) => {
    if (i) a = x.close * k + a * (1 - k)
    return a
  })
}
