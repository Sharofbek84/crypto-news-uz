type NewsItem = {
  slug: string
  title: string
  summary?: string
  url?: string
  source?: string
  date?: string
}

export async function sendTelegramNews(item: NewsItem): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram Environment Variables topilmadi')

  const link = item.url || `https://goldenweb.uz/yangiliklar/${item.slug}`
  const message = [
    '📰 YANGI YANGILIK',
    '',
    item.title,
    '',
    item.summary || '',
    '',
    `🔗 Batafsil: ${link}`,
  ].join('\n')

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: false }),
  })

  if (!response.ok) throw new Error(`Telegram API xatosi: ${response.status} ${await response.text()}`)
  const result = await response.json()
  if (!result?.ok) throw new Error(`Telegram API xatosi: ${JSON.stringify(result)}`)
}
