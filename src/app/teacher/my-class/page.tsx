'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TeacherMyClassPage() {
  const [supabase] = useState(() => createClient())
  const [students, setStudents] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])
  const [loadingParentId, setLoadingParentId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const [{ data: sData }, { data: pData }] = await Promise.all([
        supabase.from('profiles').select('*, parent:parent_id(id, full_name)').eq('role', 'student').order('xp', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('role', 'parent')
      ])
      setStudents(sData || [])
      setParents(pData || [])
    }
    load()
  }, [])

  const linkParent = async (studentId: string, parentId: string) => {
    setLoadingParentId(studentId)
    await supabase.from('profiles').update({ parent_id: parentId || null }).eq('id', studentId)
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, parent_id: parentId || null, parent: parents.find(p => p.id === parentId) || null } : s))
    setLoadingParentId(null)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Менің сыныбым 👥</h1>
      <p className="text-sm text-[#64748B] mb-6">Бұл бетте сіз өз оқушыларыңыздың жетістіктерін көре аласыз және оларға Ата-аналарын бекіте аласыз (Dropdown арқылы).</p>
      
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F8FAFC] text-[#64748B]">
            <th className="text-left px-6 py-3 font-medium">Аты</th>
            <th className="text-left px-6 py-3 font-medium">XP</th>
            <th className="text-left px-6 py-3 font-medium">Level</th>
            <th className="text-left px-6 py-3 font-medium">Creative Score</th>
            <th className="text-left px-6 py-3 font-medium">Ата-анасы</th>
          </tr></thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-[#F8FAFC]">
                <td className="px-6 py-3 font-medium text-[#0F172A]">{s.full_name || '—'}</td>
                <td className="px-6 py-3 text-[#4F46E5] font-semibold">{s.xp}</td>
                <td className="px-6 py-3 text-[#64748B]">{s.level}</td>
                <td className="px-6 py-3 text-[#7C3AED] font-medium">{Math.round(s.creative_score)}</td>
                <td className="px-6 py-3">
                  <select
                    disabled={loadingParentId === s.id}
                    value={s.parent_id || ''}
                    onChange={(e) => linkParent(s.id, e.target.value)}
                    className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="">Таңдау жоқ</option>
                    {parents.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
