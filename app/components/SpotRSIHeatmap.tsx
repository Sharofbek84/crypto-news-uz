'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const COINS = ['BTC', 'ETH', 'LTC', 'SOL', 'BNB', 'NEAR', 'GRAM', 'SUI', 'APT', 'ATOM'] as const
const TIMEFRAMES = ['H4', 'D1', 'W1'] as const

type Direction = 'up' | 'down' | 'flat' | null

type Cell = {
  rsi: number | null
  price: number | null
  timestamp: number | null
  priceDirection?: Direction
  rsiDirection?: Direction
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
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function arrow(direction: Direction) {
  if (direction === 'up') return '↑'
  if (direction === 'down') return '↓'
  if (direction === 'flat') return '→'
  return '•'
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
        .gwLegend span { display:inline-flex; align-items:center; gap:5px; padding:4px 7px; border:1px solid #252d38; border-radius:6px; background:#10161d; }
        .gwDot { width:8px; height:8px; border-radius:2px; display:inline-block; }
        .gwGridWrap { overflow-x:auto; border:1px solid #252d38; border-radius:14px; }
        .gwGrid { min-width:760px; }
        .gwRow { display:grid; grid-template-columns:280px repeat(3, minmax(150px,1fr)); }
        .gwHead { background:#111820; color:#8b949e; font-size:.74rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
        .gwCell { min-height:82px; border-right:1px solid rgba(255,255,255,.055); border-bottom:1px solid rgba(255,255,255,.055); display:flex; align-items:center; justify-content:center; }
        .gwRow > :last-child { border-right:0; }
        .gwRow:last-child > .gwCell { border-bottom:0; }
        .gwCoin { justify-content:flex-start; padding:8px 14px; font-weight:800; background:#0d1117; }
        .gwCoinInfo { display:flex; align-items:center; gap:10px; width:100%; }
        .gwCoinIcon { width:32px; height:32px; border-radius:50%; background:#1a2430; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:800; color:#f0b90b; flex-shrink:0; border:1px solid #202938; }
        .gwCoinMain { min-width:0; }
        .gwCoinSymbol { display:block; font-size:.9rem; line-height:1.05; font-weight:800; }
        .gwCoinName { display:block; margin-top:3px; color:#8b949e; font-size:.7rem; font-weight:500; }
        .gwCoinPrice { margin-left:auto; text-align:right; white-space:nowrap; }
        .gwCoinPriceValue { display:block; font-size:.82rem; font-weight:700; color:#e6edf3; }
        .gwCoinPriceDir { display:block; margin-top:1px; font-size:.78rem; font-weight:800; }
        .gwCoin small { display:block; margin-top:3px; color:#718096; font-size:.67rem; font-weight:500; }
        .gwRsiCell { cursor:pointer; transition:transform .12s ease, filter .12s ease; position:relative; }
        .gwRsiCell:hover { filter:brightness(1.12); transform:scale(.985); z-index:1; }
        .gwRsi { font-size:1.35rem; font-weight:850; }
        .gwRsiDirection { margin-top:4px; font-size:.86rem; font-weight:900; }
        .gwState { display:block; font-size:.63rem; margin-top:4px; opacity:.78; }
        .extreme-low { background:linear-gradient(135deg,#6f42a1,#4d2c77); }
        .low { background:linear-gradient(135deg,#2463a8,#184a82); }
        .low-mid { background:linear-gradient(135deg,#197a61,#135b49); }
        .neutral { background:linear-gradient(135deg,#4b535e,#373e47); }
        .high-mid { background:linear-gradient(135deg,#a98220,#806619); }
        .high { background:linear-gradient(135deg,#b45f1c,#874314); }
        .extreme-high { background:linear-gradient(135deg,#b93d3d,#812929); }
        .unknown { background:#252b33; color:#aeb7c3; }
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
          .gwRow { grid-template-columns:210px repeat(3, 115px); }
          .gwCoin { padding:8px 10px; }
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
              {TIMEFRAMES.map((tf) => (
                <div className="gwTfColumn" key={tf}>
                  <div className="gwTfHeader">{tf}</div>
                  <div className="gwTiles">
                    {COINS.map((coin) => {
                      const cell = payload?.data?.[coin]?.[tf]
                      const rsiDirection = cell?.rsiDirection ?? null
                      return (
                        <button
                          key={coin}
                          type="button"
                          className={\`gwTile \${tone(cell?.rsi ?? null)}\`}
                          onClick={() => setSelected({ coin, tf })}
                          title={\`\${coin} \${tf} RSI: \${cell?.rsi == null ? 'N/A' : cell.rsi.toFixed(1)} \${arrow(rsiDirection)} • Narx: \${formatPrice(cell?.price ?? null)}\`}
                        >
                          <div className="gwTileTop">
                            <span className="gwTileCoin">{coin}</span>
                            <span className="gwTilePrice">{formatPrice(cell?.price ?? null)}</span>
                          </div>
                          <div className="gwTileMiddle">
                            <span className="gwRsi">{cell?.rsi == null ? '—' : cell.rsi.toFixed(1)}</span>
                            <span className={\`gwRsiDirection \${rsiDirection === 'up' ? 'gwUp' : rsiDirection === 'down' ? 'gwDown' : 'gwFlat'}\`}>{arrow(rsiDirection)}</span>
                          </div>
                          <div className="gwTileBottom">
                            <span className="gwState">{label(cell?.rsi ?? null)}</span>
                            <span className="gwPeriod">RSI(14)</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
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
