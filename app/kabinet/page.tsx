'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import {
  connectWallet,
  disconnectWallet,
  hasInjectedWallet,
  hasWalletConnectConfig,
  shortAddress,
  subscribeWalletEvents,
  tryRestoreWallet,
  type ConnectResult,
} from '../../lib/wallet-client'

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

const PREMIUM_TRIBUTE_URL =
  'https://t.me/tribute/app?startapp=ep_zdhfmWSUyUDZH3LV5B9D4CnZY4fhgXeDN1G0nKe1hEUpPfGU5k9'

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
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const needPremium = searchParams.get('need') === 'premium'

  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nftBusy, setNftBusy] = useState(false)
  const [nftMsg, setNftMsg] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletMethod, setWalletMethod] = useState('')
  const sessionRef = useRef<ConnectResult | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

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

  const applyWallet = useCallback((s: ConnectResult) => {
    sessionRef.current = s
    setWalletAddress(s.address)
    setWalletMethod(s.method)
    unsubRef.current?.()
    unsubRef.current = subscribeWalletEvents(s.eip1193, {
      onAccounts: (accounts) => {
        if (!accounts?.[0]) {
          setWalletAddress('')
          setWalletMethod('')
          sessionRef.current = null
        } else {
          setWalletAddress(accounts[0])
        }
      },
      onDisconnect: () => {
        setWalletAddress('')
        setWalletMethod('')
        sessionRef.current = null
      },
    })
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/sign-in?callbackUrl=/kabinet')
      return
    }
    if (status === 'authenticated') loadMe()
  }, [status, router, loadMe])

  // NFT sahifasida ulangan walletni kabinetda ham tiklash
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const restored = await tryRestoreWallet()
      if (cancelled || !restored) return
      applyWallet(restored)
    })()
    return () => {
      cancelled = true
      unsubRef.current?.()
    }
  }, [applyWallet])

  async function handleConnect(preferred?: 'injected' | 'walletconnect') {
    setNftBusy(true)
    setNftMsg('')
    try {
      const s = await connectWallet(preferred)
      applyWallet(s)
      setNftMsg(`Wallet ulandi: ${shortAddress(s.address)}`)
    } catch (e: any) {
      setNftMsg(e?.message || 'Wallet ulashda xatolik')
    } finally {
      setNftBusy(false)
    }
  }

  async function handleDisconnect() {
    setNftBusy(true)
    try {
      await disconnectWallet(walletMethod)
    } catch {
      /* ignore */
    }
    sessionRef.current = null
    unsubRef.current?.()
    unsubRef.current = null
    setWalletAddress('')
    setWalletMethod('')
    setNftMsg('')
    setNftBusy(false)
  }

  async function activateNftLifetime() {
    let wallet = walletAddress || sessionRef.current?.address

    // Hali ulanmagan bo‘lsa — avval ulash
    if (!wallet) {
      setNftBusy(true)
      setNftMsg('')
      try {
        const preferred =
          hasInjectedWallet() ? 'injected' : hasWalletConnectConfig() ? 'walletconnect' : undefined
        const s = await connectWallet(preferred)
        applyWallet(s)
        wallet = s.address
      } catch (e: any) {
        setNftMsg(e?.message || 'Wallet ulanmadi')
        setNftBusy(false)
        return
      }
    }

    setNftBusy(true)
    setNftMsg('')
    try {
      const res = await fetch('/api/subscription/activate-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      })
      const data = await res.json()
      if (!res.ok) {
        setNftMsg(data.error || 'Xatolik')
        return
      }
      setNftMsg(data.message || 'Lifetime Premium yoqildi')
      await loadMe()
      await updateSession()
    } catch (e: any) {
      setNftMsg(e?.message || 'Wallet xatosi')
    } finally {
      setNftBusy(false)
    }
  }

  if (status === 'loading' || loading) {
    return <p style={{ color: '#848e9c', padding: 24 }}>Yuklanmoqda...</p>
  }

  if (!session?.user) return null

  const premium = me?.premium ?? false
  const isLifetime = Boolean(premium && me?.user && !me.user.subscriptionEndsAt)
  const endsAt = me?.user.subscriptionEndsAt
    ? formatDateDDMMYYYY(me.user.subscriptionEndsAt)
    : isLifetime
      ? 'Lifetime'
      : null

  const showWc = hasWalletConnectConfig() || !hasInjectedWallet()

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
          Premium sahifaga kirish uchun avval Telegram Tribute orqali to‘lang yoki NFT orqali Lifetime yoqing.
        </div>
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
              {premium ? (isLifetime ? 'Lifetime Premium' : 'Premium') : 'Bepul'}
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
          <Link
            href="/premium"
            className="planBtn"
            style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}
          >
            Premium tahlilga o‘tish
          </Link>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href={PREMIUM_TRIBUTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="planBtn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                textDecoration: 'none',
                maxWidth: 320,
              }}
            >
              Telegram Tribute orqali to‘lash
            </a>
            <p style={{ color: '#848e9c', fontSize: 12, margin: 0, lineHeight: 1.55 }}>
              To‘lovdan keyin saytdagi hisobingizda Premium yoqilishi uchun Telegram orqali sayt
              administratoriga xabar bering. Xabarda Email manzilingiz va to‘lov o‘tganligini
              tasdiqlovchi chekni yoki skrenshotni yuboring. Sayt administratori Telegram manzili:{' '}
              <a
                href="https://t.me/Goldenweb777"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f0b90b', fontWeight: 600 }}
              >
                @Goldenweb777
              </a>
            </p>
          </div>
        )}
      </section>

      <section
        style={{
          background: '#1e2329',
          border: '1px solid rgba(240,185,11,0.35)',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 16, margin: '0 0 8px', color: '#f0b90b' }}>
          GoldenWeb NFT · Lifetime Premium
        </h2>
        <p style={{ color: '#9aa7b8', fontSize: 14, marginBottom: 14, lineHeight: 1.55 }}>
          Agar siz Goldenweb NFT egasi bo‘lsangiz, shu yerda walletingizni ulab, Lifetime Premiumni
          yoqing va Premium imkoniyatlardan cheksiz foydalaning.
        </p>

        {/* Ulangan wallet holati */}
        {walletAddress ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 14,
              padding: '10px 12px',
              background: '#0d1117',
              border: '1px solid #2b3139',
              borderRadius: 10,
            }}
          >
            <span style={{ color: '#0ecb81', fontSize: 13, fontWeight: 600 }}>
              ● Ulangan
            </span>
            <span style={{ color: '#eaecef', fontSize: 13, fontFamily: 'monospace' }}>
              {shortAddress(walletAddress)}
            </span>
            {walletMethod === 'walletconnect' && (
              <span style={{ color: '#848e9c', fontSize: 12 }}>WalletConnect</span>
            )}
            <button
              type="button"
              className="nftDisconnect"
              onClick={handleDisconnect}
              disabled={nftBusy}
              style={{ marginLeft: 'auto' }}
            >
              Uzish
            </button>
          </div>
        ) : (
          <div className="nftConnectStack" style={{ maxWidth: 320, marginBottom: 14 }}>
            {hasInjectedWallet() && (
              <button
                className="planBtn"
                onClick={() => handleConnect('injected')}
                disabled={nftBusy}
              >
                {nftBusy ? 'Ulanmoqda...' : 'MetaMask / Browser wallet'}
              </button>
            )}
            {showWc && (
              <button
                className="planBtn nftWcBtn"
                onClick={() => handleConnect('walletconnect')}
                disabled={nftBusy}
              >
                {nftBusy ? 'Ulanmoqda...' : 'WalletConnect (mobil)'}
              </button>
            )}
          </div>
        )}

        {isLifetime ? (
          <div style={{ color: '#0ecb81', fontSize: 14, fontWeight: 600 }}>
            Lifetime Premium faol
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="planBtn"
              onClick={activateNftLifetime}
              disabled={nftBusy}
              style={{ maxWidth: 320 }}
            >
              {nftBusy
                ? 'Tekshirilmoqda...'
                : walletAddress
                  ? 'Lifetime Premium yoqish'
                  : 'Wallet ulab Lifetime Premium yoqish'}
            </button>
            <Link href="/nft" style={{ color: '#f0b90b', fontSize: 13 }}>
              GoldenWeb NFT olish →
            </Link>
          </div>
        )}

        {nftMsg && (
          <div
            style={{
              marginTop: 12,
              color:
                nftMsg.includes('yoqildi') ||
                nftMsg.includes('faol') ||
                nftMsg.includes('ulandi')
                  ? '#0ecb81'
                  : '#f6465d',
              fontSize: 13,
            }}
          >
            {nftMsg}
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

      <SiteFooter />
    </>
  )
}
