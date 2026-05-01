'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { UserPlus, Trash2, Loader2 } from 'lucide-react'

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      let q = supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('role', filter)
      const { data } = await q
      setUsers(data || [])
    }
    load()
  }, [filter])

  const tabs = [
    { value: 'all', label: 'Барлығы' },
    { value: 'admin', label: 'Админ' },
    { value: 'teacher', label: 'Мұғалім' },
    { value: 'student', label: 'Оқушы' },
    { value: 'parent', label: 'Ата-ана' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Қолданушылар</h1>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${filter === t.value ? 'bg-[#4F46E5] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-[#64748B]">
              <th className="text-left px-6 py-3 font-medium">Аты</th>
              <th className="text-left px-6 py-3 font-medium">Рөл</th>
              <th className="text-left px-6 py-3 font-medium">XP</th>
              <th className="text-left px-6 py-3 font-medium">Level</th>
              <th className="text-left px-6 py-3 font-medium">Creative Score</th>
              <th className="text-left px-6 py-3 font-medium">Тіркелген</th>
            </tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold">
                        {(u.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-[#0F172A]">{u.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-lg capitalize ${
                      u.role === 'admin' ? 'bg-red-50 text-red-600' :
                      u.role === 'teacher' ? 'bg-blue-50 text-blue-600' :
                      u.role === 'student' ? 'bg-green-50 text-green-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-3 text-[#64748B]">{u.xp}</td>
                  <td className="px-6 py-3 text-[#64748B]">{u.level}</td>
                  <td className="px-6 py-3 text-[#64748B]">{Math.round(u.creative_score)}</td>
                  <td className="px-6 py-3 text-[#64748B]">{new Date(u.created_at).toLocaleDateString('kk')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
