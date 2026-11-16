'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type Status = 'loading' | 'unsupported' | 'denied' | 'off' | 'on' | 'error'

export default function PushEnableButton() {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function check() {
      if (typeof window === 'undefined') return
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setStatus('unsupported')
        return
      }
      if (Notification.permission === 'denied') {
        setStatus('denied')
        return
      }
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setStatus(sub ? 'on' : 'off')
      } catch {
        setStatus('off')
      }
    }
    check()
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'off')
        return
      }

      const vapidRes = await fetch('/api/push/vapid')
      const vapid = await vapidRes.json()
      if (!vapid?.publicKey) {
        setStatus('error')
        return
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
        })
      }

      const r = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!r.ok) throw new Error('subscribe failed')
      setStatus('on')
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('off')
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading' || status === 'unsupported') return null

  const baseBtn: React.CSSProperties = {
    flex: '0 0 auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    padding: '10px 16px',
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 13,
    border: 'none',
    cursor: busy ? 'wait' : 'pointer',
    whiteSpace: 'nowrap',
    opacity: busy ? 0.75 : 1,
  }

  if (status === 'denied') {
    return (
      <button type="button" disabled style={{ ...baseBtn, background: '#1a2430', color: '#8b98a6' }}>
        Xabarlar bloklangan
      </button>
    )
  }

  if (status === 'on') {
    return (
      <button
        type="button"
        onClick={disable}
        disabled={busy}
        style={{
          ...baseBtn,
          background: 'rgba(32,214,122,.12)',
          color: '#20d67a',
          border: '1px solid rgba(32,214,122,.35)',
        }}
      >
        ✓ Xabarlar yoqilgan
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={busy}
      style={{
        ...baseBtn,
        background: '#f0b90b',
        color: '#0b0f14',
        boxShadow: '0 8px 22px rgba(240,185,11,.2)',
      }}
    >
      {status === 'error' ? 'Qayta urinish' : '🔔 Saytdan xabar olish'}
    </button>
  )
}
