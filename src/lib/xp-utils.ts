import { checkAndAwardBadges } from './badge-utils'
import { createNotification } from './notification-utils'

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

export function xpForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 100
}

export async function updateUserXP(supabase: any, userId: string, additionalXP: number) {
  // Fetch current profile
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('xp, level')
    .eq('id', userId)
    .single()

  if (fetchError || !profile) {
    console.error('Error fetching profile for XP update:', fetchError)
    return
  }

  const newXP = (profile.xp ?? 0) + additionalXP
  const newLevel = calculateLevel(newXP)
  const oldLevel = profile.level ?? 1

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ xp: newXP, level: newLevel })
    .eq('id', userId)

  if (updateError) {
    console.error('Error updating XP/Level:', updateError)
    return
  }

  // Create XP gain notification
  await createNotification(
    supabase,
    userId,
    'XP алынды!',
    `Сіз +${additionalXP} XP алдыңыз.`
  )

  // If leveled up, notify!
  if (newLevel > oldLevel) {
    await createNotification(
      supabase,
      userId,
      'Жаңа деңгей!',
      `Құттықтаймыз! Сіз ${newLevel}-ші деңгейге көтерілдіңіз!`
    )
  }

  // Check and award badges
  try {
    await checkAndAwardBadges(supabase, userId)
  } catch (err) {
    console.error('Error in checkAndAwardBadges:', err)
  }
}
