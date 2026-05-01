'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, Target } from 'lucide-react'

export default function ParentChildProgressPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [child, setChild] = useState<any>(null)
  const [grades, setGrades] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const { data: children } = await supabase.from('profiles').select('*').eq('parent_id', profile.id).limit(1)
      if (children?.[0]) {
        setChild(children[0])
        const { data: subs } = await supabase.from('assignment_submissions').select('*, assignments!inner(title)').eq('student_id', children[0].id).not('score', 'is', null).order('graded_at', { ascending: false })
        setGrades(subs || [])
      }
    }
    load()
  }, [profile])

  if (!child) return <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-[#94A3B8]">Бала тіркелмеген</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Бала прогресі 📊</h1>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 text-center">
          <div className="text-3xl font-bold text-[#4F46E5]">{child.xp}</div><div className="text-sm text-[#64748B]">XP</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 text-center">
          <div className="text-3xl font-bold text-[#0F172A]">{child.level}</div><div className="text-sm text-[#64748B]">Level</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 text-center">
          <div className="text-3xl font-bold text-[#7C3AED]">{Math.round(child.creative_score)}</div><div className="text-sm text-[#64748B]">Creative Score</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] font-semibold">Бағалар</div>
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F8FAFC] text-[#64748B]"><th className="text-left px-6 py-3">Тапсырма</th><th className="text-left px-6 py-3">Балл</th></tr></thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {grades.map(g => <tr key={g.id}><td className="px-6 py-3">{g.assignments?.title}</td><td className="px-6 py-3 font-semibold text-[#4F46E5]">{g.score}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
