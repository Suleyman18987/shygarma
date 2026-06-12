import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTelegramMessage, sendTelegramPhoto } from '@/lib/telegram'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const mainKeyboard = {
  keyboard: [
    [{ text: "📊 Толық есеп" }, { text: "📈 Үлгерім графигі" }],
    [{ text: "📅 Апталық талдау" }, { text: "📋 Соңғы бағалар" }],
    [{ text: "🏆 Жетістіктер" }, { text: "🔔 Хабарламалар" }],
    [{ text: "❓ Көмек" }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
}

// Helper: get star rating string
function getStarRating(pct: number): string {
  if (pct >= 90) return '⭐⭐⭐⭐⭐ Өте жақсы'
  if (pct >= 75) return '⭐⭐⭐⭐ Жақсы'
  if (pct >= 60) return '⭐⭐⭐ Орташа'
  if (pct >= 40) return '⭐⭐ Жеткіліксіз'
  return '⭐ Нашар'
}

// Helper: trend emoji
function getTrend(current: number, previous: number): string {
  if (previous === 0) return ''
  const diff = current - previous
  if (diff > 5) return ` 📈 +${diff.toFixed(0)}%`
  if (diff < -5) return ` 📉 ${diff.toFixed(0)}%`
  return ` ➡️ тұрақты`
}

// Helper: progress bar
function progressBar(pct: number, width: number = 10): string {
  const filled = Math.round((pct / 100) * width)
  const empty = width - filled
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty))
}

// Helper: letter grade
function letterGrade(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B'
  if (pct >= 60) return 'C'
  if (pct >= 50) return 'D'
  return 'F'
}

