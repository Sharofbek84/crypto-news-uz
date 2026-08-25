import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const SENT_PREFIX = 'telegram:news:sent:'
const LOCK_PREFIX = 'telegram:news:lock:'

export async function claimNews(slug: string): Promise<{ alreadySent: boolean; locked: boolean }> {
  const sentKey = `${SENT_PREFIX}${slug}`
  const lockKey = `${LOCK_PREFIX}${slug}`

  if (await redis.exists(sentKey)) {
    return { alreadySent: true, locked: false }
  }

  const locked = await redis.set(lockKey, '1', { nx: true, ex: 600 })
  if (!locked) {
    return { alreadySent: false, locked: true }
  }

  return { alreadySent: false, locked: false }
}

export async function markNewsSent(slug: string): Promise<void> {
  await redis.set(`${SENT_PREFIX}${slug}`, '1')
  await redis.del(`${LOCK_PREFIX}${slug}`)
}

export async function releaseNewsClaim(slug: string): Promise<void> {
  await redis.del(`${LOCK_PREFIX}${slug}`)
}
