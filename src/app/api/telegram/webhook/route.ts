import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.message) {
      return NextResponse.json({ ok: true })
    }

    const { text, chat } = body.message
    const chatId = chat.id
    const messageText = text || ''

    if (messageText.startsWith('/start')) {
      const parts = messageText.split(' ')
      if (parts.length > 1) {
        const parentId = parts[1].trim()

        // Verify parent profile exists and role is 'parent'
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, role, full_name')
          .eq('id', parentId)
          .single()

        if (error || !profile) {
          await sendTelegramMessage(chatId, 'Қате: Пайдаланушы профилі табылмады. Сілтеменің дұрыстығын тексеріңіз.')
          return NextResponse.json({ ok: true })
        }

        if (profile.role !== 'parent') {
          await sendTelegramMessage(chatId, 'Қате: Бұл бот тек ата-аналарға арналған.')
          return NextResponse.json({ ok: true })
        }

        // Link parent telegram chat id
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ telegram_chat_id: chatId })
          .eq('id', parentId)

        if (updateError) {
          console.error('Webhook link error:', updateError)
          await sendTelegramMessage(chatId, 'Жүйелік қате: Телеграмды байланыстыру мүмкін болмады.')
        } else {
          await sendTelegramMessage(
            chatId,
            `<b>Сәлем, ${profile.full_name}!</b>\n\nDarynSpace платформасымен байланыс сәтті орнатылды! Енді сіз балаңыздың оқу белсенділігі, алған бағалары мен бейдждері туралы автоматты түрде хабарлама алып отырасыз.`
          )
        }
      } else {
        await sendTelegramMessage(
          chatId,
          'Сәлем! DarynSpace ботына қош келдіңіз. Бұл ботты іске қосу үшін ата-ана парақшасындағы «Телеграмға қосылу» сілтемесі арқылы өтіңіз.'
        )
      }
    } else if (messageText.startsWith('/status')) {
      // Find parent profile and child stats
      const { data: parentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .eq('role', 'parent')
        .maybeSingle()

      if (!parentProfile) {
        await sendTelegramMessage(chatId, 'Сіздің профиліңіз әлі жүйемен байланыстырылмаған. Ата-ана парақшасына өтіп, байланыстыруды орындаңыз.')
        return NextResponse.json({ ok: true })
      }

      // Fetch children
      const { data: children } = await supabase
        .from('profiles')
        .select('full_name, xp, level, creative_score')
        .eq('parent_id', parentProfile.id)

      if (!children || children.length === 0) {
        await sendTelegramMessage(chatId, 'Сізге тіркелген оқушылар табылмады.')
        return NextResponse.json({ ok: true })
      }

      let responseText = '<b>Балаңыздың үлгерім көрсеткіштері:</b>\n\n'
      for (const child of children) {
        responseText += `👤 <b>${child.full_name}</b>\n`
        responseText += `✨ Деңгей: ${child.level || 1}\n`
        responseText += `📈 Тәжірибе (XP): ${child.xp || 0}\n`
        responseText += `💎 Шығармашылық деңгейі (Creative Score): ${Math.round(child.creative_score || 0)}/100\n\n`
      }
      await sendTelegramMessage(chatId, responseText)
    } else if (messageText.startsWith('/help')) {
      const helpText = `<b>DarynSpace көмекші ботының командалары:</b>\n\n` +
        `/status - Балаңыздың ағымдағы үлгерімін көру\n` +
        `/help - Командалар тізімін көрсету`
      await sendTelegramMessage(chatId, helpText)
    } else {
      await sendTelegramMessage(chatId, 'Кешіріңіз, түсінбедім. Қолжетімді командалар тізімін көру үшін /help командасын жіберіңіз.')
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true }) // Return ok to Telegram so it doesn't keep retrying
  }
}
