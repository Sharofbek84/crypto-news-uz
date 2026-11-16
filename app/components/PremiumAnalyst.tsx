'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CryptoAnalystAI from './CryptoAnalystAI'
import CleanChart from './CleanChart'

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

  const r = data?.result
  const tf = tfShort(interval)

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
      {!loading && !error && r && data?.candles && (
        <>
          <div className="homeChartPanel">
            <CleanChart candles={data.candles} result={r} coin={coin} interval={interval} />
          </div>

          <div className="homeAnalysis proAnalysis">
            <div className="proCard">
              <div className="proRow">
                <span>TREND</span>
                <strong className={r.trend === 'BULLISH' ? 'bullText' : r.trend === 'BEARISH' ? 'bearText' : ''}>
                  {r.trend}
                </strong>
              </div>
              <div className="proRow">
                <span>SIGNAL</span>
                <strong className={r.side === 'SELL' ? 'bearText' : 'bullText'}>{r.side || '-'}</strong>
              </div>
              <div className="proRow">
                <span>RSI (14)</span>
                <strong>{Number(r.rsi).toFixed(2)}</strong>
              </div>
              <p className="proNote">
                {r.rsi >= 50
                  ? "RSI 50 dan yuqorida, bu bullish momentumni ko'rsatadi."
                  : 'RSI 50 dan past, momentum susaygan.'}
              </p>
              <div className="proRow">
                <span>ASOSIY XULOSA</span>
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
                <small>
                  {r.side === 'SELL' ? 'yuqorisida' : 'pastida'} {tf} candle yopilsa
                </small>
              </div>
              <div className="proBox tp">
                <b>TAKE PROFIT (TP)</b>
                <div className="tpLine">
                  <span>TP1</span>
                  <strong>{money$(r.tp?.[0])}</strong>
                </div>
                <div className="tpLine">
                  <span>TP2</span>
                  <strong>{money$(r.tp?.[1])}</strong>
                </div>
                <div className="tpLine">
                  <span>TP3</span>
                  <strong>{money$(r.tp?.[2])}</strong>
                </div>
              </div>
            </div>

            <div className="proCard bullCard">
              <h3 className="bullText">BULLISH SENARIY · {tf}</h3>
              <p>{r.bullish}</p>
            </div>

            <div className="proCard bearCard">
              <h3 className="bearText">BEARISH SENARIY · {tf}</h3>
              <p>{r.bearish}</p>
            </div>
          </div>

          <CryptoAnalystAI coin={coin} interval={interval} analysis={r} />

          <p className="homeDisclaimer">
            Eslatma: Ushbu tahlil faqat axborot maqsadida. Investitsiya tavsiyasi emas. Savdo qilishdan oldin o'zingiz
            tahlil qiling. Kripto bozorida savdo qilish yuqori riskli faoliyat turi hisoblanadi.
          </p>
        </>
      )}
    </section>
  )
}
