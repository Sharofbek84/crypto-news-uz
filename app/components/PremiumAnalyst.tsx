'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CryptoAnalystAI from './CryptoAnalystAI'
import SignalStatsPanel from './SignalStatsPanel'

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }
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
  support: number[]
  resistance: number[]
  entryLow: number
  entryHigh: number
  invalidation: number
  tp: number[]
  bullish: string
  bearish: string
  summary: string
}

type Pivot = { i: number; price: number; rsi: number }
type DivLine = {
  kind: 'bull-div' | 'bear-div' | 'bull-hid' | 'bear-hid'
  a: Pivot
  b: Pivot
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
