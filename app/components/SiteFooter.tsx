const SOCIAL = [
  {
    name: 'Gmail',
    href: 'mailto:goldenweb.uz@gmail.com',
    label: 'Gmail',
    color: '#EA4335',
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@Goldenweb777',
    label: 'YouTube',
    color: '#FF0000',
  },
  {
    name: 'X',
    href: 'https://www.x.com/Sharofbek84',
    label: 'X',
    color: '#eaecef',
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/goldenweb.uz',
    label: 'Instagram',
    color: '#E4405F',
  },
  {
    name: 'Telegram',
    href: 'https://t.me/goldenweb_uz',
    label: 'Telegram',
    color: '#2AABEE',
  },
] as const

function Icon({ name }: { name: (typeof SOCIAL)[number]['name'] }) {
  const s = 18
  if (name === 'Gmail') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    )
  }
  if (name === 'YouTube') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
      </svg>
    )
  }
  if (name === 'X') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    )
  }
  if (name === 'Instagram') {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.5 1 .4.4.7.9 1 1.5.2.4.4 1.1.4 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-1 1.5-.4.4-.9.7-1.5 1-.4.2-1.1.4-2.3.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.5-1-.4-.4-.7-.9-1-1.5-.2-.4-.4-1.1-.4-2.3-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.3.2-.6.5-1 1-1.5.4-.4.9-.7 1.5-1 .4-.2 1.1-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7 0 5.6.1 4.7.3 3.9.6c-.9.3-1.6.8-2.3 1.5C.9 2.8.4 3.5.1 4.4.3 5.2.1 6.1 0 7.4 0 8.7 0 9.1 0 12s0 3.3.1 4.6c.1 1.3.3 2.2.6 3 .3.9.8 1.6 1.5 2.3.7.7 1.4 1.2 2.3 1.5.8.3 1.7.5 3 .6 1.3.1 1.7.1 4.6.1s3.3 0 4.6-.1c1.3-.1 2.2-.3 3-.6.9-.3 1.6-.8 2.3-1.5.7-.7 1.2-1.4 1.5-2.3.3-.8.5-1.7.6-3 .1-1.3.1-1.7.1-4.6s0-3.3-.1-4.6c-.1-1.3-.3-2.2-.6-3-.3-.9-.8-1.6-1.5-2.3C21.2.9 20.5.4 19.6.1 18.8-.2 17.9 0 16.6 0 15.3 0 14.9 0 12 0z" />
        <path d="M12 5.8A6.2 6.2 0 1 0 12 18.2 6.2 6.2 0 0 0 12 5.8zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM18.4 5.5a1.4 1.4 0 1 1-2.9 0 1.4 1.4 0 0 1 2.9 0z" />
      </svg>
    )
  }
  // Telegram
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

export default function SiteFooter() {
  return (
    <footer className="footer" style={{ paddingTop: 28, paddingBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {SOCIAL.map((item) => (
          <a
            key={item.name}
            href={item.href}
            target={item.name === 'Gmail' ? undefined : '_blank'}
            rel={item.name === 'Gmail' ? undefined : 'noopener noreferrer'}
            aria-label={item.label}
            title={item.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid #2b3139',
              background: '#1e2329',
              color: item.color,
              textDecoration: 'none',
              transition: 'border-color .15s, transform .15s, background .15s',
            }}
          >
            <Icon name={item.name} />
          </a>
        ))}
      </div>
      <div>GOLDENWEB.UZ © 2026 • Real vaqtda kripto bozor tahlili va kripto yangiliklari</div>
    </footer>
  )
}
