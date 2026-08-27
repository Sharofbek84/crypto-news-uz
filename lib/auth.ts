import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { isAdminEmail } from './admin'
import { findUserByEmail, isPremiumActive, verifyPassword } from './users'

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
      if (email) {
        const dbUser = await findUserByEmail(email)
        token.premium = isPremiumActive(dbUser)
        token.subscriptionStatus = dbUser?.subscriptionStatus || 'none'
        token.subscriptionEndsAt = dbUser?.subscriptionEndsAt || null
        token.name = dbUser?.name || token.name
        token.isAdmin = isAdminEmail(email)
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = token.id as string
        ;(session.user as { premium?: boolean }).premium = Boolean(token.premium)
        ;(session.user as { isAdmin?: boolean }).isAdmin = Boolean(token.isAdmin)
        ;(session.user as { subscriptionStatus?: string }).subscriptionStatus =
          (token.subscriptionStatus as string) || 'none'
        ;(session.user as { subscriptionEndsAt?: string | null }).subscriptionEndsAt =
          (token.subscriptionEndsAt as string | null) || null
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
