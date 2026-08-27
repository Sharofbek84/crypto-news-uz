'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'

export default function HeaderAuth() {
  return (
    <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            style={{
              background: 'transparent',
              border: '1px solid #2b3139',
              color: '#eaecef',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Kirish
          </button>
        </SignInButton>
        <Link href="/sign-up" className="headerCta">Ro‘yxatdan o‘tish</Link>
      </SignedOut>
      <SignedIn>
        <Link href="/premium" style={{ color: '#f0b90b', fontSize: 14, fontWeight: 700 }}>
          Premium
        </Link>
        <Link href="/obuna" className="headerCta">Obuna</Link>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </nav>
  )
}
