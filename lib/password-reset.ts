import { randomBytes } from 'crypto'
import { getRedis } from './redis'

const TOKEN_TTL_SEC = 60 * 60 // 1 soat

function tokenKey(token: string) {
  return `pwdreset:${token}`
}

export async function createPasswordResetToken(
  email: string
): Promise<string | null> {
  const redis = getRedis()
  if (!redis) return null
  const token = randomBytes(32).toString('hex')
  await redis.set(tokenKey(token), email.toLowerCase().trim(), { ex: TOKEN_TTL_SEC })
  return token
}

export async function consumePasswordResetToken(
  token: string
): Promise<string | null> {
  const redis = getRedis()
  if (!redis) return null
  const key = tokenKey(token)
  const email = await redis.get<string>(key)
  if (!email) return null
  await redis.del(key)
  return String(email).toLowerCase().trim()
}
