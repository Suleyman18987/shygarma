'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Users, ClipboardList, Trophy, FolderKanban } from 'lucide-react'

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [stats, setStats] = useState({ students: 0, pending: 0, olympiads: 0, projects: 0 })
  const [pendingSubs, setPendingSubs] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const [s, p, o, pr] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('assignment_submissions').select('id', { count: 'exact', head: true }).is('score', null),
        supabase.from('olympiads').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
      ])
      setStats({ students: s.count || 0, pending: p.count || 0, olympiads: o.count || 0, projects: pr.count || 0 })

      const { data } = await supabase
        .from('assignment_submissions')
        .select('*, profiles!assignment_submissions_student_id_fkey(full_name), assignments!inner(title)')
        .is('score', null)
        .order('submitted_at', { ascending: false })
        .limit(5)
      setPendingSubs(data || [])
    }
    load()
  }, [])

  const cards = [
    { label: 'Оқушылар', value: stats.students, icon: Users, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Тексеру күтуде', value: stats.pending, icon: ClipboardList, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Олимпиадалар', value: stats.olympiads, icon: Trophy, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Жобалар', value: stats.projects, icon: FolderKanban, color: '#7C3AED', bg: '#F5F3FF' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Сәлем, {profile?.full_name || 'Мұғалім'}! 👨‍🏫</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: c.bg }}>
              <c.icon className="w-5 h-5" style={{ color: c.color }} />
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{c.value}</div>
            <div className="text-sm text-[#64748B]">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="font-semibold text-[#0F172A]">Тексеру күтудегі жұмыстар</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-[#64748B]">
              <th className="text-left px-6 py-3 font-medium">Оқушы</th>
              <th className="text-left px-6 py-3 font-medium">Тапсырма</th>
              <th className="text-left px-6 py-3 font-medium">Жіберілген</th>
            </tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {pendingSubs.map((s: any) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-6 py-3 text-[#0F172A]">{s.profiles?.full_name || '—'}</td>
                  <td className="px-6 py-3 text-[#64748B]">{s.assignments?.title || '—'}</td>
                  <td className="px-6 py-3 text-[#64748B]">{new Date(s.submitted_at).toLocaleDateString('kk')}</td>
                </tr>
              ))}
              {pendingSubs.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-[#94A3B8]">Тексеру күтудегі жұмыстар жоқ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
