import { sendTelegramMessage } from './telegram'

export async function createNotification(
  supabase: any,
  userId: string,
  title: string,
  message: string
) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      is_read: false,
    })

  if (error) {
    console.error('Error creating notification:', error)
  }
}

export async function notifyStudentsOfNewAssignment(supabase: any, assignmentTitle: string) {
  // Fetch all students
  const { data: students, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')

  if (error || !students) {
    console.error('Error fetching students for notification:', error)
    return
  }

  const notifications = students.map((student: any) => ({
    user_id: student.id,
    title: 'Жаңа тапсырма!',
    message: `«${assignmentTitle}» атты жаңа тапсырма жарияланды.`,
    is_read: false,
  }))

  if (notifications.length > 0) {
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      console.error('Error inserting notifications for students:', insertError)
    }
  }
}

export async function notifyGraded(
  supabase: any,
  studentId: string,
  itemTitle: string,
  score: number
) {
  // Notify student
  await createNotification(
    supabase,
    studentId,
    'Тапсырма бағаланды',
    `«${itemTitle}» тапсырмаңыз бағаланды. Балл: ${score}`
  )

  // Notify parent if linked
  const { data: profile } = await supabase
    .from('profiles')
    .select('parent_id, full_name')
    .eq('id', studentId)
    .single()

  if (profile?.parent_id) {
    await createNotification(
      supabase,
      profile.parent_id,
      'Балаңыздың тапсырмасы бағаланды',
      `Балаңыз ${profile.full_name} «${itemTitle}» тапсырмасынан ${score} балл алды.`
    )

    // Notify parent via Telegram if chat ID exists
    const { data: parent } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', profile.parent_id)
      .single()

    if (parent?.telegram_chat_id) {
      const tgMessage = `🔔 <b>Балаңыздың тапсырмасы бағаланды!</b>\n\n👤 Оқушы: ${profile.full_name}\n📝 Тапсырма: «${itemTitle}»\n✅ Балл: <b>${score}</b>`
      await sendTelegramMessage(parent.telegram_chat_id, tgMessage)
    }
  }
}
