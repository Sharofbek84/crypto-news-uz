import { getRedis } from '@/lib/redis'

export type IdeaComment = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

export type CommunityIdea = {
  id: string
  title: string
  body: string
  authorId: string
  authorName: string
  authorEmail: string
  imageData: string | null
  createdAt: string
  comments: IdeaComment[]
}

const INDEX_KEY = 'community-ideas:index'
const IDEA_PREFIX = 'community-idea:'
const DAILY_PREFIX = 'community-ideas:daily:'

const MAX_IMAGE_BYTES = 1 * 1024 * 1024
const MAX_TITLE = 120
const MAX_BODY = 5000
const MAX_COMMENT = 1000
const MAX_IDEAS_PER_DAY = 5
export const MAX_STORED_IDEAS = 10

function ideaKey(id: string) {
  return `${IDEA_PREFIX}${id}`
}

function dailyKey(userId: string) {
  const day = new Date().toISOString().slice(0, 10)
  return `${DAILY_PREFIX}${day}:${userId}`
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function validateTitle(title: string): string | null {
  const t = title.trim()
  if (t.length < 3) return 'Mavzu kamida 3 ta belgidan iborat bo‘lsin.'
  if (t.length > MAX_TITLE) return `Mavzu ${MAX_TITLE} belgidan oshmasin.`
  return null
}

export function validateBody(body: string): string | null {
  const t = body.trim()
  if (t.length < 20) return 'Asosiy matn kamida 20 ta belgidan iborat bo‘lsin.'
  if (t.length > MAX_BODY) return `Matn ${MAX_BODY} belgidan oshmasin.`
  return null
}

export function validateComment(text: string): string | null {
  const t = text.trim()
  if (t.length < 2) return 'Fikr juda qisqa.'
  if (t.length > MAX_COMMENT) return `Fikr ${MAX_COMMENT} belgidan oshmasin.`
  return null
}

export function validateImageData(imageData: string | null | undefined): string | null {
  if (!imageData) return null
  if (!imageData.startsWith('data:image/')) return 'Faqat rasm fayli (JPG, PNG, WEBP, GIF).'
  const comma = imageData.indexOf(',')
  if (comma < 0) return 'Rasm formati noto‘g‘ri.'
  const meta = imageData.slice(0, comma)
  if (!/data:image\/(jpeg|jpg|png|webp|gif);base64/i.test(meta)) {
    return 'Ruxsat: JPG, PNG, WEBP yoki GIF.'
  }
  const b64 = imageData.slice(comma + 1)
  const approxBytes = Math.floor((b64.length * 3) / 4)
  if (approxBytes > MAX_IMAGE_BYTES) return 'Rasm hajmi 1 MB dan oshmasin.'
  return null
}

async function pruneOldIdeas(): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const staleIds = await redis.zrange(INDEX_KEY, MAX_STORED_IDEAS, -1, { rev: true })
  if (!staleIds?.length) return

  for (const id of staleIds) {
    const sid = String(id)
    await redis.del(ideaKey(sid))
    await redis.zrem(INDEX_KEY, sid)
  }
}

export async function listCommunityIdeas(limit = MAX_STORED_IDEAS): Promise<CommunityIdea[]> {
  const redis = getRedis()
  if (!redis) return []

  await pruneOldIdeas()

  const ids = await redis.zrange(INDEX_KEY, 0, Math.min(limit, MAX_STORED_IDEAS) - 1, { rev: true })
  if (!ids?.length) return []

  const ideas: CommunityIdea[] = []
  for (const id of ids) {
    const raw = await redis.get<CommunityIdea>(ideaKey(String(id)))
    if (raw) ideas.push(normalizeIdea(raw))
  }
  return ideas
}

export async function getCommunityIdea(id: string): Promise<CommunityIdea | null> {
  const redis = getRedis()
  if (!redis) return null
  const raw = await redis.get<CommunityIdea>(ideaKey(id))
  return raw ? normalizeIdea(raw) : null
}

function normalizeIdea(raw: CommunityIdea): CommunityIdea {
  return {
    ...raw,
    comments: Array.isArray(raw.comments) ? raw.comments : [],
    imageData: raw.imageData || null,
  }
}

