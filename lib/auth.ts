import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { isAdminEmail } from './admin'
import { findUserByEmail, isPremiumActive, verifyPassword } from './users'

// Permission claims are refreshed at most once per hour per JWT.
// If Redis is temporarily unavailable, retry after five minutes rather than
// turning every session request into another Redis call.
const PERMISSIONS_REFRESH_INTERVAL_MS = 60 * 60 * 1000
const PERMISSIONS_RETRY_DELAY_MS = 5 * 60 * 1000

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Parol', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await verifyPassword(credentials.email, credentials.password)
        if (!user) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }

      const email = (token.email as string) || ''
      if (!email) return token

      // Admin membership is based on server-side environment configuration,
      // so it does not need a Redis lookup.
      token.isAdmin = isAdminEmail(email)

      const now = Date.now()
      const lastCheckedAt =
        typeof token.permissionsCheckedAt === 'number' ? token.permissionsCheckedAt : 0
      const retryAfter =
        typeof token.permissionsRefreshAfter === 'number' ? token.permissionsRefreshAfter : 0
      const isInitialSignIn = Boolean(user)
      const refreshDue = now - lastCheckedAt >= PERMISSIONS_REFRESH_INTERVAL_MS
      const shouldRefresh =
        isInitialSignIn || (refreshDue && now >= retryAfter)

      if (shouldRefresh) {
        try {
          const dbUser = await findUserByEmail(email)

          // A successful lookup with no user clears cached permissions.
          token.premium = isPremiumActive(dbUser)
          token.subscriptionStatus = dbUser?.subscriptionStatus || 'none'
          token.subscriptionEndsAt = dbUser?.subscriptionEndsAt || null
          token.plan = dbUser?.plan || 'free'
          token.createdAt = dbUser?.createdAt || null
          token.name = dbUser?.name || token.name
          token.permissionsCheckedAt = now
          token.permissionsRefreshAfter = 0
        } catch (error) {
          // Keep the last known claims during a temporary Redis outage, but
          // back off to avoid a Redis request on every session access.
          token.permissionsRefreshAfter = now + PERMISSIONS_RETRY_DELAY_MS
          console.error('JWT permission refresh failed:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & {
          id?: string
          premium?: boolean
          isAdmin?: boolean
          subscriptionStatus?: string
          subscriptionEndsAt?: string | null
          plan?: string
          createdAt?: string
        }

        user.id = token.id as string
        user.isAdmin = Boolean(token.isAdmin)
        user.subscriptionStatus = (token.subscriptionStatus as string) || 'none'
        user.subscriptionEndsAt = (token.subscriptionEndsAt as string | null) || null
        user.plan = (token.plan as string) || 'free'
        user.createdAt = (token.createdAt as string) || ''

        // Enforce the subscription end date locally, even between refreshes.
        const endsAt = user.subscriptionEndsAt
        user.premium =
          Boolean(token.premium) &&
          user.subscriptionStatus === 'active' &&
          (!endsAt || new Date(endsAt).getTime() > Date.now())
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
