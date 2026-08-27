'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import HeaderAuth from './HeaderAuth'

const NAV = [
  { href: '/', label: 'Bosh sahifa' },
  { href: '/yangiliklar', label: 'Yangiliklar' },
  { href: '/obuna', label: 'Premium obuna' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function SiteHeader() {
  const pathname = usePathname() || '/'

  return (
    <header className="header">
      <div className="container siteHeaderInner">
        <Link href="/" className="logo" style={{ textDecoration: 'none', flexShrink: 0 }}>
          GOLDENWEB<span>.UZ</span>
        </Link>

        <nav className="siteNav" aria-label="Asosiy menyu">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'siteNavLink active' : 'siteNavLink'}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="siteHeaderAuth">
          <HeaderAuth />
        </div>
      </div>
    </header>
  )
}
