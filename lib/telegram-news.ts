type NewsItem = {
  slug: string
  title: string
  summary?: string
  url?: string
  source?: string
  date?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendTelegramNews(items: NewsItem[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram Environment Variables topilmadi')
  if (!items.length) return

  const sections = items.map((item, index) => {
    return [
      `<b>${index + 1}. ${escapeHtml(item.title)}</b>`,
      item.summary ? escapeHtml(item.summary) : '',
    ].filter(Boolean).join('\n')
  })

  const footer = 'Yangiliklarning to\'liq matni bilan GOLDENWEB.UZ ning Yangiliklar sahifasida tanishing.\nhttps://goldenweb.vercel.app/yangiliklar'
  let message = `<b>📰 SO‘NGGI YANGILIKLAR</b>\n\n${sections.join('\n\n')}\n\n${footer}`

  if (message.length > 4096) {
    message = message.slice(0, 4050).trimEnd() + '\n\n…'
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })

  if (!response.ok) throw new Error(`Telegram API xatosi: ${response.status} ${await response.text()}`)
  const result = await response.json()
  if (!result?.ok) throw new Error(`Telegram API xatosi: ${JSON.stringify(result)}`)
}
