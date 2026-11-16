'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CryptoAnalystAI from './CryptoAnalystAI'

const coins = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM', 'XAUT', 'XRP', 'XLM', 'BCH', 'LINK', 'AVAX']
const intervals = [
  ['1h', 'H1'],
  ['4h', 'H4'],
  ['1d', 'D1'],
  ['1w', 'W1'],
] as const

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

  const r = data?.result

  return (
    <section className="homeAnalyst">
      <div className="homeAnalystHead">
        <div>
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

      {loading && <div className="homeLoading">Ma'lumot yuklanmoqda…</div>}
      {error && <div className="homeLoading error">{error}</div>}
      {!loading && !error && r && (
        <>
          <div className="homeChartPanel" style={{ padding: 24, color: '#9aa7b8' }}>
            <p><strong style={{ color: '#f0b90b' }}>{coin}/USDT · {interval}</strong></p>
            <p style={{ marginTop: 8 }}>Signal: <strong className={r.side === 'SELL' ? 'bearText' : 'bullText'}>{r.side || '-'}</strong></p>
            <p>Trend: {r.trend} · RSI: {Number(r.rsi).toFixed(2)}</p>
            <p style={{ marginTop: 12, fontSize: 13 }}>To‘liq grafik va «Eng yangi signallar» ro‘yxati keyingi yangilanishda qayta tiklanadi.</p>
          </div>
          <CryptoAnalystAI coin={coin} interval={interval} analysis={r} />
          <p className="homeDisclaimer">
            Eslatma: Ushbu tahlil faqat axborot maqsadida. Investitsiya tavsiyasi emas.
          </p>
        </>
      )}
    </section>
  )
}