// Fetch all grades for a student
async function fetchStudentGrades(studentId: string) {
  const [assignmentsRes, projectsRes, olympiadsRes] = await Promise.all([
    supabase
      .from('assignment_submissions')
      .select('score, submitted_at, feedback, assignments(title, max_score)')
      .eq('student_id', studentId)
      .not('score', 'is', null)
      .order('submitted_at', { ascending: false }),

    supabase
      .from('project_submissions')
      .select('total_score, submitted_at, projects(title)')
      .eq('student_id', studentId)
      .not('total_score', 'is', null)
      .order('submitted_at', { ascending: false }),

    supabase
      .from('olympiad_submissions')
      .select('score, submitted_at, problems(points, olympiads(title))')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
  ])

  let avgAssignments = 0
  const assignments = assignmentsRes.data || []
  if (assignments.length > 0) {
    let totalPct = 0
    assignments.forEach((sub: any) => {
      const maxScore = sub.assignments?.max_score || 100
      totalPct += Math.min(100, ((sub.score || 0) / maxScore) * 100)
    })
    avgAssignments = totalPct / assignments.length
  }

  let avgProjects = 0
  const projects = projectsRes.data || []
  if (projects.length > 0) {
    const sum = projects.reduce((acc: number, curr: any) => acc + (curr.total_score || 0), 0)
    avgProjects = Math.min(100, ((sum / projects.length) / 50) * 100)
  }

  let avgOlympiads = 0
  const olympiads = olympiadsRes.data || []
  if (olympiads.length > 0) {
    let totalScored = 0
    let totalPossible = 0
    olympiads.forEach((sub: any) => {
      const maxPoints = sub.problems?.points ?? 10
      totalScored += sub.score || 0
      totalPossible += maxPoints
    })
    avgOlympiads = totalPossible > 0 ? Math.min(100, (totalScored / totalPossible) * 100) : 0
  }

  return { avgAssignments, avgProjects, avgOlympiads, assignments, projects, olympiads }
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

      // Find all student profiles
      const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('id, full_name, parent_id')
        .eq('role', 'student')

      if (studentError || !students) {
        await sendTelegramMessage(chatId, '❌ <b>Қате:</b> Мәліметтерді алу мүмкін болмады.')
        return NextResponse.json({ ok: true })
      }

      // Find the student matching the shortId
      const student = students.find((s: any) => s.id.startsWith(shortId))

      if (!student) {
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

      // Link the parent profile (parent_id) to this telegram chat id using RPC
      const { error: updateError } = await supabase
        .rpc('link_parent_telegram', { parent_uuid: student.parent_id, chat_id: chatId })

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
          `✅ <b>Сәтті байланыстырылды!</b>\n\nҚош келдіңіз, <b>${parent?.full_name || 'Ата-ана'}</b>!\n\n` +
          `Енді сіз <b>${student.full_name}</b> есімді балаңыздың үлгерімін осы бот арқылы жылдам бақылай аласыз.\n\n` +
          `📌 Төмендегі мәзірден қажетті бөлімді таңдаңыз:`,
          mainKeyboard
        )
      }
      return NextResponse.json({ ok: true })
    }

    // 2. Handle /start without code
    if (messageText.startsWith('/start') && !messageText.includes('DARYN-')) {
      await sendTelegramMessage(
        chatId,
        '👋 <b>DarynSpace ата-аналар ботына қош келдіңіз!</b>\n\n' +
        'Балаңыздың үлгерімін бақылау үшін ата-ана кабинетінде көрсетілген ' +
        'балаңыздың бірегей кодын (мысалы, <code>DARYN-c89bbafe</code>) осы чатқа жіберіңіз.\n\n' +
        '📚 <b>Бот мүмкіндіктері:</b>\n' +
        '• 📊 Толық академиялық есеп\n' +
        '• 📈 Үлгерім диаграммасы\n' +
        '• 📅 Апталық прогресс талдауы\n' +
        '• 📋 Соңғы бағалар тарихы\n' +
        '• 🏆 Жетістіктер мен марапаттар\n' +
        '• 🔔 Жаңа бағалар туралы хабарламалар'
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
        '👪 <b>Бала тіркелмеген.</b>\n\nЖүйеде сіздің профиліңізге ешбір оқушы байланыстырылмаған.',
        mainKeyboard
      )
      return NextResponse.json({ ok: true })
    }

    const child = children[0] // Support first linked child
    const now = new Date()

    // ─────────────────────────────────────────────
    // 📊 ТОЛЫҚ ЕСЕП (Full professional report)
    // ─────────────────────────────────────────────
    if (messageText === "📊 Толық есеп") {
      const { avgAssignments, avgProjects, avgOlympiads, assignments, projects, olympiads } =
        await fetchStudentGrades(child.id)

      const overallAvg = (avgAssignments + avgProjects + avgOlympiads) / 3
      const xpToNextLevel = ((child.level || 1) * 100)

      const report =
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📋 <b>АКАДЕМИЯЛЫҚ ЕСЕП</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 <b>Оқушы:</b> ${child.full_name}\n` +
        `📅 <b>Күні:</b> ${now.toLocaleDateString('kk', { day: '2-digit', month: 'long', year: 'numeric' })}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🎓 <b>ЖАЛПЫ ҮЛГЕРІМ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📊 Жалпы орташа: <b>${Math.round(overallAvg)}%</b>  (${letterGrade(overallAvg)})\n` +
        `${progressBar(overallAvg)} ${Math.round(overallAvg)}%\n` +
        `${getStarRating(overallAvg)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📚 <b>БӨЛІМДЕР БОЙЫНША</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `📝 <b>Үй тапсырмалары</b>\n` +
        `   ${progressBar(avgAssignments)}  ${Math.round(avgAssignments)}%  (${letterGrade(avgAssignments)})\n` +
        `   Барлығы: ${assignments.length} тапсырма орындалды\n\n` +
        `🏗️ <b>Жобалар</b>\n` +
        `   ${progressBar(avgProjects)}  ${Math.round(avgProjects)}%  (${letterGrade(avgProjects)})\n` +
        `   Барлығы: ${projects.length} жоба қорғалды\n\n` +
        `🏅 <b>Олимпиадалар</b>\n` +
        `   ${progressBar(avgOlympiads)}  ${Math.round(avgOlympiads)}%  (${letterGrade(avgOlympiads)})\n` +
        `   Барлығы: ${olympiads.length} есеп шығарылды\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <b>ОЙЫН СТАТИСТИКАСЫ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎮 Деңгей: <b>${child.level || 1}</b>\n` +
        `✨ Тәжірибе: <b>${child.xp || 0} XP</b>\n` +
        `💡 Шығармашылық: <b>${Math.round(child.creative_score || 0)}/100</b>\n` +
        `${progressBar(child.creative_score || 0)} ${Math.round(child.creative_score || 0)}%\n\n` +
        `<i>💬 Ескерту: Барлық үлгерім деректері нақты уақытта жаңартылады.</i>`

      await sendTelegramMessage(chatId, report, mainKeyboard)
    }

    // ─────────────────────────────────────────────
    // 📈 ҮЛГЕРІМ ГРАФИГІ (Progress chart)
    // ─────────────────────────────────────────────
    else if (messageText === "📈 Үлгерім графигі") {
      const { avgAssignments, avgProjects, avgOlympiads } = await fetchStudentGrades(child.id)

      // Generate a high-quality bar chart
      const chartConfig = {
        type: 'bar',
        data: {
          labels: ['Үй тапсырмасы', 'Жобалар', 'Олимпиадалар', 'Шығармашылық'],
          datasets: [{
            label: 'Үлгерім (%)',
            backgroundColor: [
              'rgba(79, 70, 229, 0.85)',
              'rgba(124, 58, 237, 0.85)',
              'rgba(16, 185, 129, 0.85)',
              'rgba(245, 158, 11, 0.85)'
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
            text: `${child.full_name} — Үлгерім диаграммасы`,
            fontSize: 18,
            fontColor: '#0F172A',
            fontStyle: 'bold',
            padding: 20
          },
          legend: { display: false },
          scales: {
            yAxes: [{
              ticks: { min: 0, max: 100, stepSize: 20, fontColor: '#64748B', fontSize: 13 },
              gridLines: { color: 'rgba(0,0,0,0.05)' }
            }],
            xAxes: [{ ticks: { fontColor: '#64748B', fontSize: 13 }, gridLines: { display: false } }]
          },
          plugins: {
            datalabels: {
              anchor: 'end', align: 'top',
              font: { weight: 'bold', size: 14 },
              color: '#0F172A',
              formatter: (value: number) => value + '%'
            }
          }
        }
      }

      const chartUrl = `https://quickchart.io/chart?w=600&h=350&c=${encodeURIComponent(JSON.stringify(chartConfig))}&b=${Date.now()}`

      const caption =
        `📊 <b>${child.full_name}</b> оқушының үлгерім диаграммасы\n` +
        `📅 ${now.toLocaleDateString('kk', { day: '2-digit', month: 'long', year: 'numeric' })}\n\n` +
        `📝 Үй тапсырмасы: <b>${Math.round(avgAssignments)}%</b>  ${letterGrade(avgAssignments)}\n` +
        `🏗️ Жобалар: <b>${Math.round(avgProjects)}%</b>  ${letterGrade(avgProjects)}\n` +
        `🏅 Олимпиадалар: <b>${Math.round(avgOlympiads)}%</b>  ${letterGrade(avgOlympiads)}\n` +
        `💡 Шығармашылық: <b>${Math.round(child.creative_score || 0)}/100</b>`

      await sendTelegramPhoto(chatId, chartUrl, caption, mainKeyboard)
    }

    // ─────────────────────────────────────────────
    // 📅 АПТАЛЫҚ ТАЛДАУ (Weekly analysis)
    // ─────────────────────────────────────────────
    else if (messageText === "📅 Апталық талдау") {
      // This week: last 7 days
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString()

      // Two weeks ago (for comparison)
      const twoWeeksAgo = new Date(now)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const twoWeeksAgoStr = twoWeeksAgo.toISOString()

      const [thisWeekAssign, prevWeekAssign, thisWeekProj, prevWeekProj] = await Promise.all([
        supabase.from('assignment_submissions')
          .select('score, submitted_at, assignments(title, max_score)')
          .eq('student_id', child.id).not('score', 'is', null)
          .gte('submitted_at', weekAgoStr),
        supabase.from('assignment_submissions')
          .select('score, assignments(max_score)')
          .eq('student_id', child.id).not('score', 'is', null)
          .gte('submitted_at', twoWeeksAgoStr).lt('submitted_at', weekAgoStr),
        supabase.from('project_submissions')
          .select('total_score, projects(title)')
          .eq('student_id', child.id).not('total_score', 'is', null)
          .gte('submitted_at', weekAgoStr),
        supabase.from('project_submissions')
          .select('total_score').eq('student_id', child.id).not('total_score', 'is', null)
          .gte('submitted_at', twoWeeksAgoStr).lt('submitted_at', weekAgoStr),
      ])

      const calcAvgA = (data: any[]) => {
        if (!data || data.length === 0) return 0
        let t = 0; data.forEach((s: any) => { t += Math.min(100, ((s.score || 0) / (s.assignments?.max_score || 100)) * 100) }); return t / data.length
      }
      const calcAvgP = (data: any[]) => {
        if (!data || data.length === 0) return 0
        const s = data.reduce((a: number, c: any) => a + (c.total_score || 0), 0); return Math.min(100, ((s / data.length) / 50) * 100)
      }

      const thisWeekAvgA = calcAvgA(thisWeekAssign.data || [])
      const prevWeekAvgA = calcAvgA(prevWeekAssign.data || [])
      const thisWeekAvgP = calcAvgP(thisWeekProj.data || [])
      const prevWeekAvgP = calcAvgP(prevWeekProj.data || [])

      const weekFrom = weekAgo.toLocaleDateString('kk', { day: '2-digit', month: 'long' })
      const weekTo = now.toLocaleDateString('kk', { day: '2-digit', month: 'long' })

      let weekReport =
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📅 <b>АПТАЛЫҚ ПРОГРЕСС ТАЛДАУЫ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 <b>${child.full_name}</b>\n` +
        `📆 Кезең: ${weekFrom} – ${weekTo}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📝 <b>ҮЙ ТАПСЫРМАЛАРЫ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n`

      const thisWeekAssignData = thisWeekAssign.data || []
      if (thisWeekAssignData.length === 0) {
        weekReport += `\n   ⚠️ Осы аптада тапсырылған жұмыстар жоқ.\n`
      } else {
        weekReport += `\n   Орындалды: <b>${thisWeekAssignData.length} тапсырма</b>\n`
        weekReport += `   Орташа балл: <b>${Math.round(thisWeekAvgA)}%</b>${getTrend(thisWeekAvgA, prevWeekAvgA)}\n`
        weekReport += `   ${progressBar(thisWeekAvgA)}\n\n`
        // List assignments
        thisWeekAssignData.slice(0, 3).forEach((s: any) => {
          const title = s.assignments?.title || 'Тапсырма'
          const maxScore = s.assignments?.max_score || 100
          const pct = Math.round(Math.min(100, ((s.score || 0) / maxScore) * 100))
          const date = new Date(s.submitted_at).toLocaleDateString('kk', { day: '2-digit', month: '2-digit' })
          weekReport += `   • <i>${title.substring(0, 25)}</i> → <b>${s.score}/${maxScore}</b> (${pct}%) [${date}]\n`
        })
      }

      const thisWeekProjData = thisWeekProj.data || []
      weekReport += `\n━━━━━━━━━━━━━━━━━━━\n🏗️ <b>ЖОБАЛАР</b>\n━━━━━━━━━━━━━━━━━━━\n`
      if (thisWeekProjData.length === 0) {
        weekReport += `\n   ⚠️ Осы аптада қорғалған жобалар жоқ.\n`
      } else {
        weekReport += `\n   Қорғалды: <b>${thisWeekProjData.length} жоба</b>\n`
        weekReport += `   Орташа балл: <b>${Math.round(thisWeekAvgP)}%</b>${getTrend(thisWeekAvgP, prevWeekAvgP)}\n`
        weekReport += `   ${progressBar(thisWeekAvgP)}\n\n`
        thisWeekProjData.slice(0, 3).forEach((s: any) => {
          const title = s.projects?.title || 'Жоба'
          const pct = Math.round(Math.min(100, ((s.total_score || 0) / 50) * 100))
          weekReport += `   • <i>${title.substring(0, 25)}</i> → <b>${s.total_score}/50</b> (${pct}%)\n`
        })
      }

      // Summary verdict
      const totalThis = (thisWeekAvgA + thisWeekAvgP) / 2
      weekReport += `\n━━━━━━━━━━━━━━━━━━━\n📌 <b>АПТАЛЫҚ ҚОРЫТЫНДЫ</b>\n━━━━━━━━━━━━━━━━━━━\n\n`
      if (totalThis >= 80) {
        weekReport += `🌟 Тамаша апта! Балаңыз керемет нәтиже көрсетті.\nОсы қарқынды сақтауды жалғастырыңыз!\n`
      } else if (totalThis >= 60) {
        weekReport += `👍 Жақсы апта. Балаңыздың үлгерімі қанағаттанарлық.\nАздап жігер қосу арқылы одан да жоғары нәтижеге жетуге болады!\n`
      } else if (totalThis > 0) {
        weekReport += `⚠️ Осы аптада жақсарту қажет. Мұғалімімен бірге қосымша жаттығу жасауға кеңес береміз.\n`
      } else {
        weekReport += `📭 Осы аптада белсенділік байқалмады. Балаңызбен сөйлесіп, себебін анықтаңыз.\n`
      }

      await sendTelegramMessage(chatId, weekReport, mainKeyboard)
    }

    // ─────────────────────────────────────────────
    // 📋 СОҢҒЫ БАҒАЛАР (Recent grades history)
    // ─────────────────────────────────────────────
    else if (messageText === "📋 Соңғы бағалар") {
      const [assignRes, projRes, olympRes] = await Promise.all([
        supabase.from('assignment_submissions')
          .select('score, submitted_at, feedback, assignments(title, max_score)')
          .eq('student_id', child.id).not('score', 'is', null)
          .order('submitted_at', { ascending: false }).limit(5),
        supabase.from('project_submissions')
          .select('total_score, submitted_at, projects(title)')
          .eq('student_id', child.id).not('total_score', 'is', null)
          .order('submitted_at', { ascending: false }).limit(3),
        supabase.from('olympiad_submissions')
          .select('score, submitted_at, problems(points, olympiads(title))')
          .eq('student_id', child.id)
          .order('submitted_at', { ascending: false }).limit(3)
      ])

      let gradesMsg =
        `━━━━━━━━━━━━━━━━━━━\n` +
        `📋 <b>СОҢҒЫ БАҒАЛАР ТАРИХЫ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>${child.full_name}</b>\n\n`

      // Assignments
      const assigns = assignRes.data || []
      gradesMsg += `📝 <b>Үй тапсырмалары (соңғы 5):</b>\n`
      if (assigns.length === 0) {
        gradesMsg += `   Бағаланған тапсырмалар жоқ.\n`
      } else {
        assigns.forEach((s: any) => {
          const title = s.assignments?.title || 'Тапсырма'
          const maxScore = s.assignments?.max_score || 100
          const pct = Math.round(Math.min(100, ((s.score || 0) / maxScore) * 100))
          const grade = letterGrade(pct)
          const date = new Date(s.submitted_at).toLocaleDateString('kk', { day: '2-digit', month: '2-digit' })
          const emoji = pct >= 80 ? '✅' : pct >= 60 ? '🟡' : '🔴'
          gradesMsg += `${emoji} <b>${s.score}/${maxScore}</b> (${pct}% · ${grade}) — <i>${title.substring(0, 20)}</i> [${date}]\n`
          if (s.feedback) {
            gradesMsg += `   💬 <i>"${s.feedback.substring(0, 60)}${s.feedback.length > 60 ? '...' : ''}"</i>\n`
          }
        })
      }

      // Projects
      const projs = projRes.data || []
      gradesMsg += `\n🏗️ <b>Жобалар (соңғы 3):</b>\n`
      if (projs.length === 0) {
        gradesMsg += `   Бағаланған жобалар жоқ.\n`
      } else {
        projs.forEach((s: any) => {
          const title = s.projects?.title || 'Жоба'
          const pct = Math.round(Math.min(100, ((s.total_score || 0) / 50) * 100))
          const grade = letterGrade(pct)
          const date = new Date(s.submitted_at).toLocaleDateString('kk', { day: '2-digit', month: '2-digit' })
          const emoji = pct >= 80 ? '✅' : pct >= 60 ? '🟡' : '🔴'
          gradesMsg += `${emoji} <b>${s.total_score}/50</b> (${pct}% · ${grade}) — <i>${title.substring(0, 20)}</i> [${date}]\n`
        })
      }

      // Olympiads
      const olymps = olympRes.data || []
      gradesMsg += `\n🏅 <b>Олимпиадалар (соңғы 3):</b>\n`
      if (olymps.length === 0) {
        gradesMsg += `   Олимпиада нәтижелері жоқ.\n`
      } else {
        olymps.forEach((s: any) => {
          const title = s.problems?.olympiads?.title || 'Олимпиада'
          const maxPoints = s.problems?.points ?? 10
          const pct = maxPoints > 0 ? Math.round(Math.min(100, ((s.score || 0) / maxPoints) * 100)) : 0
          const grade = letterGrade(pct)
          const date = new Date(s.submitted_at).toLocaleDateString('kk', { day: '2-digit', month: '2-digit' })
          const emoji = pct >= 80 ? '✅' : pct >= 60 ? '🟡' : '🔴'
          gradesMsg += `${emoji} <b>${s.score}/${maxPoints}</b> (${pct}% · ${grade}) — <i>${title.substring(0, 20)}</i> [${date}]\n`
        })
      }

      gradesMsg += `\n<i>✅ = Өте жақсы (80%+) · 🟡 = Орташа (60-79%) · 🔴 = Нашар (&lt;60%)</i>`
      await sendTelegramMessage(chatId, gradesMsg, mainKeyboard)
    }

    // ─────────────────────────────────────────────
    // 🏆 ЖЕТІСТІКТЕР (Achievements)
    // ─────────────────────────────────────────────
    else if (messageText === "🏆 Жетістіктер") {
      const { data: userBadges, error: badgeErr } = await supabase
        .from('user_badges')
        .select('badges(name, description, icon), earned_at')
        .eq('user_id', child.id)
        .order('earned_at', { ascending: false })

      let badgeResponse =
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🏆 <b>ЖЕТІСТІКТЕР МЕН МАРАПАТТАР</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>${child.full_name}</b>\n` +
        `🎮 Деңгей: <b>${child.level || 1}</b>  |  ✨ XP: <b>${child.xp || 0}</b>\n\n`

      if (badgeErr || !userBadges || userBadges.length === 0) {
        badgeResponse += `🎯 <b>Бейдждер (0):</b>\nҺеч бейдж жоқ әлі. Тапсырмаларды орындап, жетістіктерге жету!\n\n` +
          `<i>💡 Кеңес: Алғашқы бейджді алу үшін бір тапсырма тапсырып, жақсы баға алыңыз!</i>`
      } else {
        badgeResponse += `🎖️ <b>Бейдждер (${userBadges.length} дана):</b>\n\n`
        userBadges.forEach((ub: any) => {
          const b = ub.badges
          if (b) {
            const earnedDate = ub.earned_at
              ? new Date(ub.earned_at).toLocaleDateString('kk', { day: '2-digit', month: 'long', year: 'numeric' })
              : ''
            badgeResponse += `${b.icon || '🏅'} <b>${b.name}</b>\n`
            badgeResponse += `   └ <i>${b.description || 'Сипаттамасы жоқ'}</i>\n`
            if (earnedDate) badgeResponse += `   └ 📅 Алынды: ${earnedDate}\n`
            badgeResponse += `\n`
          }
        })
      }

      await sendTelegramMessage(chatId, badgeResponse, mainKeyboard)
    }

    // ─────────────────────────────────────────────
    // 🔔 ХАБАРЛАМАЛАР (Notifications)
    // ─────────────────────────────────────────────
    else if (messageText === "🔔 Хабарламалар") {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('message, created_at')
        .eq('profile_id', child.id)
        .order('created_at', { ascending: false })
        .limit(10)

      let notifResponse =
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🔔 <b>ХАБАРЛАМАЛАР</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>${child.full_name}</b>\n\n`

      if (!notifications || notifications.length === 0) {
        notifResponse += `📭 Жаңа хабарламалар жоқ.`
      } else {
        notifResponse += `Соңғы ${notifications.length} хабарлама:\n\n`
        notifications.forEach((n: any, idx: number) => {
          const date = new Date(n.created_at).toLocaleDateString('kk', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          })
          notifResponse += `${idx + 1}. [${date}]\n   ${n.message}\n\n`
        })
      }
      await sendTelegramMessage(chatId, notifResponse, mainKeyboard)
    }

    // ─────────────────────────────────────────────
    // ❓ КӨМЕК (Help)
    // ─────────────────────────────────────────────
    else if (messageText === "❓ Көмек" || messageText.startsWith('/help')) {
      const helpText =
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 <b>DarynSpace — АТА-АНАЛАР БОТЫ</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `Мәзір батырмаларының сипаттамасы:\n\n` +
        `📊 <b>Толық есеп</b>\n` +
        `   └ Балаңыздың толық академиялық есебін, бөлімдер бойынша үлгерімін, XP мен деңгейін көрсетеді.\n\n` +
        `📈 <b>Үлгерім графигі</b>\n` +
        `   └ Барлық пәндер бойынша үлгерімді көрсететін диаграмма.\n\n` +
        `📅 <b>Апталық талдау</b>\n` +
        `   └ Осы аптадағы белсенділік пен алдыңғы аптамен салыстырма.\n\n` +
        `📋 <b>Соңғы бағалар</b>\n` +
        `   └ Соңғы 5 тапсырма бағасы, мұғалім пікірімен.\n\n` +
        `🏆 <b>Жетістіктер</b>\n` +
        `   └ Балаңыздың бейдждері, деңгейі мен XP жетістіктері.\n\n` +
        `🔔 <b>Хабарламалар</b>\n` +
        `   └ Мұғалімдердің бағалары мен ескертулері.\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🔗 <b>Байланыстыру</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        `Балаңыздың профилін қайта байланыстыру үшін жаңа кодты жіберіңіз:\n<code>DARYN-xxxxxxxx</code>\n\n` +
        `<i>⚙️ DarynSpace платформасы · Барлық деректер қорғалған</i>`
      await sendTelegramMessage(chatId, helpText, mainKeyboard)
    }

    else {
      await sendTelegramMessage(
        chatId,
        `👋 Сәлем, <b>${parentProfile.full_name}</b>!\n\nТөмендегі мәзірден қажетті бөлімді таңдаңыз.`,
        mainKeyboard
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
