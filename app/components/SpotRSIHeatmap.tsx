'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const COINS = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM'] as const
const TIMEFRAMES = ['H4', 'D1', 'W1'] as const

type Cell = {
  rsi: number | null
  price: number | null
  timestamp: number | null
}

type ApiResponse = {
  source: string
  period: number
  updatedAt: number
  data: Record<string, Record<string, Cell>>
}

function tone(rsi: number | null) {
  if (rsi == null) return 'unknown'
  if (rsi < 20) return 'extreme-low'
  if (rsi < 30) return 'low'
  if (rsi < 45) return 'low-mid'
  if (rsi < 55) return 'neutral'
  if (rsi < 70) return 'high-mid'
  if (rsi < 80) return 'high'
  return 'extreme-high'
}

function label(rsi: number | null) {
  if (rsi == null) return 'N/A'
  if (rsi < 30) return 'Oversold'
  if (rsi >= 70) return 'Overbought'
  if (rsi >= 55) return 'Bullish'
  return 'Neutral'
}

function formatPrice(price: number | null) {
  if (price == null || !Number.isFinite(price)) return '—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toFixed(2)
  return '$' + price.toFixed(4)
}

export default function SpotRSIHeatmap() {
  const [payload, setPayload] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<{ coin: string; tf: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setError(false)
      const res = await fetch('/api/spot-heatmap', { cache: 'no-store' })
      if (!res.ok) throw new Error('Heatmap API error')
      setPayload(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const stats = useMemo(() => {
    const cells = COINS.flatMap((coin) => TIMEFRAMES.map((tf) => payload?.data?.[coin]?.[tf]?.rsi ?? null))
    const valid = cells.filter((x): x is number => x != null)
    return {
      oversold: valid.filter((x) => x < 30).length,
      bullish: valid.filter((x) => x >= 55 && x < 70).length,
      overbought: valid.filter((x) => x >= 70).length,
    }
  }, [payload])

  return (
    <section className="gwHeatmap">
      <style>{`
        .gwHeatmap { background:#0d1117; border:1px solid #252d38; border-radius:18px; padding:20px; color:#e6edf3; box-shadow:0 10px 30px rgba(0,0,0,.18); }
        .gwHeatHeader { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:18px; }
        .gwHeatTitle { margin:0; font-size:1.35rem; font-weight:800; letter-spacing:.01em; }
        .gwHeatSub { margin:5px 0 0; color:#8b949e; font-size:.84rem; }
        .gwHeatMeta { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .gwBadge { border:1px solid #303846; background:#111820; border-radius:999px; padding:6px 9px; color:#aeb9c7; font-size:.74rem; }
        .gwLegend { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; color:#9aa7b8; font-size:.72rem; }
        .gwLegend span { display:inline-flex; align-items:center; gap:5px; }
        .gwDot { width:9px; height:9px; border-radius:50%; display:inline-block; }
        .gwGridWrap { overflow-x:auto; border:1px solid #252d38; border-radius:14px; }
        .gwGrid { min-width:650px; }
        .gwRow { display:grid; grid-template-columns:120px repeat(3, minmax(120px,1fr)); }
        .gwHead { background:#111820; color:#8b949e; font-size:.74rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
        .gwCell { min-height:76px; border-right:1px solid rgba(255,255,255,.055); border-bottom:1px solid rgba(255,255,255,.055); display:flex; align-items:center; justify-content:center; }
        .gwRow > :last-child { border-right:0; }
        .gwRow:last-child > .gwCell { border-bottom:0; }
        .gwCoin { justify-content:flex-start; padding:0 14px; font-weight:800; }
        .gwCoin small { display:block; margin-top:3px; color:#718096; font-size:.67rem; font-weight:500; }
        .gwRsiCell { cursor:pointer; transition:transform .12s ease, filter .12s ease; position:relative; }
        .gwRsiCell:hover { filter:brightness(1.12); transform:scale(.985); z-index:1; }
        .gwRsi { font-size:1.08rem; font-weight:850; }
        .gwState { display:block; font-size:.63rem; margin-top:4px; opacity:.78; }
        .extreme-low { background:rgba(112,72,190,.50); }
        .low { background:rgba(48,104,184,.48); }
        .low-mid { background:rgba(39,138,101,.42); }
        .neutral { background:rgba(125,133,144,.25); }
        .high-mid { background:rgba(190,155,38,.43); }
        .high { background:rgba(211,112,30,.48); }
        .extreme-high { background:rgba(194,53,53,.55); }
        .unknown { background:rgba(80,88,100,.18); color:#718096; }
        .gwBottom { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:14px; color:#8b949e; font-size:.76rem; }
        .gwStats { display:flex; gap:10px; flex-wrap:wrap; }
        .gwStat { padding:6px 9px; border-radius:8px; background:#111820; border:1px solid #252d38; }
        .gwDetail { margin-top:14px; border:1px solid #303846; background:#10161d; border-radius:12px; padding:13px 14px; }
        .gwDetail strong { color:#f0b90b; }
        .gwLoading { padding:70px 20px; text-align:center; color:#8b949e; }
        .gwError { padding:22px; border-radius:12px; background:rgba(194,53,53,.10); border:1px solid rgba(194,53,53,.3); color:#d8a1a1; }
        .gwRefresh { border:1px solid #303846; background:#111820; color:#d7dee7; border-radius:8px; padding:7px 10px; cursor:pointer; }
        @media (max-width:700px) {
          .gwHeatmap { padding:14px; border-radius:14px; }
          .gwHeatHeader { display:block; }
          .gwHeatMeta { justify-content:flex-start; margin-top:10px; }
          .gwRow { grid-template-columns:92px repeat(3, 115px); }
          .gwCoin { padding:0 10px; }
        }
      `}</style>

      <div className="gwHeatHeader">
        <div>
          <h2 className="gwHeatTitle">GOLDENWEB Spot RSI Heatmap</h2>
          <p className="gwHeatSub">Top 10 spot coin • RSI(14) • Gate.io market data • H4 / D1 / W1</p>
        </div>
        <div className="gwHeatMeta">
          <span className="gwBadge">Gate.io Spot</span>
          <span className="gwBadge">RSI 14</span>
          <button className="gwRefresh" onClick={load}>↻ Yangilash</button>
        </div>
      </div>

      <div className="gwLegend">
        <span><i className="gwDot extreme-low" /> &lt;20</span>
        <span><i className="gwDot low" /> 20–30</span>
        <span><i className="gwDot low-mid" /> 30–45</span>
        <span><i className="gwDot neutral" /> 45–55</span>
        <span><i className="gwDot high-mid" /> 55–70</span>
        <span><i className="gwDot high" /> 70–80</span>
        <span><i className="gwDot extreme-high" /> 80+</span>
      </div>

      {loading ? <div className="gwLoading">Gate.io ma'lumotlari yuklanmoqda...</div> : error ? (
        <div className="gwError">Gate.io ma'lumotlarini olishda xatolik yuz berdi. <button className="gwRefresh" onClick={load}>Qayta urinish</button></div>
      ) : (
        <>
          <div className="gwGridWrap">
            <div className="gwGrid">
              <div className="gwRow gwHead">
                <div className="gwCell gwCoin">COIN</div>
                {TIMEFRAMES.map((tf) => <div key={tf} className="gwCell">{tf}</div>)}
              </div>

              {COINS.map((coin) => (
                <div className="gwRow" key={coin}>
                  <div className="gwCell gwCoin">
                    <div>{coin}<small>/{coin === 'GRAM' ? 'USDT' : 'USDT'}</small></div>
                  </div>
                  {TIMEFRAMES.map((tf) => {
                    const cell = payload?.data?.[coin]?.[tf]
                    return (
                      <button
                        key={tf}
                        type="button"
                        className={`gwCell gwRsiCell ${tone(cell?.rsi ?? null)}`}
                        onClick={() => setSelected({ coin, tf })}
                        title={`${coin} ${tf} RSI: ${cell?.rsi ?? 'N/A'}`}
                      >
                        <div>
                          <div className="gwRsi">{cell?.rsi == null ? '—' : cell.rsi.toFixed(1)}</div>
                          <span className="gwState">{label(cell?.rsi ?? null)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="gwBottom">
            <div className="gwStats">
              <span className="gwStat">Oversold: <strong>{stats.oversold}</strong></span>
              <span className="gwStat">Bullish: <strong>{stats.bullish}</strong></span>
              <span className="gwStat">Overbought: <strong>{stats.overbought}</strong></span>
            </div>
            <span>{payload?.updatedAt ? `Yangilandi: ${new Date(payload.updatedAt).toLocaleTimeString()}` : ''}</span>
          </div>

          {selected && (
            <div className="gwDetail">
              <strong>{selected.coin} / {selected.tf}</strong> — RSI(14): {payload?.data?.[selected.coin]?.[selected.tf]?.rsi ?? 'N/A'} • Narx: {formatPrice(payload?.data?.[selected.coin]?.[selected.tf]?.price ?? null)}
            </div>
          )}
        </>
      )}
    </section>
  )
}
