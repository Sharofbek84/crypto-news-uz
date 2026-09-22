'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'LTC', 'NEAR', 'SUI', 'APT', 'ATOM', 'GRAM'] as const
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

/** CMC-style RSI color: blue (oversold) → gray → red (overbought) */
function rsiColor(rsi: number | null): string {
  if (rsi == null || !Number.isFinite(rsi)) return '#2a3038'
  const v = Math.max(0, Math.min(100, rsi))
  // 0=deep blue, 30=blue, 50=neutral dark, 70=orange, 100=red
  if (v < 30) {
    const t = v / 30
    return lerpHex('#1a4a9e', '#2d6fd4', t)
  }
  if (v < 50) {
    const t = (v - 30) / 20
    return lerpHex('#2d6fd4', '#3a424d', t)
  }
  if (v < 70) {
    const t = (v - 50) / 20
    return lerpHex('#3a424d', '#c47a12', t)
  }
  const t = (v - 70) / 30
  return lerpHex('#c47a12', '#c62828', t)
}

function lerpHex(a: string, b: string, t: number) {
  const parse = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${bl})`
}

function textOn(rsi: number | null) {
  if (rsi == null) return '#8b949e'
  return rsi >= 40 && rsi <= 60 ? '#c9d1d9' : '#ffffff'
}

function formatPrice(price: number | null) {
  if (price == null || !Number.isFinite(price)) return '—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function arrow(d: Direction) {
  if (d === 'up') return '↑'
  if (d === 'down') return '↓'
  return ''
}

export default function SpotRSIHeatmap() {
  const [payload, setPayload] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
      neutral: valid.filter((x) => x >= 30 && x < 70).length,
      overbought: valid.filter((x) => x >= 70).length,
    }
  }, [payload])

  return (
    <section className="rsiHm">
      <style>{`
        .rsiHm{
          background:#0d1117;
          border:1px solid #252d38;
          border-radius:16px;
          padding:20px;
          color:#e6edf3;
        }
        .rsiHmHead{
          display:flex;
          justify-content:space-between;
          gap:14px;
          align-items:flex-start;
          flex-wrap:wrap;
          margin-bottom:16px;
        }
        .rsiHmTitle{margin:0;font-size:1.3rem;font-weight:800}
        .rsiHmSub{margin:6px 0 0;color:#8b949e;font-size:.84rem;line-height:1.45}
        .rsiHmMeta{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .rsiHmBadge{
          border:1px solid #303846;background:#111820;border-radius:999px;
          padding:5px 10px;color:#aeb9c7;font-size:.74rem;font-weight:600
        }
        .rsiHmBtn{
          border:1px solid #303846;background:#111820;color:#d7dee7;
          border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.8rem;font-weight:600
        }
        .rsiHmBtn:hover{border-color:#f0b90b;color:#f0b90b}
        .rsiHmLegend{
          display:flex;align-items:center;gap:10px;margin-bottom:14px;
          color:#9aa7b8;font-size:.72rem;flex-wrap:wrap
        }
        .rsiHmScale{
          height:10px;width:160px;border-radius:4px;
          background:linear-gradient(90deg,#1a4a9e,#2d6fd4,#3a424d,#c47a12,#c62828);
          border:1px solid #303846
        }
        .rsiHmTableWrap{overflow-x:auto;border:1px solid #252d38;border-radius:12px}
        .rsiHmTable{
          width:100%;min-width:420px;border-collapse:collapse;
          table-layout:fixed
        }
        .rsiHmTable th,.rsiHmTable td{
          border:1px solid #1e2530;
          text-align:center;
          vertical-align:middle
        }
        .rsiHmTable thead th{
          background:#111820;
          color:#aeb9c7;
          font-size:.78rem;
          font-weight:800;
          letter-spacing:.06em;
          padding:12px 8px
        }
        .rsiHmCoin{
          background:#111820!important;
          color:#e6edf3!important;
          text-align:left!important;
          padding:10px 14px!important;
          font-weight:800;
          font-size:.88rem;
          width:22%
        }
        .rsiHmPrice{
          display:block;
          font-size:.7rem;
          font-weight:600;
          color:#8b949e;
          margin-top:2px
        }
        .rsiHmCell{
          padding:14px 8px;
          font-weight:800;
          font-size:1.05rem;
          cursor:default;
          transition:filter .12s ease
        }
        .rsiHmCell:hover{filter:brightness(1.15)}
        .rsiHmArrow{font-size:.75rem;margin-left:4px;opacity:.85}
        .rsiHmFoot{
          display:flex;justify-content:space-between;align-items:center;
          gap:12px;margin-top:14px;color:#8b949e;font-size:.76rem;flex-wrap:wrap
        }
        .rsiHmStats{display:flex;gap:8px;flex-wrap:wrap}
        .rsiHmStat{
          padding:5px 9px;border-radius:8px;background:#111820;
          border:1px solid #252d38
        }
        .rsiHmStat strong{color:#e6edf3}
        .rsiHmLoading,.rsiHmError{
          padding:48px 16px;text-align:center;color:#8b949e
        }
        .rsiHmError{
          background:rgba(194,53,53,.1);border:1px solid rgba(194,53,53,.3);
          border-radius:12px;color:#d8a1a1
        }
        @media(max-width:560px){
          .rsiHm{padding:14px}
          .rsiHmCell{padding:12px 4px;font-size:.95rem}
          .rsiHmCoin{padding:10px 10px!important;font-size:.8rem}
        }
      `}</style>

      <div className="rsiHmHead">
        <div>
          <h1 className="rsiHmTitle">Spot RSI Heatmap</h1>
          <p className="rsiHmSub">
            RSI(14) — H4 / D1 / W1. Ma&apos;lumot: Gate.io spot. Har 60 soniyada yangilanadi.
          </p>
        </div>
        <div className="rsiHmMeta">
          <span className="rsiHmBadge">Gate.io</span>
          <span className="rsiHmBadge">RSI 14</span>
          <button type="button" className="rsiHmBtn" onClick={load}>
            ↻ Yangilash
          </button>
        </div>
      </div>

      <div className="rsiHmLegend">
        <span>Oversold</span>
        <div className="rsiHmScale" aria-hidden />
        <span>Overbought</span>
        <span style={{ marginLeft: 8, opacity: 0.8 }}>&lt;30 · 30–70 · &gt;70</span>
      </div>

      {loading ? (
        <div className="rsiHmLoading">Ma&apos;lumot yuklanmoqda...</div>
      ) : error ? (
        <div className="rsiHmError">
          Ma&apos;lumot olinmadi.{' '}
          <button type="button" className="rsiHmBtn" onClick={load}>
            Qayta urinish
          </button>
        </div>
      ) : (
        <>
          <div className="rsiHmTableWrap">
            <table className="rsiHmTable">
              <thead>
                <tr>
                  <th className="rsiHmCoin">Coin</th>
                  {TIMEFRAMES.map((tf) => (
                    <th key={tf}>{tf}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COINS.map((coin) => {
                  const price =
                    payload?.data?.[coin]?.H4?.price ??
                    payload?.data?.[coin]?.D1?.price ??
                    null
                  return (
                    <tr key={coin}>
                      <td className="rsiHmCoin">
                        {coin}
                        <span className="rsiHmPrice">{formatPrice(price)}</span>
                      </td>
                      {TIMEFRAMES.map((tf) => {
                        const cell = payload?.data?.[coin]?.[tf]
                        const rsi = cell?.rsi ?? null
                        const dir = cell?.rsiDirection ?? null
                        return (
                          <td
                            key={tf}
                            className="rsiHmCell"
                            style={{
                              background: rsiColor(rsi),
                              color: textOn(rsi),
                            }}
                            title={`${coin} ${tf}: RSI ${rsi ?? 'N/A'} ${arrow(dir)}`}
                          >
                            {rsi == null ? '—' : rsi.toFixed(1)}
                            {dir && dir !== 'flat' ? (
                              <span className="rsiHmArrow">{arrow(dir)}</span>
                            ) : null}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rsiHmFoot">
            <div className="rsiHmStats">
              <span className="rsiHmStat">
                Oversold (&lt;30): <strong>{stats.oversold}</strong>
              </span>
              <span className="rsiHmStat">
                Neutral: <strong>{stats.neutral}</strong>
              </span>
              <span className="rsiHmStat">
                Overbought (≥70): <strong>{stats.overbought}</strong>
              </span>
            </div>
            <span>
              {payload?.updatedAt
                ? `Yangilandi: ${new Date(payload.updatedAt).toLocaleTimeString()}`
                : ''}
            </span>
          </div>
        </>
      )}
    </section>
  )
}
