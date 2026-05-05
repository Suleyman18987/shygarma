'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Trophy, Medal, Crown } from 'lucide-react'

export default function LeaderboardPage() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('xp', { ascending: false })
        .limit(50)
      setStudents(data || [])
    }
    load()
  }, [])

  const podiumColors = ['#F59E0B', '#94A3B8', '#CD7F32']
  const podiumIcons = [Crown, Medal, Medal]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Рейтинг 🏆</h1>

      {/* Top 3 */}
      {students.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map(idx => {
            const s = students[idx]
            if (!s) return null
            const Icon = podiumIcons[idx]
            return (
              <div key={s.id} className={`bg-white rounded-2xl border border-[#E2E8F0] p-5 text-center ${idx === 0 ? 'lg:-mt-4' : ''}`}>
                <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-xl font-bold mb-3">
                  {(s.full_name || '?').charAt(0).toUpperCase()}
                </div>
                <Icon className="w-6 h-6 mx-auto mb-1" style={{ color: podiumColors[idx] }} />
                <div className="font-semibold text-[#0F172A] text-sm">{s.full_name || '—'}</div>
                <div className="text-lg font-bold text-[#4F46E5]">{s.xp} XP</div>
                <div className="text-xs text-[#64748B]">Level {s.level} • CS: {Math.round(s.creative_score)}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F8FAFC] text-[#64748B]">
            <th className="text-left px-6 py-3 font-medium w-16">#</th>
            <th className="text-left px-6 py-3 font-medium">Аты</th>
            <th className="text-left px-6 py-3 font-medium">XP</th>
            <th className="text-left px-6 py-3 font-medium">Level</th>
            <th className="text-left px-6 py-3 font-medium">Creative Score</th>
          </tr></thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {students.map((s, i) => (
              <tr key={s.id} className={`hover:bg-[#F8FAFC] ${profile?.id === s.id ? 'bg-[#EEF2FF]' : ''}`}>
                <td className="px-6 py-3 font-bold text-[#0F172A]">{i + 1}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(s.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-[#0F172A]">{s.full_name}{profile?.id === s.id ? ' (Сіз)' : ''}</span>
                  </div>
                </td>
                <td className="px-6 py-3 font-semibold text-[#4F46E5]">{s.xp}</td>
                <td className="px-6 py-3 text-[#64748B]">{s.level}</td>
                <td className="px-6 py-3 text-[#7C3AED] font-medium">{Math.round(s.creative_score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
