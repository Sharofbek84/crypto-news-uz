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
  structureSignal?: any
  emaPullback?: any
  divergence?: any
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

export default function PremiumAnalyst() {
  const searchParams = useSearchParams()
  const urlSymbol = (searchParams.get('symbol') || '').toUpperCase()
  const initial = coins.includes(urlSymbol) ? urlSymbol : 'BTC'
  const [coin, setCoin] = useState(initial)
  const [interval, setInterval] = useState('1h')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (coins.includes(urlSymbol) && urlSymbol !== coin) setCoin(urlSymbol)
  }, [urlSymbol])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/analyze?symbol=' + coin + '&interval=' + interval)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Market data xatosi')
      setData(j)
    } catch (e: any) {
      setError(e.message || 'Xato')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [coin, interval])

  const r = data?.result as Result | undefined
  const tf = tfShort(interval)

  return (
    <section className="homeAnalyst">
      <div className="homeAnalystHead">
        <div>
          <div className="homeKicker">PREMIUM TAHLIL</div>
          <h2>Kengaytirilgan kripto bozor tahlili</h2>
          <p>Jonli market data asosida avtomatik BUY/SELL · Entry · TP · SL va texnik xulosa</p>
        </div>
        <div className="homeControls">
          <select value={coin} onChange={(e) => setCoin(e.target.value)}>
            {coins.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={interval} onChange={(e) => setInterval(e.target.value)}>
            {intervals.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button onClick={load}>Yangilash</button>
        </div>
      </div>

      {loading ? (
        <div className="homeLoading">Premium grafik yuklanmoqda...</div>
      ) : error ? (
        <div className="homeLoading error">{error}</div>
      ) : r ? (
        <>
          <div className="proAnalysis">
            <div className="proCard">
              <h3>TEXNIK TAHLIL · {tf}</h3>
              <div className="proRow">
                <span>TREND</span>
                <strong className={r.trend === 'BULLISH' ? 'good' : r.trend === 'BEARISH' ? 'bad' : ''}>
                  {r.trend === 'BULLISH' ? 'Bullish' : r.trend === 'BEARISH' ? 'Bearish' : 'Neytral'}
                </strong>
              </div>
              <div className="proRow">
                <span>SIGNAL</span>
                <strong className={r.side === 'SELL' ? 'bad' : 'good'}>
                  {r.signalTone === 'caution'
                    ? r.side === 'SELL'
                      ? 'Ehtiyotkor SELL'
                      : 'Ehtiyotkor BUY'
                    : r.side === 'SELL'
                      ? 'SELL'
                      : 'BUY'}
                </strong>
              </div>
              <div className="proRow">
                <span>RSI (14)</span>
                <strong>{r.rsi.toFixed(2)}</strong>
              </div>
              <p className="proSummary">{r.summary}</p>
            </div>
            <div className="proCard">
              <div className={`proBox ${r.side === 'SELL' ? 'red' : 'green'}`}>
                <b>KIRISH ZONASI ({r.side === 'SELL' ? 'SELL' : 'BUY'})</b>
                <strong>
                  {money$(r.entryLow)} – {money$(r.entryHigh)}
                </strong>
              </div>
              <div className="proBox red">
                <b>STOP LOSS (SL)</b>
                <strong>{money$(r.invalidation)}</strong>
              </div>
              <div className="proBox tp">
                <b>TAKE PROFIT (TP)</b>
                <div className="tpLine">
                  <span>TP1</span>
                  <strong>{money$(r.tp[0])}</strong>
                </div>
                <div className="tpLine">
                  <span>TP2</span>
                  <strong>{money$(r.tp[1])}</strong>
                </div>
                <div className="tpLine">
                  <span>TP3</span>
                  <strong>{money$(r.tp[2])}</strong>
                </div>
              </div>
            </div>
          </div>
          <CryptoAnalystAI analysis={r} coin={coin} interval={interval} />
        </>
      ) : null}

      <SignalStatsPanel />
    </section>
  )
}
