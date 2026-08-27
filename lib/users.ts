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
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
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
    stripeCustomerId: raw.stripeCustomerId ?? null,
    stripeSubscriptionId: raw.stripeSubscriptionId ?? null,
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

export async function findUserByStripeCustomerId(customerId: string): Promise<AppUser | null> {
  const redis = getRedis()
  if (!redis) return null
  const email = await redis.get<string>(`stripe_customer:${customerId}`)
  if (!email) return null
  return findUserByEmail(email)
}

export async function saveUser(user: AppUser): Promise<void> {
  const redis = getRedis()
  if (!redis) throw new Error('Redis sozlanmagan')
  await redis.set(userKey(user.email), user)
  if (user.stripeCustomerId) {
    await redis.set(`stripe_customer:${user.stripeCustomerId}`, user.email)
  }
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
    stripeCustomerId: null,
    stripeSubscriptionId: null,
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

export async function setStripeCustomerId(email: string, customerId: string): Promise<void> {
  const user = await findUserByEmail(email)
  if (!user) return
  user.stripeCustomerId = customerId
  await saveUser(user)
}

export async function applyStripeSubscription(params: {
  email?: string
  customerId?: string
  subscriptionId: string
  status: string
  currentPeriodEnd?: number | null
}): Promise<AppUser | null> {
  let user: AppUser | null = null
  if (params.email) user = await findUserByEmail(params.email)
  if (!user && params.customerId) user = await findUserByStripeCustomerId(params.customerId)
  if (!user) return null

  if (params.customerId) user.stripeCustomerId = params.customerId
  user.stripeSubscriptionId = params.subscriptionId

  const activeStatuses = ['active', 'trialing']
  if (activeStatuses.includes(params.status)) {
    user.plan = 'premium'
    user.subscriptionStatus = 'active'
    user.subscriptionEndsAt = params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null
  } else if (params.status === 'canceled' || params.status === 'unpaid' || params.status === 'incomplete_expired') {
    user.plan = 'free'
    user.subscriptionStatus = 'cancelled'
    if (params.currentPeriodEnd) {
      user.subscriptionEndsAt = new Date(params.currentPeriodEnd * 1000).toISOString()
    }
  }

  await saveUser(user)
  return user
}

export function toPublicUser(user: AppUser): PublicUser {
  const { passwordHash: _, ...pub } = user
  return pub
}
