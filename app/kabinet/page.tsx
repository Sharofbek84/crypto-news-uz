'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import HeaderAuth from '../components/HeaderAuth'

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

function KabinetContent() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const needPremium = searchParams.get('need') === 'premium'
  const checkoutStatus = searchParams.get('checkout')

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
    if (status === 'authenticated') {
      loadMe().then(() => update())
    }
  }, [status, router, loadMe, update])

  useEffect(() => {
    if (checkoutStatus === 'success') {
      setMessage('To‘lov qabul qilindi. Obuna holati bir necha soniyada yangilanadi.')
      const t = setTimeout(() => {
        loadMe()
        update()
      }, 2000)
      return () => clearTimeout(t)
    }
    if (checkoutStatus === 'cancel') {
      setMessage('To‘lov bekor qilindi.')
    }
  }, [checkoutStatus, loadMe, update])

  async function startCheckout() {
    setActionLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Checkout xatosi')
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError('Checkout URL topilmadi')
    } catch {
      setError('So‘rov bajarilmadi')
    } finally {
      setActionLoading(false)
    }
  }

  async function openPortal() {
    setActionLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Portal xatosi')
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError('Portal URL topilmadi')
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
    ? new Date(me.user.subscriptionEndsAt).toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
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
          Premium sahifaga kirish uchun avval Stripe orqali obuna bo‘ling.
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
              <span style={{ color: '#848e9c' }}>Keyingi to‘lov / tugash: </span>
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
        <h2 style={{ fontSize: 16, margin: '0 0 8px', color: '#eaecef' }}>Premium obuna</h2>
        <p style={{ color: '#848e9c', fontSize: 13, marginBottom: 16 }}>
          $19 / oy — kengaytirilgan AI tahlil, AI yordamchi, Telegram signal, haftalik tahlil, VIP
          qo‘llab-quvvatlash.
        </p>

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
              onClick={openPortal}
              style={{ cursor: 'pointer' }}
            >
              {actionLoading ? '...' : 'Obunani boshqarish (Stripe)'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="planBtn"
              disabled={actionLoading}
              onClick={startCheckout}
              style={{ cursor: 'pointer', maxWidth: 320 }}
            >
              {actionLoading ? 'Stripe ochilmoqda...' : 'Premium ga obuna bo‘lish — $19/oy'}
            </button>
            <p style={{ color: '#848e9c', fontSize: 12, margin: 0 }}>
              Xavfsiz to‘lov Stripe orqali. Karta ma’lumotlari saytimizda saqlanmaydi.
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
      <header className="header">
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Link href="/" className="logo" style={{ textDecoration: 'none' }}>
            GOLDENWEB<span>.UZ</span>
          </Link>
          <HeaderAuth />
        </div>
      </header>

      <Suspense fallback={<p style={{ color: '#848e9c', padding: 24 }}>Yuklanmoqda...</p>}>
        <KabinetContent />
      </Suspense>

      <footer className="footer">
        GOLDENWEB.UZ • Shaxsiy kabinet • {new Date().getFullYear()}
      </footer>
    </>
  )
}
