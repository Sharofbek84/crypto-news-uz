import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Premium can be cached in the JWT for up to one hour. Still enforce a
    // known subscription end date immediately, without needing Redis.
    const subscriptionStatus = token?.subscriptionStatus
    const subscriptionEndsAt = token?.subscriptionEndsAt
    const hasNotExpired =
      typeof subscriptionEndsAt !== 'string' ||
      !subscriptionEndsAt ||
      new Date(subscriptionEndsAt).getTime() > Date.now()
    const hasPremium =
      Boolean(token?.premium) && subscriptionStatus === 'active' && hasNotExpired

    if (path.startsWith('/premium') && !hasPremium) {
      return NextResponse.redirect(new URL('/kabinet?need=premium', req.url))
    }

    // Check admin access against current server configuration, not a potentially
    // stale isAdmin claim stored in a long-lived JWT.
    const email = typeof token?.email === 'string' ? token.email.trim().toLowerCase() : ''
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    const isAdmin = Boolean(email) && adminEmails.includes(email)

    if (path.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL('/kabinet', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (
          path.startsWith('/kabinet') ||
          path.startsWith('/premium') ||
          path.startsWith('/admin')
        ) {
          return !!token
        }
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/premium/:path*', '/kabinet/:path*', '/admin/:path*'],
}
