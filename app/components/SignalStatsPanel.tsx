'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

type TrackedSignal = {
  id: string
  symbol: string
  interval: string
  timeframe: string
  side: 'BUY' | 'SELL'
  entryLow: number
  entryHigh: number
  tp1: number
  tp2: number
  tp3: number
  sl: number
  signalTime: number
  createdAt: string
  status: 'open' | 'tp1' | 'tp2' | 'tp3' | 'sl' | 'expired'
  outcomeAt?: string
  outcomePrice?: number
}

type Stats = {
  total: number
  open: number
  tp1: number
  tp2: number
  tp3: number
  sl: number
  expired: number
  wins: number
  losses: number
  winRate: number | null
}

function money(n: number) {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toFixed(4)
  return n.toPrecision(4)
}

function statusLabel(status: TrackedSignal['status']) {
  if (status === 'open') return 'Ochiq'
  if (status === 'tp1') return 'TP1'
  if (status === 'tp2') return 'TP2'
  if (status === 'tp3') return 'TP3'
  if (status === 'sl') return 'SL'
  return 'Muddati o‘tgan'
}

function statusClass(status: TrackedSignal['status']) {
  if (status === 'open') return 'sigOpen'
  if (status === 'sl') return 'sigSl'
  if (status === 'expired') return 'sigExpired'
  return 'sigTp'
}

function formatWhen(ms: number) {
  try {
    return new Date(ms).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export default function SignalStatsPanel() {
  const { data: session, status } = useSession()
  const isAdmin = Boolean((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<TrackedSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!isAdmin) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const r = await fetch('/api/signal-stats/public', { cache: 'no-store' })
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Statistika yuklanmadi')
        if (cancelled) return
        setStats(j.stats || null)
        setRecent(Array.isArray(j.recent) ? j.recent : [])
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Xato')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [status, isAdmin])

  // Faqat admin ko'radi
  if (status === 'loading' || !isAdmin) {
    return null
  }

  return (
    <div className="sigStats">
      <div className="sigStatsHead">
        <div>
          <div className="homeKicker">PREMIUM SIGNALLAR STATISTIKASI</div>
          <h3>Oxirgi 20 ta signal natijasi</h3>
          <p>Telegramga yuborilgan signallarning TP / SL bo‘yicha kuzatuvi</p>
        </div>
      </div>

      {loading ? (
        <div className="sigStatsEmpty">Statistika yuklanmoqda...</div>
      ) : error ? (
        <div className="sigStatsEmpty error">{error}</div>
      ) : !stats || stats.total === 0 ? (
        <div className="sigStatsEmpty">
          Hali kuzatilgan signal yo‘q. Yangi Telegram signallaridan boshlab statistika yig‘iladi.
        </div>
      ) : (
        <>
          <div className="sigStatsGrid">
            <div className="sigStatCard">
              <span>Jami</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="sigStatCard">
              <span>Ochiq</span>
              <strong>{stats.open}</strong>
            </div>
            <div className="sigStatCard good">
              <span>TP (g‘alaba)</span>
              <strong>{stats.wins}</strong>
            </div>
            <div className="sigStatCard bad">
              <span>SL (mag‘lubiyat)</span>
              <strong>{stats.losses}</strong>
            </div>
            <div className="sigStatCard">
              <span>Win rate</span>
              <strong>{stats.winRate == null ? '—' : stats.winRate + '%'}</strong>
            </div>
            <div className="sigStatCard">
              <span>TP1 / TP2 / TP3</span>
              <strong>
                {stats.tp1} / {stats.tp2} / {stats.tp3}
              </strong>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="sigStatsEmpty">Hali jadval uchun signal yo‘q.</div>
          ) : (
            <div className="sigTableWrap">
              <table className="sigTable">
                <thead>
                  <tr>
                    <th>Vaqt</th>
                    <th>Coin</th>
                    <th>TF</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>TP1</th>
                    <th>SL</th>
                    <th>Natija</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr key={s.id}>
                      <td>{formatWhen(s.signalTime)}</td>
                      <td>
                        <b>{s.symbol}</b>
                      </td>
                      <td>{s.timeframe || s.interval}</td>
                      <td className={s.side === 'BUY' ? 'good' : 'bad'}>{s.side}</td>
                      <td>
                        {money(s.entryLow)}–{money(s.entryHigh)}
                      </td>
                      <td>{money(s.tp1)}</td>
                      <td>{money(s.sl)}</td>
                      <td>
                        <span className={'sigBadge ' + statusClass(s.status)}>{statusLabel(s.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
