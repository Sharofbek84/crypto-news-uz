'use client'

import { useState } from 'react'

export default function CryptoAnalystAI() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Salom! Men Kripto tahlilchi AI. Premium tahlildagi coinlar, Entry, TP, SL va trendlar bo‘yicha savollaringizga yordam beraman.'
    }
  ])

  function sendMessage() {
    const text = message.trim()
    if (!text) return

    setMessages((current) => [
      ...current,
      { role: 'user', text },
      {
        role: 'assistant',
        text: 'Savolingiz qabul qilindi. AI tahlil mexanizmini ulash uchun API sozlamalari kerak bo‘ladi.'
      }
    ])
    setMessage('')
  }

  return (
    <>
      <button
        type="button"
        aria-label="Kripto tahlilchi AI ni ochish"
        onClick={() => setOpen((value) => !value)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 1000,
          border: '1px solid rgba(245, 185, 11, .55)',
          background: 'linear-gradient(135deg, #17120a, #2b210b)',
          color: '#f5c84c',
          borderRadius: 999,
          padding: '12px 17px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          fontWeight: 800,
          fontSize: 14,
          cursor: 'pointer',
          boxShadow: '0 10px 35px rgba(0,0,0,.35)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        Kripto tahlilchi AI
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 82,
            zIndex: 999,
            width: 'min(390px, calc(100vw - 32px))',
            height: 540,
            maxHeight: 'calc(100vh - 110px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(245, 185, 11, .25)',
            borderRadius: 18,
            background: '#090d13',
            boxShadow: '0 24px 70px rgba(0,0,0,.55)'
          }}
        >
          <div style={{
            padding: '15px 16px',
            borderBottom: '1px solid #202938',
            background: 'linear-gradient(135deg, #121821, #17130b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ color: '#f5c84c', fontWeight: 900, fontSize: 15 }}>✦ Kripto tahlilchi AI</div>
              <div style={{ color: '#7f8b9c', fontSize: 11, marginTop: 3 }}>Premium tahlil yordamchisi</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Yopish"
              style={{ border: 0, background: 'transparent', color: '#8e9aaa', fontSize: 20, cursor: 'pointer' }}
            >×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((item, index) => (
              <div
                key={index}
                style={{
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: '10px 12px',
                  borderRadius: item.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: item.role === 'user' ? '#b88916' : '#131a24',
                  color: item.role === 'user' ? '#080b10' : '#dce4ee',
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: item.role === 'assistant' ? '1px solid #222d3d' : '0'
                }}
              >
                {item.text}
              </div>
            ))}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid #202938', background: '#0c1118' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') sendMessage() }}
                placeholder="Masalan: BTC trendi qanday?"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: '1px solid #283346',
                  outline: 'none',
                  borderRadius: 11,
                  background: '#101721',
                  color: '#e7edf5',
                  padding: '10px 11px',
                  fontSize: 13
                }}
              />
              <button
                type="button"
                onClick={sendMessage}
                style={{
                  border: 0,
                  borderRadius: 11,
                  padding: '0 14px',
                  background: '#f0b90b',
                  color: '#111',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
