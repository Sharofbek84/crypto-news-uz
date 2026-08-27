import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export const metadata = {
  title: 'Ro‘yxatdan o‘tish | GOLDENWEB.UZ',
  description: 'GOLDENWEB.UZ da yangi hisob yarating',
}

export default function SignUpPage() {
  return (
    <>
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" className="logo">GOLDENWEB<span>.UZ</span></Link>
          <Link href="/" style={{ color: '#9aa7b8', fontSize: '.9rem', fontWeight: 600 }}>← Bosh sahifa</Link>
        </div>
      </header>
      <main className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 48, paddingBottom: 64 }}>
        <SignUp
          appearance={{
            elements: {
              rootBox: { width: '100%', maxWidth: 400 },
              card: { background: '#1e2329', border: '1px solid #2b3139' },
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/obuna"
        />
      </main>
      <footer className="footer">GOLDENWEB.UZ • {new Date().getFullYear()}</footer>
    </>
  )
}
