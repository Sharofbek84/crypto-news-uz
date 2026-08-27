'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'

type MeResponse = {
  user: {
    id: string
    email: string
    name: string
    plan: string
    subscriptionStatus: string
    subscriptionEndsAt: string | null
    createdAt: string
  }
  premium: boolean
}

const PRICE_TIERS = [
  { label: '$19 / oyiga', note: '1 oy' },
  { label: '$100 / 6 oyga', note: '6 oy' },
  { label: '$190 / 1 yilga', note: '12 oy' },
]

function formatDateDDMMYYYY(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function KabinetContent() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const needPremium = searchParams.get('need') === 'premium'

  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadMe = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/me')
      if (!res.ok) {
        setError('Ma’lumot yuklanmadi')
        return
      }
      const data = await res.json()
      setMe(data)
    } catch {
      setError('Tarmoq xatosi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/sign-in?callbackUrl=/kabinet')
      return
    }
    if (status === 'authenticated') loadMe()
  }, [status, router, loadMe])

  async function activate() {
    setActionLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/subscription/activate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Xato')
        return
      }
      setMessage(data.message || 'Premium faollashtirildi')
      await update()
      await loadMe()
    } catch {
      setError('So‘rov bajarilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  async function cancel() {
    if (!confirm('Premium obunani bekor qilmoqchimisiz?')) return
    setActionLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Xato')
        return
      }
      setMessage(data.message || 'Obuna bekor qilindi')
      await update()
      await loadMe()
    } catch {
      setError('So‘rov bajarilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <p style={{ color: '#848e9c', padding: 24 }}>Yuklanmoqda...</p>
  }

  if (!session?.user) return null

  const premium = me?.premium ?? false
  const endsAt = me?.user.subscriptionEndsAt
    ? formatDateDDMMYYYY(me.user.subscriptionEndsAt)
    : null

  return (
    <main className="container" style={{ paddingTop: 28, paddingBottom: 48, maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Shaxsiy kabinet</h1>
      <p style={{ color: '#848e9c', marginBottom: 24, fontSize: 14 }}>
        Hisob va Premium obunani shu yerdan boshqarasiz.
      </p>

      {needPremium && !premium && (
        <div
          style={{
            background: 'rgba(240,185,11,0.12)',
            border: '1px solid rgba(240,185,11,0.35)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#f0b90b',
            fontSize: 14,
          }}
        >
          Premium sahifaga kirish uchun avval obunani faollashtiring.
        </div>
      )}

      {message && (
        <div style={{ color: '#0ecb81', marginBottom: 16, fontSize: 14 }}>{message}</div>
      )}
      {error && <div style={{ color: '#f6465d', marginBottom: 16, fontSize: 14 }}>{error}</div>}

      <section
        style={{
          background: '#1e2329',
          border: '1px solid #2b3139',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 16, margin: '0 0 12px', color: '#eaecef' }}>Profil</h2>
        <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
          <div>
            <span style={{ color: '#848e9c' }}>Ism: </span>
            {me?.user.name || session.user.name}
          </div>
          <div>
            <span style={{ color: '#848e9c' }}>Email: </span>
            {me?.user.email || session.user.email}
          </div>
          <div>
            <span style={{ color: '#848e9c' }}>Tarif: </span>
            <strong style={{ color: premium ? '#f0b90b' : '#eaecef' }}>
              {premium ? 'Premium' : 'Bepul'}
            </strong>
          </div>
          {endsAt && (
            <div>
              <span style={{ color: '#848e9c' }}>Obuna tugashi: </span>
              {endsAt}
            </div>
          )}
        </div>
      </section>

      <section
        style={{
          background: '#1e2329',
          border: '1px solid #2b3139',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 16, margin: '0 0 12px', color: '#eaecef' }}>Premium obuna</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 18,
          }}
        >
          {PRICE_TIERS.map((tier) => (
            <div
              key={tier.label}
              style={{
                background: '#0d1117',
                border: '1px solid #2b3139',
                borderRadius: 10,
                padding: '12px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f0b90b' }}>{tier.label}</div>
              <div style={{ fontSize: 12, color: '#848e9c', marginTop: 4 }}>{tier.note}</div>
            </div>
          ))}
        </div>

        <ul style={{ color: '#9aa7b8', fontSize: 14, marginBottom: 20, paddingLeft: 18 }}>
          <li>Kengaytirilgan AI tahlili</li>
          <li>AI yordamchi</li>
          <li>Telegram signal kanali</li>
          <li>Haftalik chuqur tahlil</li>
          <li>VIP qo‘llab-quvvatlash</li>
        </ul>

        {premium ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link
              href="/premium"
              className="planBtn"
              style={{ textDecoration: 'none', textAlign: 'center' }}
            >
              Premium tahlilga o‘tish
            </Link>
            <button
              type="button"
              className="planBtn muted"
              disabled={actionLoading}
              onClick={cancel}
              style={{ cursor: 'pointer' }}
            >
              {actionLoading ? '...' : 'Obunani bekor qilish'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="planBtn"
              disabled={actionLoading}
              onClick={activate}
              style={{ cursor: 'pointer', maxWidth: 300 }}
            >
              {actionLoading ? 'Faollashtirilmoqda...' : 'Premium ni faollashtirish (demo 30 kun)'}
            </button>
            <p style={{ color: '#848e9c', fontSize: 12, margin: 0 }}>
              Hozircha demo rejim. To‘lov (Payme / Click yoki boshqa) keyin ulanadi.
            </p>
          </div>
        )}
      </section>

      <p style={{ fontSize: 13, color: '#848e9c' }}>
        <Link href="/" style={{ color: '#9aa7b8' }}>
          ← Bosh sahifa
        </Link>
      </p>
    </main>
  )
}

export default function KabinetPage() {
  return (
    <>
      <SiteHeader />

      <Suspense fallback={<p style={{ color: '#848e9c', padding: 24 }}>Yuklanmoqda...</p>}>
        <KabinetContent />
      </Suspense>

      <footer className="footer">
        GOLDENWEB.UZ • Shaxsiy kabinet • {new Date().getFullYear()}
      </footer>
    </>
  )
}
