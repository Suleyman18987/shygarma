const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8667991444:AAGfRNElcY0zMPVXnWTwIUSoBC-38hrOxGM'

export async function sendTelegramMessage(chatId: string | number, text: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('Telegram sendMessage API error:', errText)
      return false
    }
    return true
  } catch (error) {
    console.error('Telegram sendMessage network error:', error)
    return false
  }
}
