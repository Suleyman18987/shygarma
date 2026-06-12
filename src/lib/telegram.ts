const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8667991444:AAGfRNElcY0zMPVXnWTwIUSoBC-38hrOxGM'

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    const body: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }
    if (replyMarkup) {
      body.reply_markup = replyMarkup
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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

export async function sendTelegramPhoto(chatId: string | number, photoUrl: string, caption?: string, replyMarkup?: any) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
    const body: any = {
      chat_id: chatId,
      photo: photoUrl,
      parse_mode: 'HTML'
    }
    if (caption) {
      body.caption = caption
    }
    if (replyMarkup) {
      body.reply_markup = replyMarkup
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('Telegram sendPhoto API error:', errText)
      return false
    }
    return true
  } catch (error) {
    console.error('Telegram sendPhoto network error:', error)
    return false
  }
}
