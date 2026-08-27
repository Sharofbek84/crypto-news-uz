'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'

export default function HeaderAuth() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ color: '#848e9c', fontSize: 14 }}>...</span></nav>
  }

  if (session?.user) {
    return (
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/premium" style={{ color: '#f0b90b', fontSize: 14, fontWeight: 700 }}>
          Premium
        </Link>
        <Link href="/obuna" className="headerCta">Obuna</Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{
            background: 'transparent',
            border: '1px solid #2b3139',
            color: '#eaecef',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Chiqish
        </button>
      </nav>
    )
  }

  return (
    <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Link
        href="/sign-in"
        style={{
          background: 'transparent',
          border: '1px solid #2b3139',
          color: '#eaecef',
          padding: '6px 14px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Kirish
      </Link>
      <Link href="/sign-up" className="headerCta">Ro‘yxatdan o‘tish</Link>
    </nav>
  )
}
