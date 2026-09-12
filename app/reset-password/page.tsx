'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SiteFooter from '../components/SiteFooter'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== passwordConfirm) {
      setError('Parollar mos kelmadi.')
      return
    }
    if (!token) {
      setError('Havola noto‘g‘ri. Parolni tiklashni qayta so‘rang.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, passwordConfirm }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Xato')
        return
      }
      setMessage(data.message || 'Parol yangilandi')
      setTimeout(() => router.push('/sign-in'), 1500)
    } catch {
      setError('Tarmoq xatosi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!token && (
        <p style={{ color: '#f6465d', fontSize: 14, margin: 0 }}>
          Token topilmadi.{' '}
          <Link href="/forgot-password" style={{ color: '#f0b90b' }}>
            Qayta so‘rov
          </Link>
        </p>
      )}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#9aa7b8' }}>
        Yangi parol (kamida 6 belgi)
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#9aa7b8' }}>
        Parolni tasdiqlang
        <input
          type="password"
          required
          minLength={6}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>

      {error && <p style={{ color: '#f6465d', fontSize: 14, margin: 0 }}>{error}</p>}
      {message && <p style={{ color: '#0ecb81', fontSize: 14, margin: 0 }}>{message}</p>}

      <button type="submit" className="planBtn" disabled={loading || !token} style={{ marginTop: 8 }}>
        {loading ? 'Saqlanmoqda...' : 'Parolni yangilash'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">
            GOLDENWEB<span>.UZ</span>
          </Link>
          <Link href="/sign-in" style={{ color: '#9aa7b8', fontSize: '.9rem', fontWeight: 600 }}>
            ← Kirish
          </Link>
        </div>
      </header>

      <main
        className="container"
        style={{ maxWidth: 420, margin: '0 auto', paddingTop: 48, paddingBottom: 64 }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Yangi parol</h1>
        <p style={{ color: '#848e9c', marginBottom: 24, fontSize: 14 }}>
          Yangi parolni ikki marta kiriting.
        </p>

        <Suspense fallback={<p style={{ color: '#848e9c' }}>Yuklanmoqda...</p>}>
          <ResetForm />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#1e2329',
  border: '1px solid #2b3139',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#eaecef',
  fontSize: 15,
  outline: 'none',
}
