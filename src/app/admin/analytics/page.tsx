'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BarChart3, PieChart } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const [supabase] = useState(() => createClient())
  const [stats, setStats] = useState({ byRole: [] as any[], totalXP: 0, avgCS: 0 })

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase.from('profiles').select('role, xp, creative_score')
      if (!profiles) return
      const roles = ['admin', 'teacher', 'student', 'parent']
      const byRole = roles.map(r => ({ role: r, count: profiles.filter(p => p.role === r).length }))
      const students = profiles.filter(p => p.role === 'student')
      const totalXP = students.reduce((a, s) => a + s.xp, 0)
      const avgCS = students.length ? students.reduce((a, s) => a + Number(s.creative_score), 0) / students.length : 0
      setStats({ byRole, totalXP, avgCS })
    }
    load()
  }, [])

  const roleLabels: Record<string, string> = { admin: 'Админ', teacher: 'Мұғалім', student: 'Оқушы', parent: 'Ата-ана' }
  const roleColors: Record<string, string> = { admin: '#EF4444', teacher: '#3B82F6', student: '#10B981', parent: '#7C3AED' }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Аналитика 📊</h1>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="text-sm text-[#64748B] mb-1">Жалпы XP</div>
          <div className="text-3xl font-bold text-[#4F46E5]">{stats.totalXP}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="text-sm text-[#64748B] mb-1">Орташа Creative Score</div>
          <div className="text-3xl font-bold text-[#7C3AED]">{Math.round(stats.avgCS)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
          <div className="text-sm text-[#64748B] mb-1">Барлық қолданушылар</div>
          <div className="text-3xl font-bold text-[#0F172A]">{stats.byRole.reduce((a, r) => a + r.count, 0)}</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <h2 className="font-semibold text-[#0F172A] mb-4">Рөл бойынша бөліну</h2>
        <div className="space-y-3">
          {stats.byRole.map(r => (
            <div key={r.role}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#64748B]">{roleLabels[r.role]}</span>
                <span className="font-semibold" style={{ color: roleColors[r.role] }}>{r.count}</span>
              </div>
              <div className="h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ backgroundColor: roleColors[r.role], width: `${Math.max(r.count * 10, 5)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
