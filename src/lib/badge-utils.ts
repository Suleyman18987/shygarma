import { createNotification } from './notification-utils'

const SYSTEM_BADGES = [
  { name: 'Бірінші қадам', icon: '🏅', description: 'Алғашқы тапсырманы орындау' },
  { name: 'Олимпиадашы', icon: '🌟', description: '3 және одан да көп олимпиадаға қатысу' },
  { name: 'Жоба жұлдызы', icon: '🏆', description: 'Жобадан 40 және одан да жоғары балл алу' },
  { name: 'Шығармашыл', icon: '💎', description: 'Creative Score 80-нен жоғары болуы' },
  { name: 'ТОП-10', icon: '👑', description: 'Платформадағы ең үздік 10 оқушының қатарына кіру' },
]

export async function checkAndAwardBadges(supabase: any, userId: string) {
  // 1. Ensure badges exist in database
  for (const badgeInfo of SYSTEM_BADGES) {
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('id')
      .eq('name', badgeInfo.name)
      .maybeSingle()

    if (!existingBadge) {
      await supabase.from('badges').insert(badgeInfo)
    }
  }

  // Fetch all badges from DB
  const { data: dbBadges } = await supabase
    .from('badges')
    .select('*')

  if (!dbBadges) return

  // Fetch user's current badges
  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)

  const ownedBadgeIds = new Set(userBadges?.map((ub: any) => ub.badge_id) || [])

  // Helper to award a badge
  const awardBadge = async (badgeName: string) => {
    const badge = dbBadges.find((b: any) => b.name === badgeName)
    if (badge && !ownedBadgeIds.has(badge.id)) {
      const { error: insertError } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badge.id,
        })

      if (!insertError) {
        await createNotification(
          supabase,
          userId,
          `Жаңа бейдж: ${badge.icon} ${badge.name}!`,
          `Құттықтаймыз! Сіз жаңа бейдж алдыңыз: ${badge.description}.`
        )
      }
    }
  }

  // --- CHECK CONDITIONS ---

  // Condition 1: 'Бірінші қадам' (first assignment submission)
  const { count: assignmentCount } = await supabase
    .from('assignment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', userId)

  if (assignmentCount && assignmentCount >= 1) {
    await awardBadge('Бірінші қадам')
  }

  // Condition 2: 'Олимпиадашы' (3+ olympiad submissions)
  // We need to count distinct olympiad submissions. We can group by problem_id or check problem -> olympiad relation.
  // Wait, let's query the submissions and check.
  const { data: submissions } = await supabase
    .from('olympiad_submissions')
    .select('problem_id')
    .eq('student_id', userId)

  if (submissions && submissions.length > 0) {
    // Get distinct olympiad IDs
    const problemIds = submissions.map((s: any) => s.problem_id)
    const { data: problems } = await supabase
      .from('problems')
      .select('olympiad_id')
      .in('id', problemIds)

    const olympiadIds = new Set(problems?.map((p: any) => p.olympiad_id) || [])
    if (olympiadIds.size >= 3) {
      await awardBadge('Олимпиадашы')
    }
  }

  // Condition 3: 'Жоба жұлдызы' (project score >= 40)
  const { data: projectSubmissions } = await supabase
    .from('project_submissions')
    .select('total_score')
    .eq('student_id', userId)

  const maxProjectScore = Math.max(0, ...(projectSubmissions?.map((p: any) => p.total_score ?? 0) || []))
  if (maxProjectScore >= 40) {
    await awardBadge('Жоба жұлдызы')
  }

  // Condition 4: 'Шығармашыл' (creative_score >= 80)
  const { data: profile } = await supabase
    .from('profiles')
    .select('creative_score')
    .eq('id', userId)
    .single()

  if (profile && profile.creative_score >= 80) {
    await awardBadge('Шығармашыл')
  }

  // Condition 5: 'ТОП-10' (in top 10 by XP)
  const { data: topStudents } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .order('xp', { ascending: false })
    .limit(10)

  const isTop10 = topStudents?.some((s: any) => s.id === userId)
  if (isTop10) {
    await awardBadge('ТОП-10')
  }
}
