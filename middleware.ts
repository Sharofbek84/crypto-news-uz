import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Premium faqat aktiv obuna bilan
    if (path.startsWith('/premium') && !token?.premium) {
      return NextResponse.redirect(new URL('/kabinet?need=premium', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (path.startsWith('/kabinet') || path.startsWith('/premium')) {
          return !!token
        }
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/premium/:path*', '/kabinet/:path*'],
}
