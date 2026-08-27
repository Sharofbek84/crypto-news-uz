'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  const [open, setOpen] = useState(false)

  // Sahifa o‘zgarganda menyuni yopish
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Scrollni bloklash ochiq menyuda (mobile)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="header">
      <div className="container siteHeaderInner">
        <Link href="/" className="logo" style={{ textDecoration: 'none', flexShrink: 0 }}>
          GOLDENWEB<span>.UZ</span>
        </Link>

        {/* Desktop menyu */}
        <nav className="siteNav siteNavDesktop" aria-label="Asosiy menyu">
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

        <div className="siteHeaderRight">
          <div className="siteHeaderAuth desktopOnly">
            <HeaderAuth />
          </div>

          <button
            type="button"
            className={`menuToggle${open ? ' open' : ''}`}
            aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div className={`mobileMenu${open ? ' open' : ''}`} aria-hidden={!open}>
        <nav className="mobileNav" aria-label="Mobil menyu">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'mobileNavLink active' : 'mobileNavLink'}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mobileAuth">
          <HeaderAuth />
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="menuBackdrop"
          aria-label="Menyuni yopish"
          onClick={() => setOpen(false)}
        />
      )}
    </header>
  )
}
