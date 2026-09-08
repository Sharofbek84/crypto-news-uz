import { NextResponse } from 'next/server'
import {
  fulfillPremiumOrder,
  getPendingOrder,
  getTransactionByPaymeId,
  paymeError,
  paymeResult,
  PREMIUM_PRICE_UZS,
  saveTransaction,
  type PaymeTransaction,
  verifyPaymeAuth,
} from '@/lib/payme'

export const dynamic = 'force-dynamic'

/**
 * Payme Merchant API (JSON-RPC)
 * Kabinetda callback URL: https://goldenweb.uz/api/payme
 * account maydoni: order_id
 */
export async function POST(request: Request) {
  if (!verifyPaymeAuth(request)) {
    return NextResponse.json(
      paymeError(null, -32504, {
        uz: 'Avtorizatsiya xato',
        ru: 'Ошибка авторизации',
        en: 'Auth error',
      }),
      { status: 200 }
    )
  }

  let body: { method?: string; params?: Record<string, any>; id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      paymeError(null, -32700, {
        uz: 'JSON xato',
        ru: 'Ошибка JSON',
        en: 'Parse error',
      }),
      { status: 200 }
    )
  }

  const { method, params = {}, id } = body
  const expectedAmount = PREMIUM_PRICE_UZS * 100

  try {
    switch (method) {
      case 'CheckPerformTransaction': {
        const orderId = String(params.account?.order_id || '')
        const amount = Number(params.amount)
        const pending = await getPendingOrder(orderId)
        if (!pending) {
          return NextResponse.json(
            paymeError(id, -31050, {
              uz: 'Buyurtma topilmadi',
              ru: 'Заказ не найден',
              en: 'Order not found',
            }, 'order_id'),
            { status: 200 }
          )
        }
        if (amount !== pending.amount && amount !== expectedAmount) {
          return NextResponse.json(
            paymeError(id, -31001, {
              uz: 'Summa noto‘g‘ri',
              ru: 'Неверная сумма',
              en: 'Invalid amount',
            }),
            { status: 200 }
          )
        }
        return NextResponse.json(paymeResult(id, { allow: true }), { status: 200 })
      }

      case 'CreateTransaction': {
        const paymeId = String(params.id)
        const orderId = String(params.account?.order_id || '')
        const amount = Number(params.amount)
        const time = Number(params.time) || Date.now()

        const existing = await getTransactionByPaymeId(paymeId)
        if (existing) {
          return NextResponse.json(
            paymeResult(id, {
              create_time: existing.createTime,
              transaction: existing.orderId,
              state: existing.state,
            }),
            { status: 200 }
          )
        }

        const pending = await getPendingOrder(orderId)
        if (!pending) {
          return NextResponse.json(
            paymeError(id, -31050, {
              uz: 'Buyurtma topilmadi',
              ru: 'Заказ не найден',
              en: 'Order not found',
            }, 'order_id'),
            { status: 200 }
          )
        }
        if (amount !== pending.amount && amount !== expectedAmount) {
          return NextResponse.json(
            paymeError(id, -31001, {
              uz: 'Summa noto‘g‘ri',
              ru: 'Неверная сумма',
              en: 'Invalid amount',
            }),
            { status: 200 }
          )
        }

        const tx: PaymeTransaction = {
          id: paymeId,
          orderId,
          email: pending.email,
          amount,
          state: 1,
          createTime: time,
          performTime: 0,
          cancelTime: 0,
          reason: null,
        }
        await saveTransaction(tx)
        return NextResponse.json(
          paymeResult(id, {
            create_time: tx.createTime,
            transaction: tx.orderId,
            state: 1,
          }),
          { status: 200 }
        )
      }

      case 'PerformTransaction': {
        const paymeId = String(params.id)
        const tx = await getTransactionByPaymeId(paymeId)
        if (!tx) {
          return NextResponse.json(
            paymeError(id, -31003, {
              uz: 'Tranzaksiya topilmadi',
              ru: 'Транзакция не найдена',
              en: 'Transaction not found',
            }),
            { status: 200 }
          )
        }
        if (tx.state === 2) {
          return NextResponse.json(
            paymeResult(id, {
              transaction: tx.orderId,
              perform_time: tx.performTime,
              state: 2,
            }),
            { status: 200 }
          )
        }
        if (tx.state !== 1) {
          return NextResponse.json(
            paymeError(id, -31008, {
              uz: 'Operatsiya mumkin emas',
              ru: 'Невозможно выполнить операцию',
              en: 'Cannot perform',
            }),
            { status: 200 }
          )
        }

        tx.state = 2
        tx.performTime = Date.now()
        await saveTransaction(tx)
        await fulfillPremiumOrder(tx.orderId)

        return NextResponse.json(
          paymeResult(id, {
            transaction: tx.orderId,
            perform_time: tx.performTime,
            state: 2,
          }),
          { status: 200 }
        )
      }

      case 'CancelTransaction': {
        const paymeId = String(params.id)
        const reason = Number(params.reason ?? 0)
        const tx = await getTransactionByPaymeId(paymeId)
        if (!tx) {
          return NextResponse.json(
            paymeError(id, -31003, {
              uz: 'Tranzaksiya topilmadi',
              ru: 'Транзакция не найдена',
              en: 'Transaction not found',
            }),
            { status: 200 }
          )
        }
        if (tx.state === 1) {
          tx.state = -1
        } else if (tx.state === 2) {
          tx.state = -2
        }
        tx.cancelTime = Date.now()
        tx.reason = reason
        await saveTransaction(tx)
        return NextResponse.json(
          paymeResult(id, {
            transaction: tx.orderId,
            cancel_time: tx.cancelTime,
            state: tx.state,
          }),
          { status: 200 }
        )
      }

      case 'CheckTransaction': {
        const paymeId = String(params.id)
        const tx = await getTransactionByPaymeId(paymeId)
        if (!tx) {
          return NextResponse.json(
            paymeError(id, -31003, {
              uz: 'Tranzaksiya topilmadi',
              ru: 'Транзакция не найдена',
              en: 'Transaction not found',
            }),
            { status: 200 }
          )
        }
        return NextResponse.json(
          paymeResult(id, {
            create_time: tx.createTime,
            perform_time: tx.performTime,
            cancel_time: tx.cancelTime,
            transaction: tx.orderId,
            state: tx.state,
            reason: tx.reason,
          }),
          { status: 200 }
        )
      }

      case 'GetStatement': {
        return NextResponse.json(paymeResult(id, { transactions: [] }), { status: 200 })
      }

      default:
        return NextResponse.json(
          paymeError(id, -32601, {
            uz: 'Metod topilmadi',
            ru: 'Метод не найден',
            en: 'Method not found',
          }),
          { status: 200 }
        )
    }
  } catch (e) {
    console.error('[payme]', e)
    return NextResponse.json(
      paymeError(id, -32400, {
        uz: 'Ichki xato',
        ru: 'Внутренняя ошибка',
        en: 'Internal error',
      }),
      { status: 200 }
    )
  }
}
