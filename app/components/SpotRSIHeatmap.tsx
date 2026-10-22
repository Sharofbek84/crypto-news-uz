'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const COINS = [
  'BTC',
  'ETH',
  'LTC',
  'SOL',
  'BNB',
  'NEAR',
  'GRAM',
  'SUI',
  'APT',
  'ATOM',
  'TIA',
  'CORE',
  'WCT',
  'MYX',
  'FHE',
  'GTAI',
] as const

const TIMEFRAMES = [
  { key: 'H4' as const, interval: '4h' },
  { key: 'D1' as const, interval: '1d' },
  { key: 'W1' as const, interval: '1w' },
]

type Direction = 'up' | 'down' | 'flat' | null

type Cell = {
  rsi: number | null
  price: number | null
  timestamp: number | null
  priceDirection?: Direction
  rsiDirection?: Direction
}

type ApiResponse = {
  updatedAt: number
  data: Record<string, Record<string, Cell>>
}

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }

type TradeLevels = {
  buys: number[]
  sells: number[]
  side: string | null
}

function rsiColor(rsi: number | null): string {
  if (rsi == null || !Number.isFinite(rsi)) return '#2a3038'
  const v = Math.max(0, Math.min(100, rsi))
  if (v < 20) return lerpHex('#0a4d2e', '#148f55', v / 20)
  if (v < 30) return lerpHex('#148f55', '#2ecc71', (v - 20) / 10)
  if (v < 50) return lerpHex('#2ecc71', '#3a424d', (v - 30) / 20)
  if (v < 70) return lerpHex('#3a424d', '#c47a12', (v - 50) / 20)
  return lerpHex('#c62828', '#6b0f14', (v - 70) / 30)
}

function lerpHex(a: string, b: string, t: number) {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`
}

function formatPrice(price: number | null) {
  if (price == null || !Number.isFinite(price)) return '—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return '$' + price.toPrecision(4)
}

function money(n: number) {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}

function arrow(d: Direction) {
  if (d === 'up') return '↑'
  if (d === 'down') return '↓'
  return ''
}

function rsiLabel(rsi: number | null) {
  if (rsi == null) return 'N/A'
  if (rsi < 30) return 'Oversold'
  if (rsi >= 70) return 'Overbought'
  if (rsi >= 55) return 'Bullish'
  return 'Neutral'
}

function emaSeries(candles: Candle[], period: number) {
  const out: number[] = []
  const k = 2 / (period + 1)
  let ema = candles[0]?.close ?? 0
  for (let i = 0; i < candles.length; i++) {
    ema = i === 0 ? candles[i].close : candles[i].close * k + ema * (1 - k)
    out.push(ema)
  }
  return out
}

function rsiSeries(candles: Candle[], p = 14) {
  const out: number[] = []
  let g = 0
  let l = 0
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const d = candles[i].close - candles[i - 1].close
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

function atrSeries(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const prev = candles[i - 1].close
    const tr = Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev))
    trs.push(tr)
  }
  if (!trs.length) return 0
  const n = Math.min(period, trs.length)
  let atr = trs.slice(0, n).reduce((a, b) => a + b, 0) / n
  for (let i = n; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period
  }
  return atr
}

function findSwingPoints(candles: Candle[], left = 2, right = 2) {
  const swings: { price: number; type: 'high' | 'low'; index: number }[] = []
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i]
    let isHigh = true
    let isLow = true
    for (let j = 1; j <= left; j++) {
      if (candles[i - j].high >= c.high) isHigh = false
      if (candles[i - j].low <= c.low) isLow = false
    }
    for (let j = 1; j <= right; j++) {
      if (candles[i + j].high >= c.high) isHigh = false
      if (candles[i + j].low <= c.low) isLow = false
    }
    if (isHigh) swings.push({ price: c.high, type: 'high', index: i })
    if (isLow) swings.push({ price: c.low, type: 'low', index: i })
  }
  return swings
}