export async function createCommunityIdea(params: {
  title: string
  body: string
  imageData?: string | null
  authorId: string
  authorName: string
  authorEmail: string
}): Promise<{ ok: true; idea: CommunityIdea } | { ok: false; error: string }> {
  const redis = getRedis()
  if (!redis) return { ok: false, error: 'Saqlash tizimi (Redis) sozlanmagan.' }

  const titleErr = validateTitle(params.title)
  if (titleErr) return { ok: false, error: titleErr }
  const bodyErr = validateBody(params.body)
  if (bodyErr) return { ok: false, error: bodyErr }
  const imgErr = validateImageData(params.imageData)
  if (imgErr) return { ok: false, error: imgErr }

  const daily = dailyKey(params.authorId)
  const count = Number((await redis.get<number | string>(daily)) || 0)
  if (count >= MAX_IDEAS_PER_DAY) {
    return { ok: false, error: `Bir kunda maksimal ${MAX_IDEAS_PER_DAY} ta g‘oya qo‘shish mumkin.` }
  }

  const id = newId('ci')
  const idea: CommunityIdea = {
    id,
    title: params.title.trim(),
    body: params.body.trim(),
    authorId: params.authorId,
    authorName: params.authorName.trim() || params.authorEmail.split('@')[0],
    authorEmail: params.authorEmail.toLowerCase(),
    imageData: params.imageData || null,
    createdAt: new Date().toISOString(),
    comments: [],
  }

  await redis.set(ideaKey(id), idea)
  await redis.zadd(INDEX_KEY, { score: Date.now(), member: id })
  await redis.incr(daily)
  await redis.expire(daily, 60 * 60 * 48)
  await pruneOldIdeas()

  return { ok: true, idea }
}

export async function updateCommunityIdea(params: {
  id: string
  title: string
  body: string
  imageData?: string | null
  /** true bo'lsa rasmni o'zgartirish (null = o'chirish) */
  replaceImage?: boolean
}): Promise<{ ok: true; idea: CommunityIdea } | { ok: false; error: string }> {
  const redis = getRedis()
  if (!redis) return { ok: false, error: 'Saqlash tizimi (Redis) sozlanmagan.' }

  const idea = await getCommunityIdea(params.id)
  if (!idea) return { ok: false, error: 'G‘oya topilmadi.' }

  const titleErr = validateTitle(params.title)
  if (titleErr) return { ok: false, error: titleErr }
  const bodyErr = validateBody(params.body)
  if (bodyErr) return { ok: false, error: bodyErr }

  if (params.replaceImage) {
    const imgErr = validateImageData(params.imageData)
    if (imgErr) return { ok: false, error: imgErr }
    idea.imageData = params.imageData || null
  }

  idea.title = params.title.trim()
  idea.body = params.body.trim()

  await redis.set(ideaKey(idea.id), idea)
  return { ok: true, idea }
}

export async function deleteCommunityIdea(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const redis = getRedis()
  if (!redis) return { ok: false, error: 'Saqlash tizimi (Redis) sozlanmagan.' }

  const idea = await getCommunityIdea(id)
  if (!idea) return { ok: false, error: 'G‘oya topilmadi.' }

  await redis.del(ideaKey(id))
  await redis.zrem(INDEX_KEY, id)
  return { ok: true }
}

export async function addIdeaComment(params: {
  ideaId: string
  text: string
  authorId: string
  authorName: string
}): Promise<{ ok: true; idea: CommunityIdea } | { ok: false; error: string }> {
  const redis = getRedis()
  if (!redis) return { ok: false, error: 'Saqlash tizimi (Redis) sozlanmagan.' }

  const textErr = validateComment(params.text)
  if (textErr) return { ok: false, error: textErr }

  const idea = await getCommunityIdea(params.ideaId)
  if (!idea) return { ok: false, error: 'G‘oya topilmadi.' }

  const comment: IdeaComment = {
    id: newId('cm'),
    authorId: params.authorId,
    authorName: params.authorName.trim() || 'Foydalanuvchi',
    text: params.text.trim(),
    createdAt: new Date().toISOString(),
  }

  idea.comments = [...idea.comments, comment]
  await redis.set(ideaKey(idea.id), idea)
  return { ok: true, idea }
}
