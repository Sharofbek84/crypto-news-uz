import webpush from 'web-push'
import { getRedis } from '@/lib/redis'

const SUBS_KEY = 'push:subs'

export type PushSubscriptionJSON = {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
  expirationTime?: number | null
}

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@goldenweb.uz'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export function isPushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export async function savePushSubscription(sub: PushSubscriptionJSON) {
  const redis = getRedis()
  if (!redis || !sub?.endpoint) return false
  await redis.hset(SUBS_KEY, { [sub.endpoint]: JSON.stringify(sub) })
  return true
}

export async function removePushSubscription(endpoint: string) {
  const redis = getRedis()
  if (!redis || !endpoint) return false
  await redis.hdel(SUBS_KEY, endpoint)
  return true
}

export async function broadcastPush(payload: {
  title: string
  body: string
  url?: string
  tag?: string
}) {
  if (!configureVapid()) {
    return { sent: 0, failed: 0, reason: 'vapid-not-configured' as const }
  }

  const redis = getRedis()
  if (!redis) {
    return { sent: 0, failed: 0, reason: 'redis-missing' as const }
  }

  const all = await redis.hgetall<Record<string, string>>(SUBS_KEY)
  if (!all || Object.keys(all).length === 0) {
    return { sent: 0, failed: 0, reason: 'no-subscribers' as const }
  }

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/premium',
    tag: payload.tag || 'signal',
  })

  let sent = 0
  let failed = 0
  const stale: string[] = []

  await Promise.all(
    Object.entries(all).map(async ([endpoint, raw]) => {
      try {
        const sub = typeof raw === 'string' ? JSON.parse(raw) : raw
        await webpush.sendNotification(sub, data, {
          TTL: 60 * 60,
          urgency: 'high',
        })
        sent++
      } catch (err: any) {
        failed++
        const code = err?.statusCode
        if (code === 404 || code === 410) stale.push(endpoint)
      }
    })
  )

  if (stale.length) {
    try {
      await redis.hdel(SUBS_KEY, ...stale)
    } catch {
      // ignore cleanup errors
    }
  }

  return { sent, failed, reason: 'ok' as const }
}
