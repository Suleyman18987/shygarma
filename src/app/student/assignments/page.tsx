'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Clock, CheckCircle, Upload, Loader2 } from 'lucide-react'

export default function StudentAssignmentsPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [assignments, setAssignments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<Record<string, any>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: a } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
      setAssignments(a || [])
      if (profile) {
        const { data: s } = await supabase.from('assignment_submissions').select('*').eq('student_id', profile.id)
        const map: Record<string, any> = {}
        s?.forEach(sub => { map[sub.assignment_id] = sub })
        setSubmissions(map)
      }
    }
    load()
  }, [profile])

  const handleSubmit = async (assignmentId: string) => {
    if (!profile) return
    setSubmitting(true)
    const { data } = await supabase.from('assignment_submissions').insert({
      assignment_id: assignmentId, student_id: profile.id, content: answer,
    }).select().single()
    if (data) setSubmissions(prev => ({ ...prev, [assignmentId]: data }))
    setOpenId(null)
    setAnswer('')
    setSubmitting(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Тапсырмалар 📝</h1>
      <div className="space-y-4">
        {assignments.map(a => {
          const sub = submissions[a.id]
          const isOpen = openId === a.id
          return (
            <div key={a.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="p-5 flex items-start justify-between cursor-pointer" onClick={() => setOpenId(isOpen ? null : a.id)}>
                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-1">{a.title}</h3>
                  <p className="text-sm text-[#64748B] line-clamp-2">{a.description || 'Сипаттама жоқ'}</p>
                  {a.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-[#F59E0B] mt-2">
                      <Clock className="w-3.5 h-3.5" /> Дедлайн: {new Date(a.deadline).toLocaleDateString('kk')}
                    </div>
                  )}
                </div>
                <div className="shrink-0 ml-4">
                  {sub ? (
                    sub.score !== null ? (
                      <span className="px-3 py-1 text-xs font-medium rounded-lg bg-green-50 text-green-600">✅ {sub.score}/{a.max_score}</span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600">📤 Жіберілді</span>
                    )
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium rounded-lg bg-yellow-50 text-yellow-600">⏳ Жаңа</span>
                  )}
                </div>
              </div>
              {isOpen && !sub && (
                <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
                  <textarea
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] mb-3"
                    placeholder="Жауабыңызды жазыңыз..."
                  />
                  <button onClick={() => handleSubmit(a.id)} disabled={submitting || !answer.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-xl disabled:opacity-50">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Жіберу
                  </button>
                </div>
              )}
              {isOpen && sub && (
                <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
                  <div className="text-sm text-[#64748B] mb-2"><strong>Сіздің жауабыңыз:</strong> {sub.content}</div>
                  {sub.feedback && <div className="text-sm text-[#64748B]"><strong>Кері байланыс:</strong> {sub.feedback}</div>}
                </div>
              )}
            </div>
          )
        })}
        {assignments.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-[#94A3B8]">Тапсырмалар жоқ</div>
        )}
      </div>
    </div>
  )
}
