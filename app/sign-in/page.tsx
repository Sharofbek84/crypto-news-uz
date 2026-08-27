'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/premium'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })
    setLoading(false)
    if (res?.error) {
      setError('Email yoki parol noto‘g‘ri.')
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
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
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#9aa7b8' }}>
        Parol
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </label>

      {error && <p style={{ color: '#f6465d', fontSize: 14, margin: 0 }}>{error}</p>}

      <button type="submit" className="planBtn" disabled={loading} style={{ marginTop: 8 }}>
        {loading ? 'Kutilmoqda...' : 'Kirish'}
      </button>
    </form>
  )
}

export default function SignInPage() {
  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">GOLDENWEB<span>.UZ</span></Link>
          <Link href="/" style={{ color: '#9aa7b8', fontSize: '.9rem', fontWeight: 600 }}>← Bosh sahifa</Link>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 420, margin: '0 auto', paddingTop: 48, paddingBottom: 64 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Kirish</h1>
        <p style={{ color: '#848e9c', marginBottom: 24, fontSize: 14 }}>Email va parol bilan hisobingizga kiring.</p>

        <Suspense fallback={<p style={{ color: '#848e9c' }}>Yuklanmoqda...</p>}>
          <SignInForm />
        </Suspense>

        <p style={{ marginTop: 20, fontSize: 14, color: '#848e9c', textAlign: 'center' }}>
          Hisob yo‘qmi?{' '}
          <Link href="/sign-up" style={{ color: '#f0b90b', fontWeight: 600 }}>Ro‘yxatdan o‘tish</Link>
        </p>
      </main>

      <footer className="footer">GOLDENWEB.UZ • {new Date().getFullYear()}</footer>
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
