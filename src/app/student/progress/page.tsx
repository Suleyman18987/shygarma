'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, Target } from 'lucide-react'

export default function StudentProgressPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [badges, setBadges] = useState<any[]>([])
  const [stats, setStats] = useState({ olympiadSubs: 0, assignmentSubs: 0, projectSubs: 0, correctAnswers: 0 })

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const [ub, os, as2, ps] = await Promise.all([
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', profile.id),
        supabase.from('olympiad_submissions').select('id, is_correct', { count: 'exact' }).eq('student_id', profile.id),
        supabase.from('assignment_submissions').select('id', { count: 'exact' }).eq('student_id', profile.id),
        supabase.from('project_submissions').select('id', { count: 'exact' }).eq('student_id', profile.id),
      ])
      setBadges(ub.data || [])
      const correct = (os.data || []).filter((s: any) => s.is_correct === true).length
      setStats({ olympiadSubs: os.count || 0, assignmentSubs: as2.count || 0, projectSubs: ps.count || 0, correctAnswers: correct })
    }
    load()
  }, [profile])

  if (!profile) return null

  const csPercent = Math.min(profile.creative_score, 100)
  const progressItems = [
    { label: 'Олимпиада жауаптары', value: stats.olympiadSubs, color: '#4F46E5' },
    { label: 'Дұрыс жауаптар', value: stats.correctAnswers, color: '#10B981' },
    { label: 'Тапсырмалар', value: stats.assignmentSubs, color: '#F59E0B' },
    { label: 'Жобалар', value: stats.projectSubs, color: '#7C3AED' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Менің прогресім 📈</h1>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Creative Score */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-[#7C3AED]" /> Creative Score</h2>
          <div className="flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#csGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${csPercent * 2.64} 264`} />
                <defs><linearGradient id="csGrad"><stop stopColor="#4F46E5" /><stop offset="1" stopColor="#7C3AED" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[#0F172A]">{Math.round(csPercent)}</span>
                <span className="text-xs text-[#64748B]">/ 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#4F46E5]" /> Статистика</h2>
          <div className="space-y-4">
            {progressItems.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#64748B]">{p.label}</span>
                  <span className="font-semibold" style={{ color: p.color }}>{p.value}</span>
                </div>
                <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ backgroundColor: p.color, width: `${Math.min(p.value * 10, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* XP & Level */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-6">
        <h2 className="font-semibold text-[#0F172A] mb-3">XP & Level</h2>
        <div className="flex items-center gap-6">
          <div className="text-center"><div className="text-3xl font-bold text-[#4F46E5]">{profile.xp}</div><div className="text-xs text-[#64748B]">Жалпы XP</div></div>
          <div className="text-center"><div className="text-3xl font-bold text-[#0F172A]">{profile.level}</div><div className="text-xs text-[#64748B]">Level</div></div>
          <div className="flex-1">
            <div className="text-xs text-[#64748B] mb-1">Келесі деңгейге: {100 - (profile.xp % 100)} XP</div>
            <div className="h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-full" style={{ width: `${profile.xp % 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <h2 className="font-semibold text-[#0F172A] mb-4">Бейдждер 🏅</h2>
        {badges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {badges.map(ub => (
              <div key={ub.id} className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{ub.badges?.icon || '🏅'}</div>
                <div className="text-sm font-medium text-[#0F172A]">{ub.badges?.name}</div>
                <div className="text-xs text-[#94A3B8]">{ub.badges?.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8] text-center py-4">Әлі бейдждер жоқ. Тапсырмалар орындап жинаңыз!</p>
        )}
      </div>
    </div>
  )
}
