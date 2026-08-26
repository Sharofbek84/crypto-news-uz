type NewsItem = {
  slug: string
  title: string
  summary?: string
  url?: string
  source?: string
  date?: string
}

export async function sendTelegramNews(items: NewsItem[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram Environment Variables topilmadi')
  if (!items.length) return

  const sections = items.map((item, index) => {
    const link = item.url || `https://goldenweb.uz/yangiliklar/${item.slug}`
    return [
      `${index + 1}. ${item.title}`,
      item.summary || '',
      `🔗 ${link}`,
    ].filter(Boolean).join('\n')
  })

  let message = ['📰 SO‘NGGI YANGILIKLAR', '', ...sections].join('\n\n')
  if (message.length > 4096) {
    message = message.slice(0, 4050).trimEnd() + '\n\n…'
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: false }),
  })

  if (!response.ok) throw new Error(`Telegram API xatosi: ${response.status} ${await response.text()}`)
  const result = await response.json()
  if (!result?.ok) throw new Error(`Telegram API xatosi: ${JSON.stringify(result)}`)
}
