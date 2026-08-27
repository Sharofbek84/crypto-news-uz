import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export const metadata = {
  title: 'Kirish | GOLDENWEB.UZ',
  description: 'GOLDENWEB.UZ hisobingizga kiring',
}

export default function SignInPage() {
  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">GOLDENWEB<span>.UZ</span></Link>
          <Link href="/" style={{ color: '#9aa7b8', fontSize: '.9rem', fontWeight: 600 }}>← Bosh sahifa</Link>
        </div>
      </header>
      <main className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 48, paddingBottom: 64 }}>
        <SignIn
          appearance={{
            elements: {
              rootBox: { width: '100%', maxWidth: 400 },
              card: { background: '#1e2329', border: '1px solid #2b3139' },
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/premium"
        />
      </main>
      <footer className="footer">GOLDENWEB.UZ • {new Date().getFullYear()}</footer>
    </>
  )
}
