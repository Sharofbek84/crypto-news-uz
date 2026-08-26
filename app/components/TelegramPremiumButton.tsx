'use client'

export default function TelegramPremiumButton() {
  return (
    <section
      aria-labelledby="telegram-premium-title"
      style={{
        position: 'relative',
        overflow: 'hidden',
        margin: '30px 0 12px',
        padding: '26px 24px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, #111a25 0%, #0c121b 55%, #111923 100%)',
        border: '1px solid rgba(240,185,11,.32)',
        boxShadow: '0 14px 38px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.025)',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', right: -70, top: -100, background: 'rgba(240,185,11,.07)' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div aria-hidden="true" style={{ width: 50, height: 50, flex: '0 0 50px', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(240,185,11,.1)', border: '1px solid rgba(240,185,11,.28)', fontSize: 24 }}>
          📡
        </div>

        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ color: '#f0b90b', fontSize: 11, fontWeight: 800, letterSpacing: 1.4, marginBottom: 5 }}>
            PREMIUM TELEGRAM
          </div>
          <h2 id="telegram-premium-title" style={{ color: '#f3f6f9', fontSize: 18, lineHeight: 1.3, margin: '0 0 7px' }}>
            Yangi signallarni o‘z vaqtida qabul qiling
          </h2>
          <p style={{ color: '#aeb9c6', fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: 680 }}>
            Endi siz PREMIUM foydalanuvchi sifatida telegram kanalimiz orqali yangi signallarni o‘z vaqtida qabul qilib olishingiz mumkin.
          </p>
        </div>

        <a
          href="https://t.me/+Q8d8pPnjKwMxZjUy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '11px 18px', borderRadius: 10, background: '#f0b90b', color: '#0b0f14', fontWeight: 800, fontSize: 13, textDecoration: 'none', boxShadow: '0 8px 22px rgba(240,185,11,.16)', whiteSpace: 'nowrap' }}
        >
          <span aria-hidden="true">📲</span>
          KANALGA OBUNA BO‘LING
        </a>
      </div>
    </section>
  )
}
