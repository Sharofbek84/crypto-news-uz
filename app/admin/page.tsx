'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

type AdminUser = {
  id: string
  email: string
  name: string
  plan: string
  subscriptionStatus: string
  subscriptionEndsAt: string | null
  createdAt: string
  premium: boolean
  isAdmin: boolean
}

type Stats = {
  total: number
  premium: number
  free: number
  cancelled: number
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAdmin = Boolean((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Yuklashda xato')
        return
      }
      setStats(data.stats)
      setUsers(data.users || [])
    } catch {
      setError('Tarmoq xatosi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/sign-in?callbackUrl=/admin')
      return
    }
    if (status === 'authenticated') {
      if (!isAdmin) {
        router.replace('/kabinet')
        return
      }
      load()
    }
  }, [status, isAdmin, router, load])

  return (
    <>
      <SiteHeader />

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, marginBottom: 4 }}>Administrator kabineti</h1>
            <p style={{ color: '#848e9c', fontSize: 14, margin: 0 }}>
              Foydalanuvchilar va obuna statistikasi
            </p>
          </div>
          <button
            type="button"
            className="planBtn"
            onClick={load}
            disabled={loading}
            style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
          >
            {loading ? 'Yangilanmoqda...' : 'Yangilash'}
          </button>
        </div>

        {error && <p style={{ color: '#f6465d', marginBottom: 16 }}>{error}</p>}

        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <StatCard label="Jami foydalanuvchi" value={stats.total} color="#eaecef" />
            <StatCard label="Premium" value={stats.premium} color="#f0b90b" />
            <StatCard label="Bepul" value={stats.free} color="#20d67a" />
            <StatCard label="Bekor qilgan" value={stats.cancelled} color="#848e9c" />
          </div>
        )}

        <section
          style={{
            background: '#1e2329',
            border: '1px solid #2b3139',
            borderRadius: 14,
            padding: 16,
            overflowX: 'auto',
          }}
        >
          <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Obunachilar ro‘yxati</h2>

          {loading && !users.length ? (
            <p style={{ color: '#848e9c' }}>Yuklanmoqda...</p>
          ) : users.length === 0 ? (
            <p style={{ color: '#848e9c' }}>Hali foydalanuvchi yo‘q.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#848e9c', borderBottom: '1px solid #2b3139' }}>
                  <th style={{ padding: '8px 6px' }}>Ism</th>
                  <th style={{ padding: '8px 6px' }}>Email</th>
                  <th style={{ padding: '8px 6px' }}>Tarif</th>
                  <th style={{ padding: '8px 6px' }}>Holat</th>
                  <th style={{ padding: '8px 6px' }}>Tugash</th>
                  <th style={{ padding: '8px 6px' }}>Ro‘yxat</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #2b3139' }}>
                    <td style={{ padding: '10px 6px' }}>
                      {u.name}
                      {u.isAdmin ? (
                        <span style={{ marginLeft: 6, color: '#f0b90b', fontSize: 11, fontWeight: 700 }}>
                          ADMIN
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: '10px 6px', color: '#9aa7b8' }}>{u.email}</td>
                    <td style={{ padding: '10px 6px' }}>
                      <span style={{ color: u.premium ? '#f0b90b' : '#eaecef', fontWeight: 600 }}>
                        {u.premium ? 'Premium' : 'Bepul'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 6px', color: '#9aa7b8' }}>{u.subscriptionStatus}</td>
                    <td style={{ padding: '10px 6px', color: '#9aa7b8' }}>
                      {formatDate(u.subscriptionEndsAt)}
                    </td>
                    <td style={{ padding: '10px 6px', color: '#9aa7b8' }}>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <p style={{ marginTop: 20, fontSize: 13, color: '#848e9c' }}>
          <Link href="/kabinet" style={{ color: '#9aa7b8' }}>
            ← Kabinet
          </Link>
        </p>
      </main>

      <SiteFooter />
    </>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: '#1e2329',
        border: '1px solid #2b3139',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 12, color: '#848e9c', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
