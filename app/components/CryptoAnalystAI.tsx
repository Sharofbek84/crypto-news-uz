'use client'

import { useEffect, useMemo, useState } from 'react'

type Analysis = {
  coin?: string
  interval?: string
  trend?: string
  side?: string
  rsi?: number
  entryLow?: number
  entryHigh?: number
  invalidation?: number
  tp?: number[]
  support?: number[]
  resistance?: number[]
  ema10?: number
  ema20?: number
  ema50?: number
  summary?: string
  bullish?: string
  bearish?: string
}

type Message = { role: 'user' | 'assistant'; text: string }

function buildContext(analysis: Analysis, coin: string, interval: string) {
  return {
    coin,
    interval,
    trend: analysis?.trend,
    side: analysis?.side,
    rsi: analysis?.rsi,
    entryLow: analysis?.entryLow,
    entryHigh: analysis?.entryHigh,
    stopLoss: analysis?.invalidation,
    tp1: analysis?.tp?.[0],
    tp2: analysis?.tp?.[1],
    tp3: analysis?.tp?.[2],
    support: analysis?.support,
    resistance: analysis?.resistance,
    ema10: analysis?.ema10,
    ema20: analysis?.ema20,
    ema50: analysis?.ema50,
    summary: analysis?.summary,
    bullish: analysis?.bullish,
    bearish: analysis?.bearish,
  }
}

export default function CryptoAnalystAI({ analysis, coin = 'BTC', interval = '1h' }: { analysis?: Analysis; coin?: string; interval?: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Salom! Men Kripto tahlilchi AI. Hozir ${coin}/${interval} Premium tahlilini ko‘rib turibman. Entry, TP, SL, trend, RSI va ssenariylar haqida savol berishingiz mumkin.`,
    },
  ])

  const context = useMemo(() => buildContext(analysis || {}, coin, interval), [analysis, coin, interval])

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      text: `Hozir ${coin}/${interval} Premium tahlili faol. Entry, TP1/TP2/TP3, SL, RSI yoki trend haqida savol bering.`,
    }])
  }, [coin, interval])

  async function sendMessage() {
    const text = message.trim()
    if (!text || loading) return

    const nextMessages = [...messages, { role: 'user' as const, text }]
    setMessages(nextMessages)
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((item) => ({ role: item.role, content: item.text })),
          analysis: context,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'AI server xatosi')
      setMessages((current) => [...current, { role: 'assistant', text: data.text || 'Javob bo‘sh qaytdi.' }])
    } catch (error: any) {
      setMessages((current) => [...current, { role: 'assistant', text: `AI bilan ulanishda xatolik: ${error?.message || 'noma’lum xato'}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Kripto tahlilchi AI ni ochish"
        onClick={() => setOpen((value) => !value)}
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
          border: '1px solid rgba(245, 185, 11, .55)',
          background: 'linear-gradient(135deg, #17120a, #2b210b)',
          color: '#f5c84c', borderRadius: 999, padding: '12px 17px',
          display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800,
          fontSize: 14, cursor: 'pointer', boxShadow: '0 10px 35px rgba(0,0,0,.35)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        Kripto tahlilchi AI
      </button>

      {open && (
        <div style={{
          position: 'fixed', right: 24, bottom: 82, zIndex: 999,
          width: 'min(390px, calc(100vw - 32px))', height: 540,
          maxHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '1px solid rgba(245, 185, 11, .25)',
          borderRadius: 18, background: '#090d13', boxShadow: '0 24px 70px rgba(0,0,0,.55)',
        }}>
          <div style={{
            padding: '15px 16px', borderBottom: '1px solid #202938',
            background: 'linear-gradient(135deg, #121821, #17130b)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: '#f5c84c', fontWeight: 900, fontSize: 15 }}>✦ Kripto tahlilchi AI</div>
              <div style={{ color: '#7f8b9c', fontSize: 11, marginTop: 3 }}>Premium · {coin}/{interval}</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Yopish" style={{ border: 0, background: 'transparent', color: '#8e9aaa', fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((item, index) => (
              <div key={index} style={{
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%',
                padding: '10px 12px', borderRadius: item.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: item.role === 'user' ? '#b88916' : '#131a24',
                color: item.role === 'user' ? '#080b10' : '#dce4ee', fontSize: 13, lineHeight: 1.5,
                border: item.role === 'assistant' ? '1px solid #222d3d' : '0', whiteSpace: 'pre-wrap',
              }}>
                {item.text}
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', color: '#7f8b9c', fontSize: 12 }}>AI tahlil qilmoqda…</div>}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid #202938', background: '#0c1118' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={message}
                disabled={loading}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') sendMessage() }}
                placeholder="Masalan: Nega Entry shu zonada?"
                style={{ flex: 1, minWidth: 0, border: '1px solid #283346', outline: 'none', borderRadius: 11, background: '#101721', color: '#e7edf5', padding: '10px 11px', fontSize: 13 }}
              />
              <button type="button" disabled={loading} onClick={sendMessage} style={{ border: 0, borderRadius: 11, padding: '0 14px', background: '#f0b90b', color: '#111', fontWeight: 900, cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? '…' : '➤'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
