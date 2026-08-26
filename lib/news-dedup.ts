import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const SENT_PREFIX = 'telegram:news:sent:'
const LOCK_PREFIX = 'telegram:news:lock:'
const DAILY_SENT_PREFIX = 'telegram:news:digest:sent:'
const DAILY_LOCK_PREFIX = 'telegram:news:digest:lock:'

export async function claimNews(slug: string): Promise<{ alreadySent: boolean; locked: boolean }> {
  const sentKey = `${SENT_PREFIX}${slug}`
  const lockKey = `${LOCK_PREFIX}${slug}`

  if (await redis.exists(sentKey)) return { alreadySent: true, locked: false }
  const locked = await redis.set(lockKey, '1', { nx: true, ex: 600 })
  if (!locked) return { alreadySent: false, locked: true }
  return { alreadySent: false, locked: false }
}

export async function markNewsSent(slug: string): Promise<void> {
  await redis.set(`${SENT_PREFIX}${slug}`, '1')
  await redis.del(`${LOCK_PREFIX}${slug}`)
}

export async function releaseNewsClaim(slug: string): Promise<void> {
  await redis.del(`${LOCK_PREFIX}${slug}`)
}

export async function claimDailyNews(date: string): Promise<{ alreadySent: boolean; locked: boolean }> {
  const sentKey = `${DAILY_SENT_PREFIX}${date}`
  const lockKey = `${DAILY_LOCK_PREFIX}${date}`

  if (await redis.exists(sentKey)) return { alreadySent: true, locked: false }
  const locked = await redis.set(lockKey, '1', { nx: true, ex: 900 })
  if (!locked) return { alreadySent: false, locked: true }
  return { alreadySent: false, locked: false }
}

export async function markDailyNewsSent(date: string): Promise<void> {
  await redis.set(`${DAILY_SENT_PREFIX}${date}`, '1', { ex: 60 * 60 * 24 * 7 })
  await redis.del(`${DAILY_LOCK_PREFIX}${date}`)
}

export async function releaseDailyNewsClaim(date: string): Promise<void> {
  await redis.del(`${DAILY_LOCK_PREFIX}${date}`)
}
