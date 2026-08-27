import bcrypt from 'bcryptjs'
import { getRedis } from './redis'

export type AppUser = {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
}

function userKey(email: string) {
  return `user:${email.toLowerCase().trim()}`
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const redis = getRedis()
  if (!redis) return null
  const data = await redis.get<AppUser>(userKey(email))
  return data ?? null
}

export async function createUser(params: {
  email: string
  password: string
  name?: string
}): Promise<{ ok: true; user: Omit<AppUser, 'passwordHash'> } | { ok: false; error: string }> {
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
  }

  await redis.set(userKey(email), user)

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
  }
}

export async function verifyPassword(email: string, password: string): Promise<AppUser | null> {
  const user = await findUserByEmail(email)
  if (!user) return null
  const match = await bcrypt.compare(password, user.passwordHash)
  return match ? user : null
}
