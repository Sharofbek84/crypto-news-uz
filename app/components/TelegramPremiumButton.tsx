'use client'

export default function TelegramPremiumButton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0 8px' }}>
      <a
        href="https://t.me/+Q8d8pPnjKwMxZjUy"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '12px 20px',
          borderRadius: 10,
          background: '#229ED9',
          color: '#fff',
          fontWeight: 800,
          fontSize: 15,
          textDecoration: 'none',
          boxShadow: '0 6px 20px rgba(34,158,217,.22)',
        }}
      >
        <span aria-hidden="true">🔔</span>
        Telegram Premium Signallar
      </a>
    </div>
  )
}
