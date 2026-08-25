type TelegramSignal = {
  side: 'BUY' | 'SELL'
  symbol: string
  timeframe: string
  entryLow: number
  entryHigh: number
  tp: number[]
  sl: number
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '-'
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (Math.abs(value) >= 1) return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return value.toPrecision(4)
}

function formatEntry(low: number, high: number): string {
  return `${formatPrice(low)}–${formatPrice(high)}`
}

export async function sendTelegramSignal(signal: TelegramSignal): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    throw new Error('Telegram Environment Variables topilmadi')
  }

  const emoji = signal.side === 'BUY' ? '🟢' : '🔴'
  const message = [
    `${emoji} ${signal.symbol}/USDT — ${signal.side} SIGNAL`,
    '',
    `⏱ ${signal.timeframe}`,
    '',
    `🎯 Entry: ${formatEntry(signal.entryLow, signal.entryHigh)}`,
    `TP1: ${formatPrice(signal.tp[0])}`,
    `TP2: ${formatPrice(signal.tp[1])}`,
    `TP3: ${formatPrice(signal.tp[2])}`,
    `🛑 SL: ${formatPrice(signal.sl)}`,
  ].join('\n')

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Telegram API xatosi: ${response.status} ${body}`)
  }

  const result = await response.json()
  if (!result?.ok) {
    throw new Error(`Telegram API xatosi: ${JSON.stringify(result)}`)
  }
}
