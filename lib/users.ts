import bcrypt from 'bcryptjs'
import { getRedis } from './redis'

export type SubscriptionStatus = 'none' | 'active' | 'cancelled'

export type AppUser = {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
  plan: 'free' | 'premium'
  subscriptionStatus: SubscriptionStatus
  subscriptionEndsAt: string | null
}

export type PublicUser = Omit<AppUser, 'passwordHash'>

function userKey(email: string) {
  return `user:${email.toLowerCase().trim()}`
}

function normalizeUser(raw: AppUser): AppUser {
  return {
    ...raw,
    plan: raw.plan || 'free',
    subscriptionStatus: raw.subscriptionStatus || 'none',
    subscriptionEndsAt: raw.subscriptionEndsAt ?? null,
  }
}

export function isPremiumActive(user: AppUser | null | undefined): boolean {
  if (!user) return false
  if (user.subscriptionStatus !== 'active') return false
  if (!user.subscriptionEndsAt) return true
  return new Date(user.subscriptionEndsAt).getTime() > Date.now()
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const redis = getRedis()
  if (!redis) return null
  const data = await redis.get<AppUser>(userKey(email))
  if (!data) return null
  return normalizeUser(data)
}

export async function saveUser(user: AppUser): Promise<void> {
  const redis = getRedis()
  if (!redis) throw new Error('Redis sozlanmagan')
  await redis.set(userKey(user.email), user)
}

export async function createUser(params: {
  email: string
  password: string
  name?: string
}): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const redis = getRedis()
  if (!redis) {
    return { ok: false, error: 'Redis sozlanmagan. UPSTASH_REDIS_REST_URL va TOKEN kerak.' }
  }

  const email = params.email.toLowerCase().trim()
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Email noto‘g‘ri.' }
  }
  if (!params.password || params.password.length < 6) {
    return { ok: false, error: 'Parol kamida 6 ta belgidan iborat bo‘lsin.' }
  }

  const existing = await redis.get(userKey(email))
  if (existing) {
    return { ok: false, error: 'Bu email allaqachon ro‘yxatdan o‘tgan.' }
  }

  const passwordHash = await bcrypt.hash(params.password, 10)
  const user: AppUser = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    name: (params.name || email.split('@')[0]).trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
    plan: 'free',
    subscriptionStatus: 'none',
    subscriptionEndsAt: null,
  }

  await redis.set(userKey(email), user)

  const { passwordHash: _, ...publicUser } = user
  return { ok: true, user: publicUser }
}

export async function verifyPassword(email: string, password: string): Promise<AppUser | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  const match = await bcrypt.compare(password, user.passwordHash)
  return match ? user : null
}

export async function activatePremium(email: string, days = 30): Promise<PublicUser | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  const ends = new Date()
  ends.setDate(ends.getDate() + days)
  user.plan = 'premium'
  user.subscriptionStatus = 'active'
  user.subscriptionEndsAt = ends.toISOString()
  await saveUser(user)
  const { passwordHash: _, ...pub } = user
  return pub
}

export async function cancelPremium(email: string): Promise<PublicUser | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  user.plan = 'free'
  user.subscriptionStatus = 'cancelled'
  await saveUser(user)
  const { passwordHash: _, ...pub } = user
  return pub
}

export function toPublicUser(user: AppUser): PublicUser {
  const { passwordHash: _, ...pub } = user
  return pub
}
