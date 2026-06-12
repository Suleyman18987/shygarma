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
  const [olympiadGrades, setOlympiadGrades] = useState<any[]>([])
  const [projectGrades, setProjectGrades] = useState<any[]>([])
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
        const activeChild = children[0]
        setChild(activeChild)

        // 1. Fetch assignment grades
        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('*, assignments!inner(title)')
          .eq('student_id', activeChild.id)
          .not('score', 'is', null)
          .order('graded_at', { ascending: false })
          .limit(10)
        setGrades(subs || [])

        // 2. Fetch olympiad submissions and match problem titles
        const { data: oSubs } = await supabase
          .from('olympiad_submissions')
          .select('*')
          .eq('student_id', activeChild.id)
          .order('submitted_at', { ascending: false })

        if (oSubs && oSubs.length > 0) {
          const pIds = oSubs.map((s: any) => s.problem_id)
          const { data: probs } = await supabase
            .from('problems')
            .select('id, title, points, olympiads(title)')
            .in('id', pIds)
          const mappedOSubs = oSubs.map((s: any) => {
            const p = probs?.find((pr: any) => pr.id === s.problem_id) as any
            const olympiadTitle = Array.isArray(p?.olympiads)
              ? p?.olympiads[0]?.title
              : p?.olympiads?.title
            return {
              ...s,
              problem_title: p?.title || 'Есеп',
              olympiad_title: olympiadTitle || 'Олимпиада',
              max_points: p?.points || 10
            }
          })
          setOlympiadGrades(mappedOSubs)
        }

        // 3. Fetch project submissions and match project titles
        const { data: pSubs } = await supabase
          .from('project_submissions')
          .select('*')
          .eq('student_id', activeChild.id)
          .order('submitted_at', { ascending: false })

        if (pSubs && pSubs.length > 0) {
          const projIds = pSubs.map((s: any) => s.project_id)
          const { data: projs } = await supabase
            .from('projects')
            .select('id, title')
            .in('id', projIds)
          const mappedPSubs = pSubs.map((s: any) => {
            const pr = projs?.find((p: any) => p.id === s.project_id)
            return {
              ...s,
              project_title: pr?.title || 'Жоба'
            }
          })
          setProjectGrades(mappedPSubs)
        }
      }
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Ата-ана панелі 👪</h1>

      {profile && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-6">
          <h3 className="font-semibold text-[#0F172A] mb-2">Telegram хабарламалары 💬</h3>
          <p className="text-sm text-[#64748B] mb-4">
            Балаңыздың үлгерімі, алған бағалары мен жаңа тапсырмалар туралы жедел хабарламаларды Телеграм арқылы алып отырыңыз.
          </p>
          
          <div className="space-y-4">
            {profile.telegram_chat_id ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-xl border border-green-200">
                <span>Телеграм сәтті қосылды</span>
                <span className="font-bold">✅</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <a
                  href="https://t.me/DarynSpaceBot"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-[#0088cc]/10"
                >
                  💬 Телеграм ботқа өту
                </a>
                
                {child && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#64748B]">Баланың бірегей коды:</span>
                    <code className="px-3 py-1.5 bg-[#F1F5F9] text-[#4F46E5] font-mono font-bold rounded-lg border border-[#E2E8F0] text-sm">
                      DARYN-{child.id.substring(0, 8)}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`DARYN-${child.id.substring(0, 8)}`)
                        alert('Код көшірілді! Оны Телеграм ботқа жіберіңіз.')
                      }}
                      className="px-3 py-1.5 bg-[#E0E7FF] hover:bg-[#C7D2FE] text-[#4F46E5] text-xs font-semibold rounded-lg transition-colors"
                    >
                      Көшіру
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Assignments */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-semibold text-[#0F172A]">Тапсырма бағалары 📝</h2>
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

            {/* Projects */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-semibold text-[#0F172A]">Жобалар нәтижесі 🎨</h2>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {projectGrades.map(p => (
                  <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                    <span className="text-sm text-[#0F172A]">{p.project_title}</span>
                    <span className="text-sm font-semibold text-[#7C3AED]">
                      {p.total_score !== null ? `${p.total_score} балл` : 'Бағаланбады'}
                    </span>
                  </div>
                ))}
                {projectGrades.length === 0 && <div className="px-6 py-8 text-center text-sm text-[#94A3B8]">Жобалар жоқ</div>}
              </div>
            </div>
          </div>

          {/* Olympiads */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-semibold text-[#0F172A]">Олимпиада нәтижелері 🏆</h2>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {olympiadGrades.map(o => (
                <div key={o.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#0F172A]">{o.olympiad_title}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">Есеп: {o.problem_title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.is_correct === true && <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200">Дұрыс</span>}
                    {o.is_correct === false && <span className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-lg font-medium border border-red-200">Қате</span>}
                    {o.is_correct === null && <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-200">Тексерілуде</span>}
                    <span className="text-sm font-bold text-[#0F172A]">{o.score} / {o.max_points} XP</span>
                  </div>
                </div>
              ))}
              {olympiadGrades.length === 0 && <div className="px-6 py-8 text-center text-sm text-[#94A3B8]">Олимпиадаларға қатысу жоқ</div>}
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
