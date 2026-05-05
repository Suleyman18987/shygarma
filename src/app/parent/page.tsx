'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

export default function ParentDashboard() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [child, setChild] = useState<any>(null)
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      // Find child linked to this parent
      const { data: children } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', profile.id)
        .limit(1)

      if (children && children.length > 0) {
        setChild(children[0])
        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('*, assignments!inner(title)')
          .eq('student_id', children[0].id)
          .not('score', 'is', null)
          .order('graded_at', { ascending: false })
          .limit(10)
        setGrades(subs || [])
      }
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Ата-ана панелі 👪</h1>

      {child ? (
        <>
          <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-2xl p-6 mb-6 text-white">
            <div className="text-sm text-white/70 mb-1">Баланың аты</div>
            <div className="text-xl font-bold mb-3">{child.full_name}</div>
            <div className="grid grid-cols-3 gap-4">
              <div><div className="text-2xl font-bold">{child.xp}</div><div className="text-xs text-white/70">XP</div></div>
              <div><div className="text-2xl font-bold">{child.level}</div><div className="text-xs text-white/70">Level</div></div>
              <div><div className="text-2xl font-bold">{Math.round(child.creative_score)}</div><div className="text-xs text-white/70">Creative Score</div></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-semibold text-[#0F172A]">Соңғы бағалар</h2>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {grades.map(g => (
                <div key={g.id} className="px-6 py-3 flex items-center justify-between">
                  <span className="text-sm text-[#0F172A]">{g.assignments?.title}</span>
                  <span className="text-sm font-semibold text-[#4F46E5]">{g.score} балл</span>
                </div>
              ))}
              {grades.length === 0 && <div className="px-6 py-8 text-center text-sm text-[#94A3B8]">Бағалар жоқ</div>}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          <p className="text-[#64748B]">Бала тіркелмеген. Оқушы тіркелу кезінде сіздің аккаунтыңызды таңдауы керек.</p>
        </div>
      )}
    </div>
  )
}
