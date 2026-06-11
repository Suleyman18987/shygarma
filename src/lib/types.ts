export type UserRole = 'admin' | 'teacher' | 'student' | 'parent'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  xp: number
  level: number
  creative_score: number
  parent_id: string | null
  telegram_chat_id?: number | null
  created_at: string
}

export interface Olympiad {
  id: string
  title: string
  description: string | null
  created_by: string | null
  start_time: string | null
  end_time: string | null
  status: 'draft' | 'active' | 'finished'
  created_at: string
}

export interface Problem {
  id: string
  olympiad_id: string
  title: string
  description: string | null
  type: 'test' | 'short_answer' | 'creative' | 'code'
  points: number
  options: { text: string; correct: boolean }[] | null
  correct_answer: string | null
  order_index: number
}

export interface OlympiadSubmission {
  id: string
  problem_id: string
  student_id: string
  answer: string | null
  file_url: string | null
  score: number
  is_correct: boolean | null
  submitted_at: string
}

export interface Assignment {
  id: string
  title: string
  description: string | null
  created_by: string | null
  deadline: string | null
  max_score: number
  created_at: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  content: string | null
  file_url: string | null
  score: number | null
  feedback: string | null
  graded_by: string | null
  submitted_at: string
  graded_at: string | null
}

export interface Project {
  id: string
  title: string
  description: string | null
  requirements: string | null
  created_by: string | null
  deadline: string | null
  criteria: { name: string; max: number }[]
  status: 'active' | 'finished'
  created_at: string
}

export interface ProjectSubmission {
  id: string
  project_id: string
  student_id: string
  team_name: string | null
  description: string | null
  file_url: string | null
  link_url: string | null
  scores: Record<string, number> | null
  total_score: number | null
  feedback: string | null
  graded_by: string | null
  submitted_at: string
}

export interface Badge {
  id: string
  name: string
  description: string | null
  icon: string
  criteria: string | null
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string | null
  is_read: boolean
  created_at: string
}
