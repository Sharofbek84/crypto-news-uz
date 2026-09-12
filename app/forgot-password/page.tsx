'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import SiteFooter from '../components/SiteFooter'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Xato yuz berdi')
        return
      }
      setMessage(data.message || 'Email yuborildi.')
    } catch {
      setError('Tarmoq xatosi')
    } finally {
      setLoading(false)
    }
  }

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
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Parolni tiklash</h1>
        <p style={{ color: '#848e9c', marginBottom: 24, fontSize: 14 }}>
          Ro‘yxatdan o‘tgan emailingizni yozing. Tiklash havolasi shu manzilga yuboriladi.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#9aa7b8' }}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="email@example.com"
              autoComplete="email"
            />
          </label>

          {error && <p style={{ color: '#f6465d', fontSize: 14, margin: 0 }}>{error}</p>}
          {message && <p style={{ color: '#0ecb81', fontSize: 14, margin: 0 }}>{message}</p>}

          <button type="submit" className="planBtn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Yuborilmoqda...' : 'Havola yuborish'}
          </button>
        </form>
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
