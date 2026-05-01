'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TeacherMyClassPage() {
  const supabase = createClient()
  const [students, setStudents] = useState<any[]>([])
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student').order('xp', { ascending: false }).then(({ data }) => setStudents(data || []))
  }, [])
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Менің сыныбым 👥</h1>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F8FAFC] text-[#64748B]">
            <th className="text-left px-6 py-3 font-medium">Аты</th>
            <th className="text-left px-6 py-3 font-medium">XP</th>
            <th className="text-left px-6 py-3 font-medium">Level</th>
            <th className="text-left px-6 py-3 font-medium">Creative Score</th>
          </tr></thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-[#F8FAFC]">
                <td className="px-6 py-3 font-medium text-[#0F172A]">{s.full_name || '—'}</td>
                <td className="px-6 py-3 text-[#4F46E5] font-semibold">{s.xp}</td>
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
