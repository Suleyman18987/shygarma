import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage, sendTelegramPhoto } from '@/lib/telegram'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const mainKeyboard = {
  keyboard: [
    [{ text: "📊 Баланың үлгерімі" }, { text: "📈 Үлгерім графигі" }],
    [{ text: "🏆 Жетістіктер" }, { text: "🔔 Хабарламалар" }],
    [{ text: "❓ Көмек" }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.message) {
      return NextResponse.json({ ok: true })
    }

    const { text, chat } = body.message
    const chatId = chat.id
    const messageText = (text || '').trim()

    // 1. Check if it's a student code link command (DARYN-xxxxxxxx or /start DARYN-xxxxxxxx)
    const codeMatch = messageText.match(/DARYN-([a-f0-9]{8})/i)
    if (codeMatch) {
      const shortId = codeMatch[1].toLowerCase()
      
      // Find student whose ID starts with shortId
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id, full_name, parent_id')
        .eq('role', 'student')
        .like('id', `${shortId}%`)
        .maybeSingle()

      if (studentError || !student) {
        await sendTelegramMessage(chatId, '❌ <b>Қате:</b> Бұл код бойынша оқушы табылмады. Кодты дұрыс енгізгеніңізді тексеріңіз.')
        return NextResponse.json({ ok: true })
      }

      if (!student.parent_id) {
        await sendTelegramMessage(
          chatId, 
          `⚠️ <b>Ескерту:</b> ${student.full_name} оқушысы әлі ешбір ата-ана профиліне байланыстырылмаған.\n\nПлатформада мұғалім немесе админ сізді балаңыздың аккаунтымен байланыстыруы қажет.`
        )
        return NextResponse.json({ ok: true })
      }

      // Link the parent profile (parent_id) to this telegram chat id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: chatId })
        .eq('id', student.parent_id)

      if (updateError) {
        console.error('Webhook link error:', updateError)
        await sendTelegramMessage(chatId, '❌ <b>Жүйелік қате:</b> Байланыстыру кезінде қате орын алды.')
      } else {
        // Fetch parent name to greet
        const { data: parent } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', student.parent_id)
          .single()

        await sendTelegramMessage(
          chatId,
          `<b>✅ Сәтті байланыстырылды!</b>\n\nҚош келдіңіз, <b>${parent?.full_name || 'Ата-ана'}</b>!\n\nЕнді сіз <b>${student.full_name}</b> есімді балаңыздың үлгерімін осы бот арқылы жылдам бақылай аласыз. Төмендегі мәзір батырмаларын пайдаланыңыз:`,
          mainKeyboard
        )
      }
      return NextResponse.json({ ok: true })
    }

    // 2. Handle known commands or menu texts
    if (messageText.startsWith('/start') && !messageText.includes('DARYN-')) {
      await sendTelegramMessage(
        chatId,
        '👋 <b>DarynSpace көмекші ботына қош келдіңіз!</b>\n\nБалаңыздың үлгерімін бақылау үшін ата-ана кабинетінде көрсетілген балаңыздың бірегей кодын (мысалы, <code>DARYN-c89bbafe</code>) осы чатқа жіберіңіз.'
      )
      return NextResponse.json({ ok: true })
    }

    // 3. For any other command or button click, verify that the parent is linked
    const { data: parentProfile, error: parentError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('telegram_chat_id', chatId)
      .eq('role', 'parent')
      .maybeSingle()

    if (parentError || !parentProfile) {
      await sendTelegramMessage(
        chatId,
        '⚠️ <b>Профиль байланыстырылмаған.</b>\n\nАта-ана кабинетінен балаңыздың бірегей кодын алып, осы чатқа жіберіңіз (мысалы: <code>DARYN-c89bbafe</code>).'
      )
      return NextResponse.json({ ok: true })
    }

    // Fetch child profiles linked to this parent
    const { data: children, error: childrenError } = await supabase
      .from('profiles')
      .select('id, full_name, xp, level, creative_score')
      .eq('parent_id', parentProfile.id)
      .eq('role', 'student')

    if (childrenError || !children || children.length === 0) {
      await sendTelegramMessage(
        chatId,
        '👪 <b>Бала тіркелмеген.</b>\n\nЖүйеде сіздің профиліңізге ешбір оқушы байланыстырылмаған. Ата-ана кабинетінде балаңыздың коды көрсетіліп тұрғанына көз жеткізіңіз.',
        mainKeyboard
      )
      return NextResponse.json({ ok: true })
    }

    const child = children[0] // Support first linked child

    // Process button texts
    if (messageText === "📊 Баланың үлгерімі") {
      const textResponse = `👤 <b>Оқушы:</b> ${child.full_name}\n\n` +
        `✨ <b>Деңгей (Level):</b> ${child.level || 1}\n` +
        `📈 <b>Ұпай (XP):</b> ${child.xp || 0}\n` +
        `💎 <b>Шығармашылық деңгейі (Creative Score):</b> ${Math.round(child.creative_score || 0)}/100`
      await sendTelegramMessage(chatId, textResponse, mainKeyboard)

    } else if (messageText === "📈 Үлгерім графигі") {
      // 1. Fetch assignment grades average
      const { data: assignments } = await supabase
        .from('assignment_submissions')
        .select('score')
        .eq('student_id', child.id)
        .not('score', 'is', null)
      const avgAssignments = assignments && assignments.length > 0
        ? (assignments.reduce((acc, curr) => acc + (curr.score || 0), 0) / assignments.length)
        : 0

      // 2. Fetch project grades average
      const { data: projects } = await supabase
        .from('project_submissions')
        .select('total_score')
        .eq('student_id', child.id)
        .not('total_score', 'is', null)
      const avgProjects = projects && projects.length > 0
        ? (projects.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / projects.length)
        : 0

      // 3. Fetch olympiad grades average (Olympiad problem points are out of 10)
      const { data: olympiads } = await supabase
        .from('olympiad_submissions')
        .select('score')
        .eq('student_id', child.id)
      const avgOlympiads = olympiads && olympiads.length > 0
        ? (olympiads.reduce((acc, curr) => acc + (curr.score || 0), 0) / olympiads.length) * 10
        : 0

      // Generate Chart.js configurations for QuickChart
      const chartConfig = {
        type: 'bar',
        data: {
          labels: ['Тапсырмалар', 'Жобалар', 'Олимпиадалар', 'Creative Score'],
          datasets: [{
            label: 'Көрсеткіштер (0-100)',
            backgroundColor: [
              'rgba(79, 70, 229, 0.75)', 
              'rgba(124, 58, 237, 0.75)', 
              'rgba(16, 185, 129, 0.75)', 
              'rgba(245, 158, 11, 0.75)'
            ],
            borderColor: ['#4F46E5', '#7C3AED', '#10B981', '#F59E0B'],
            borderWidth: 2,
            borderRadius: 8,
            data: [
              Math.round(avgAssignments), 
              Math.round(avgProjects), 
              Math.round(avgOlympiads), 
              Math.round(child.creative_score || 0)
            ]
          }]
        },
        options: {
          title: {
            display: true,
            text: `${child.full_name} — оқу үлгерімінің диаграммасы`,
            fontSize: 16,
            fontColor: '#0F172A'
          },
          legend: { display: false },
          scales: {
            yAxes: [{
              ticks: {
                min: 0,
                max: 100,
                stepSize: 20
              }
            }]
          }
        }
      }

      const chartUrl = `https://quickchart.io/chart?w=500&h=300&c=${encodeURIComponent(JSON.stringify(chartConfig))}`
      
      const caption = `📊 <b>${child.full_name}</b> оқушының үлгерім көрсеткіштері.\n\n` +
        `• Үй тапсырмасы орташа: <b>${Math.round(avgAssignments)}%</b>\n` +
        `• Жобалар орташа: <b>${Math.round(avgProjects)}%</b>\n` +
        `• Олимпиадалар орташа: <b>${Math.round(avgOlympiads)}%</b>\n` +
        `• Шығармашылық көрсеткіш (CS): <b>${Math.round(child.creative_score || 0)}/100</b>`

      await sendTelegramPhoto(chatId, chartUrl, caption, mainKeyboard)

    } else if (messageText === "🏆 Жетістіктер") {
      const { data: userBadges, error: badgeErr } = await supabase
        .from('user_badges')
        .select('badges(name, description, icon)')
        .eq('user_id', child.id)

      if (badgeErr || !userBadges || userBadges.length === 0) {
        await sendTelegramMessage(chatId, `🏅 <b>${child.full_name}</b> оқушыда әлі белсенді бейдждер жоқ. Оқуды жалғастыру арқылы бейдждерді иеленуге болады!`, mainKeyboard)
        return NextResponse.json({ ok: true })
      }

      let badgeResponse = `<b>🏆 ${child.full_name} оқушының бейдждері мен жетістіктері:</b>\n\n`
      userBadges.forEach((ub: any) => {
        const b = ub.badges
        if (b) {
          badgeResponse += `${b.icon || '🏅'} <b>${b.name}</b>\n└ <i>${b.description || 'Сипаттамасы жоқ'}</i>\n\n`
        }
      })
      await sendTelegramMessage(chatId, badgeResponse, mainKeyboard)

    } else if (messageText === "🔔 Хабарламалар") {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('message, created_at')
        .eq('profile_id', child.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!notifications || notifications.length === 0) {
        await sendTelegramMessage(chatId, '🔔 Жаңа хабарламалар жоқ.', mainKeyboard)
        return NextResponse.json({ ok: true })
      }

      let notifResponse = `<b>🔔 ${child.full_name} оқушыға қатысты соңғы хабарламалар:</b>\n\n`
      notifications.forEach((n: any) => {
        const date = new Date(n.created_at).toLocaleDateString('kk', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        notifResponse += `• [${date}] ${n.message}\n`
      })
      await sendTelegramMessage(chatId, notifResponse, mainKeyboard)

    } else if (messageText === "❓ Көмек" || messageText.startsWith('/help')) {
      const helpText = `<b>🤖 DarynSpace ата-аналарға көмекші боты:</b>\n\n` +
        `• <b>Баланың үлгерімі</b> батырмасы — балаңыздың тәжірибесі (XP), деңгейі және шығармашылық көрсеткішін (Creative Score) мәтіндік нұсқада көрсетеді.\n` +
        `• <b>Үлгерім графигі</b> батырмасы — үй тапсырмасы, жобалар мен олимпиадалардың пайыздық үлгерімін көрсететін әдемі диаграмманы ұсынады.\n` +
        `• <b>Жетістіктер</b> батырмасы — балаңыз иеленген бейдждер мен олимпиада медальдарын тізіп береді.\n` +
        `• <b>Хабарламалар</b> батырмасы — мұғалімдердің жаңа бағалары мен олимпиада нәтижелерін көрсетеді.\n\n` +
        `Егер профильді қайта байланыстыру керек болса, жай ғана жаңа <code>DARYN-xxxxxxxx</code> кодын осы чатқа жіберіңіз.`
      await sendTelegramMessage(chatId, helpText, mainKeyboard)

    } else {
      await sendTelegramMessage(chatId, '👋 Сәлем! Төмендегі батырмалар арқылы балаңыздың үлгерімін бақылаңыз. Егер көмек керек болса, <b>Көмек</b> батырмасын басыңыз.', mainKeyboard)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
