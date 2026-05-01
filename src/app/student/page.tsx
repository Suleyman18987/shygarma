'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Trophy, ClipboardList, FolderKanban, Zap, Target, Medal } from 'lucide-react'
import Link from 'next/link'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState({ olympiads: 0, assignments: 0, projects: 0 })
  const [upcoming, setUpcoming] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const [o, a, p] = await Promise.all([
        supabase.from('olympiads').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ])
      setStats({ olympiads: o.count || 0, assignments: a.count || 0, projects: p.count || 0 })

      const { data } = await supabase.from('assignments').select('*').gte('deadline', new Date().toISOString()).order('deadline').limit(5)
      setUpcoming(data || [])
    }
    load()
  }, [])

  if (!profile) return null

  const csPercent = Math.min(profile.creative_score, 100)

  return (
    <div>
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-2xl p-6 lg:p-8 mb-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Сәлем, {profile.full_name || 'Оқушы'}! 👋</h1>
        <p className="text-white/70 text-sm">Бүгін жаңа жетістіктерге жетіңіз</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#4F46E5]" />
            </div>
            <span className="text-xs text-[#64748B]">Level {profile.level}</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{profile.xp}</div>
          <div className="text-sm text-[#64748B]">XP балл</div>
          <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full">
            <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-full" style={{ width: `${(profile.xp % 100)}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center mb-3">
            <Target className="w-5 h-5 text-[#7C3AED]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{Math.round(csPercent)}</div>
          <div className="text-sm text-[#64748B]">Creative Score</div>
          <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full">
            <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full" style={{ width: `${csPercent}%` }} />
          </div>
        </div>

        <Link href="/student/olympiads" className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.olympiads}</div>
          <div className="text-sm text-[#64748B]">Олимпиадалар</div>
        </Link>

        <Link href="/student/assignments" className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] flex items-center justify-center mb-3">
            <ClipboardList className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.assignments}</div>
          <div className="text-sm text-[#64748B]">Тапсырмалар</div>
        </Link>
      </div>

      {/* Quick links */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="font-semibold text-[#0F172A]">Жақын дедлайндар</h2>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {upcoming.map(a => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-[#0F172A]">{a.title}</div>
                  <div className="text-xs text-[#64748B]">{a.deadline ? new Date(a.deadline).toLocaleDateString('kk') : 'Дедлайн жоқ'}</div>
                </div>
                <Link href={`/student/assignments`} className="text-xs text-[#4F46E5] font-medium hover:underline">Ашу</Link>
              </div>
            ))}
            {upcoming.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-[#94A3B8]">Жақын дедлайндар жоқ</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4">Жылдам сілтемелер</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Олимпиадалар', href: '/student/olympiads', icon: Trophy, color: '#4F46E5', bg: '#EEF2FF' },
              { label: 'Тапсырмалар', href: '/student/assignments', icon: ClipboardList, color: '#10B981', bg: '#ECFDF5' },
              { label: 'Жобалар', href: '/student/projects', icon: FolderKanban, color: '#7C3AED', bg: '#F5F3FF' },
              { label: 'Рейтинг', href: '/student/leaderboard', icon: Medal, color: '#F59E0B', bg: '#FFFBEB' },
            ].map((l, i) => (
              <Link key={i} href={l.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: l.bg }}>
                  <l.icon className="w-4.5 h-4.5" style={{ color: l.color }} />
                </div>
                <span className="text-sm font-medium text-[#0F172A]">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
