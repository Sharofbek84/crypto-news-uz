'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type RecentSignal = {
  side: 'BUY' | 'SELL'
  symbol: string
  timeframe: 'H1' | 'H4' | 'D1'
  entryLow: number
  entryHigh: number
  tp: number[]
  sl: number
  trend?: string | null
  rsi?: number | null
  createdAt: string
}

function money(n: number) {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}

function timeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'hozir'
    if (m < 60) return `${m} daqiqa oldin`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} soat oldin`
    const d = Math.floor(h / 24)
    return `${d} kun oldin`
  } catch {
    return '—'
  }
}

export default function TelegramPremiumButton() {
  const [signals, setSignals] = useState<RecentSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/signals/recent', { cache: 'no-store' })
        const j = await r.json()
        if (!cancelled && Array.isArray(j?.signals)) {
          setSignals(j.signals.slice(0, 10))
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section
      aria-labelledby="telegram-premium-title"
      style={{
        position: 'relative',
        overflow: 'hidden',
        margin: '30px 0 12px',
        padding: '26px 24px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, #111a25 0%, #0c121b 55%, #111923 100%)',
        border: '1px solid rgba(240,185,11,.32)',
        boxShadow: '0 14px 38px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.025)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          right: -70,
          top: -100,
          background: 'rgba(240,185,11,.07)',
        }}
      />

      {/* Header row */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: signals.length || loading ? 20 : 0,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 50,
            height: 50,
            flex: '0 0 50px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(240,185,11,.1)',
            border: '1px solid rgba(240,185,11,.28)',
            fontSize: 24,
          }}
        >
          📡
        </div>

        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div
            style={{
              color: '#f0b90b',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.4,
              marginBottom: 5,
            }}
          >
            PREMIUM SIGNALLAR
          </div>
          <h2
            id="telegram-premium-title"
            style={{ color: '#f3f6f9', fontSize: 18, lineHeight: 1.3, margin: '0 0 7px' }}
          >
            Yangi signallarni o‘z vaqtida qabul qiling
          </h2>
          <p style={{ color: '#aeb9c6', fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: 680 }}>
            Endi siz PREMIUM foydalanuvchi sifatida telegram kanalimiz orqali yangi signallarni o‘z
            vaqtida qabul qilib olishingiz mumkin.
          </p>
        </div>

        <a
          href="https://t.me/+Q8d8pPnjKwMxZjUy"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            minHeight: 44,
            padding: '10px 18px',
            borderRadius: 10,
            background: '#229ED9',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: 13,
            textDecoration: 'none',
            boxShadow: '0 8px 22px rgba(34,158,217,.24)',
            whiteSpace: 'nowrap',
          }}
        >
          <img
            src="https://telegram.org/img/t_logo.svg"
            alt="Telegram"
            width="23"
            height="23"
            style={{ display: 'block', width: 23, height: 23 }}
          />
          KANALGA OBUNA BO‘LING
        </a>
      </div>

      {/* Recent signals table — after text */}
      {(loading || signals.length > 0) && (
        <div style={{ position: 'relative', marginTop: 4 }}>
          <div
            style={{
              color: '#8492a2',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            Oxirgi signallar
          </div>

          {loading && signals.length === 0 ? (
            <div style={{ color: '#788594', fontSize: 13, padding: '12px 0' }}>
              Yuklanmoqda…
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 12 }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  minWidth: 520,
                }}
              >
                <thead>
                  <tr
                    style={{
                      color: '#8492a2',
                      fontSize: 11,
                      fontWeight: 700,
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255,255,255,.06)',
                    }}
                  >
                    <th style={{ padding: '8px 10px 8px 0' }}>SIDE</th>
                    <th style={{ padding: '8px 10px' }}>COIN</th>
                    <th style={{ padding: '8px 10px' }}>TF</th>
                    <th style={{ padding: '8px 10px' }}>ENTRY</th>
                    <th style={{ padding: '8px 10px' }}>SL</th>
                    <th style={{ padding: '8px 0 8px 10px' }}>VAQT</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s, i) => {
                    const isBuy = s.side === 'BUY'
                    return (
                      <tr
                        key={`${s.symbol}-${s.timeframe}-${s.createdAt}-${i}`}
                        style={{
                          borderBottom:
                            i < signals.length - 1
                              ? '1px solid rgba(255,255,255,.04)'
                              : 'none',
                        }}
                      >
                        <td style={{ padding: '9px 10px 9px 0' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              color: isBuy ? '#20d67a' : '#ff5360',
                              background: isBuy
                                ? 'rgba(32,214,122,.12)'
                                : 'rgba(255,83,96,.12)',
                              border: `1px solid ${isBuy ? 'rgba(32,214,122,.28)' : 'rgba(255,83,96,.28)'}`,
                            }}
                          >
                            {s.side}
                          </span>
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          <Link
                            href={`/premium?symbol=${s.symbol}`}
                            style={{
                              color: '#f0b90b',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            {s.symbol}
                          </Link>
                        </td>
                        <td style={{ padding: '9px 10px', color: '#c5d0dc', fontWeight: 600 }}>
                          {s.timeframe}
                        </td>
                        <td style={{ padding: '9px 10px', color: '#e6edf3', whiteSpace: 'nowrap' }}>
                          ${money(s.entryLow)} – ${money(s.entryHigh)}
                        </td>
                        <td style={{ padding: '9px 10px', color: '#ff5360', whiteSpace: 'nowrap' }}>
                          ${money(s.sl)}
                        </td>
                        <td
                          style={{
                            padding: '9px 0 9px 10px',
                            color: '#8492a2',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                          }}
                        >
                          {timeAgo(s.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
