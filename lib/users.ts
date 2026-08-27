import bcrypt from 'bcryptjs'
import { getRedis } from './redis'
import { isAdminEmail } from './admin'

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

const USERS_INDEX = 'users:index'

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
  await redis.sadd(USERS_INDEX, user.email.toLowerCase())
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
  await redis.sadd(USERS_INDEX, email)

  const { passwordHash: _, ...publicUser } = user
  return { ok: true, user: publicUser }
}

export async function verifyPassword(email: string, password: string): Promise<AppUser | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) return null
  // Eski foydalanuvchilarni admin ro‘yxatiga qo‘shish
  const redis = getRedis()
  if (redis) await redis.sadd(USERS_INDEX, user.email.toLowerCase())
  return user
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

export type AdminUserRow = PublicUser & {
  premium: boolean
  isAdmin: boolean
}

export async function listAllUsers(): Promise<AdminUserRow[]> {
  const redis = getRedis()
  if (!redis) return []

  const emails = await redis.smembers(USERS_INDEX)
  if (!emails || emails.length === 0) return []

  const rows: AdminUserRow[] = []
  for (const email of emails) {
    const user = await findUserByEmail(String(email))
    if (!user) continue
    const pub = toPublicUser(user)
    rows.push({
      ...pub,
      premium: isPremiumActive(user),
      isAdmin: isAdminEmail(user.email),
    })
  }

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return rows
}

export function computeUserStats(users: AdminUserRow[]) {
  const total = users.length
  const premium = users.filter((u) => u.premium).length
  const free = total - premium
  const cancelled = users.filter((u) => u.subscriptionStatus === 'cancelled' && !u.premium).length
  return { total, premium, free, cancelled }
}
