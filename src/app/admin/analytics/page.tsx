'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BarChart3, Users, Award, TrendingUp } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts'

export default function AdminAnalyticsPage() {
  const [supabase] = useState(() => createClient())
  const [stats, setStats] = useState({ byRole: [] as any[], totalXP: 0, avgCS: 0 })
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const load = async () => {
      const { data: profiles } = await supabase.from('profiles').select('role, xp, creative_score')
      if (!profiles) return
      const roles = ['admin', 'teacher', 'student', 'parent']
      const byRole = roles.map(r => ({ role: r, count: profiles.filter(p => p.role === r).length }))
      const students = profiles.filter(p => p.role === 'student')
      const totalXP = students.reduce((a, s) => a + (s.xp || 0), 0)
      const avgCS = students.length ? students.reduce((a, s) => a + Number(s.creative_score || 0), 0) / students.length : 0
      setStats({ byRole, totalXP, avgCS })
    }
    load()
  }, [])

  const roleLabels: Record<string, string> = { admin: 'Админ', teacher: 'Мұғалім', student: 'Оқушы', parent: 'Ата-ана' }
  const roleColors: Record<string, string> = { admin: '#EF4444', teacher: '#3B82F6', student: '#10B981', parent: '#7C3AED' }

  const chartData = stats.byRole.map(r => ({
    name: roleLabels[r.role] || r.role,
    count: r.count,
    color: roleColors[r.role] || '#CBD5E1'
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-[#EEF2FF] rounded-xl text-[#4F46E5]">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Платформа Аналитикасы 📊</h1>
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#64748B]">Жалпы оқушылар XP</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-extrabold text-[#4F46E5]">{stats.totalXP}</div>
        </div>
        
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#64748B]">Орташа Creative Score</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Award className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-extrabold text-[#7C3AED]">{Math.round(stats.avgCS)}</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#64748B]">Пайдаланушылар саны</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-extrabold text-[#0F172A]">{stats.byRole.reduce((a, r) => a + r.count, 0)}</div>
        </div>
      </div>

      {/* Recharts Display */}
      {isMounted && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="font-bold text-sm text-[#0F172A] mb-6">Пайдаланушылар рөлдері бойынша (Бағандық диаграмма)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="font-bold text-sm text-[#0F172A] mb-6">Рөлдік үлес (Дөңгелек диаграмма)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter(d => d.count > 0)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {chartData.filter(d => d.count > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
