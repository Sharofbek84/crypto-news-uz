import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Crypto Tahlil UZ',
  description: 'AI yordamida kriptovalyuta texnik tahlili va kripto yangiliklari',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="uz"><body>{children}</body></html>
}
