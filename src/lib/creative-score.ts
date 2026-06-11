export async function calculateCreativeScore(supabase: any, userId: string): Promise<number> {
  try {
    // 1. Fetch Olympiad average score percentage
    // olympiad_submissions have: score (number), problem_id
    // problems have: points (number)
    const { data: olympiadSubmissions, error: oError } = await supabase
      .from('olympiad_submissions')
      .select('score, problem_id')
      .eq('student_id', userId)

    let olympiadAvg = 0
    if (olympiadSubmissions && olympiadSubmissions.length > 0) {
      const problemIds = olympiadSubmissions.map((s: any) => s.problem_id)
      const { data: problems } = await supabase
        .from('problems')
        .select('id, points')
        .in('id', problemIds)

      if (problems && problems.length > 0) {
        let totalScored = 0
        let totalPossible = 0
        for (const sub of olympiadSubmissions) {
          const prob = problems.find((p: any) => p.id === sub.problem_id)
          const maxPoints = prob?.points ?? 10
          totalScored += sub.score ?? 0
          totalPossible += maxPoints
        }
        olympiadAvg = totalPossible > 0 ? (totalScored / totalPossible) : 0
      }
    }

    // 2. Fetch Project average score percentage (out of 50 max score)
    const { data: projectSubmissions, error: pError } = await supabase
      .from('project_submissions')
      .select('total_score')
      .eq('student_id', userId)

    let projectAvg = 0
    if (projectSubmissions && projectSubmissions.length > 0) {
      const validSubmissions = projectSubmissions.filter((s: any) => s.total_score !== null)
      if (validSubmissions.length > 0) {
        const sum = validSubmissions.reduce((acc: number, s: any) => acc + (s.total_score ?? 0), 0)
        // Average score out of 50
        projectAvg = (sum / validSubmissions.length) / 50
      }
    }

    // 3. Fetch Assignment Submissions count (Activity metric)
    const { count: assignmentSubCount, error: aError } = await supabase
      .from('assignment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)

    const submissionCount = assignmentSubCount ?? 0
    // Activity score: capped at 1.0 (reaches 1.0 at 10 assignments submitted)
    const activityScore = Math.min(1.0, submissionCount / 10)

    // 4. Fetch User Level for Progress Bonus
    const { data: profileData } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', userId)
      .single()

    const level = profileData?.level ?? 1
    // Progress bonus: capped at 1.0 (reaches 1.0 at level 10)
    const progressBonus = Math.min(1.0, level / 10)

    // 5. Calculate Creative Score (CS)
    // Formula: CS = (olympiadAvg * 0.3 + projectAvg * 0.4 + activityScore * 0.2 + progressBonus * 0.1) * 100
    const rawCS = (olympiadAvg * 0.3 + projectAvg * 0.4 + activityScore * 0.2 + progressBonus * 0.1) * 100
    const creativeScore = Math.min(100, Math.max(0, Math.round(rawCS)))

    // 6. Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ creative_score: creativeScore })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating creative_score in profiles:', updateError)
    }

    return creativeScore
  } catch (error) {
    console.error('Error in calculateCreativeScore:', error)
    return 0
  }
}
