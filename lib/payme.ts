import { getRedis } from './redis'
import { activatePremium, findUserByEmail } from './users'

/** Premium narxi (so‘m). Payme tiyinda ishlaydi: amount * 100 */
export const PREMIUM_PRICE_UZS = Number(process.env.PAYME_PREMIUM_PRICE_UZS || '240000')
export const PREMIUM_DAYS = Number(process.env.PAYME_PREMIUM_DAYS || '30')

export type PaymeTxState = 1 | 2 | -1 | -2

export type PaymeTransaction = {
  id: string // Payme transaction id
  orderId: string // bizning order id
  email: string
  amount: number // tiyin
  state: PaymeTxState
  createTime: number
  performTime: number
  cancelTime: number
  reason: number | null
}

function txKey(paymeId: string) {
  return `payme:tx:${paymeId}`
}

function orderKey(orderId: string) {
  return `payme:order:${orderId}`
}

export function getPaymeCredentials() {
  const id = process.env.PAYME_MERCHANT_ID || ''
  const key = process.env.PAYME_MERCHANT_KEY || ''
  return { id, key }
}

/** Basic Auth: Payme → Merchant (login = merchant id, password = key) */
export function verifyPaymeAuth(request: Request): boolean {
  const { id, key } = getPaymeCredentials()
  if (!id || !key) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Basic ')) return false
  try {
    const decoded = atob(header.slice(6))
    const [login, password] = decoded.split(':')
    return login === id && password === key
  } catch {
    return false
  }
}

export async function saveTransaction(tx: PaymeTransaction): Promise<void> {
  const redis = getRedis()
  if (!redis) throw new Error('Redis sozlanmagan')
  await redis.set(txKey(tx.id), tx)
  await redis.set(orderKey(tx.orderId), tx.id)
}

export async function getTransactionByPaymeId(id: string): Promise<PaymeTransaction | null> {
  const redis = getRedis()
  if (!redis) return null
  return (await redis.get<PaymeTransaction>(txKey(id))) || null
}

export async function getTransactionByOrderId(orderId: string): Promise<PaymeTransaction | null> {
  const redis = getRedis()
  if (!redis) return null
  const paymeId = await redis.get<string>(orderKey(orderId))
  if (!paymeId) return null
  return getTransactionByPaymeId(String(paymeId))
}

/** Checkout: foydalanuvchi uchun order yaratish */
export async function createPremiumOrder(email: string): Promise<{ orderId: string; amountTiyin: number }> {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('Foydalanuvchi topilmadi')
  const orderId = `prem_${user.id}_${Date.now().toString(36)}`
  const amountTiyin = PREMIUM_PRICE_UZS * 100
  const redis = getRedis()
  if (!redis) throw new Error('Redis sozlanmagan')
  await redis.set(`payme:pending:${orderId}`, {
    email: user.email,
    amount: amountTiyin,
    createdAt: new Date().toISOString(),
  })
  return { orderId, amountTiyin }
}

export async function getPendingOrder(orderId: string): Promise<{ email: string; amount: number } | null> {
  const redis = getRedis()
  if (!redis) return null
  return (await redis.get<{ email: string; amount: number }>(`payme:pending:${orderId}`)) || null
}

/** PerformTransaction muvaffaqiyatli — Premium yoqish */
export async function fulfillPremiumOrder(orderId: string): Promise<boolean> {
  const pending = await getPendingOrder(orderId)
  if (!pending?.email) return false
  await activatePremium(pending.email, PREMIUM_DAYS)
  return true
}

/** Payme checkout URL (checkout.paycom.uz) */
export function buildPaymeCheckoutUrl(orderId: string, amountTiyin: number): string {
  const { id } = getPaymeCredentials()
  // merchant_id;amount;account[order_id]
  const params = `m=${id};ac.order_id=${orderId};a=${amountTiyin}`
  const encoded =
    typeof Buffer !== 'undefined'
      ? Buffer.from(params, 'utf8').toString('base64')
      : btoa(params)
  return `https://checkout.paycom.uz/${encoded}`
}

export function paymeError(
  id: unknown,
  code: number,
  message: { uz: string; ru: string; en: string },
  data?: string
) {
  return {
    error: { code, message, data },
    id,
  }
}

export function paymeResult(id: unknown, result: Record<string, unknown>) {
  return { result, id }
}
