'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Users, Trophy, ClipboardList, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const [supabase] = useState(() => createClient())
  const [stats, setStats] = useState({ users: 0, olympiads: 0, assignments: 0, submissions: 0 })
  const [recentUsers, setRecentUsers] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const [u, o, a, s] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('olympiads').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
        supabase.from('olympiad_submissions').select('id', { count: 'exact', head: true }),
      ])
      setStats({ users: u.count || 0, olympiads: o.count || 0, assignments: a.count || 0, submissions: s.count || 0 })

      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5)
      setRecentUsers(data || [])
    }
    load()
  }, [])

  const cards = [
    { label: 'Қолданушылар', value: stats.users, icon: Users, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Олимпиадалар', value: stats.olympiads, icon: Trophy, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Тапсырмалар', value: stats.assignments, icon: ClipboardList, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Submissions', value: stats.submissions, icon: TrendingUp, color: '#F59E0B', bg: '#FFFBEB' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Admin Dashboard</h1>

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
          <h2 className="font-semibold text-[#0F172A]">Соңғы қолданушылар</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#64748B]">
                <th className="text-left px-6 py-3 font-medium">Аты</th>
                <th className="text-left px-6 py-3 font-medium">Рөл</th>
                <th className="text-left px-6 py-3 font-medium">XP</th>
                <th className="text-left px-6 py-3 font-medium">Тіркелген</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {recentUsers.map(u => (
                <tr key={u.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-6 py-3 font-medium text-[#0F172A]">{u.full_name || '—'}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-lg bg-[#EEF2FF] text-[#4F46E5] capitalize">{u.role}</span>
                  </td>
                  <td className="px-6 py-3 text-[#64748B]">{u.xp}</td>
                  <td className="px-6 py-3 text-[#64748B]">{new Date(u.created_at).toLocaleDateString('kk')}</td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-[#94A3B8]">Қолданушылар жоқ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
