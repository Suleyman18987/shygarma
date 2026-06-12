'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, CheckCircle, Sparkles } from 'lucide-react'
import { updateUserXP } from '@/lib/xp-utils'
import { notifyStudentsOfNewAssignment, notifyGraded } from '@/lib/notification-utils'
import { calculateCreativeScore } from '@/lib/creative-score'

export default function TeacherAssignmentsPage() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [assignments, setAssignments] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', deadline: '', max_score: 100 })
  const [saving, setSaving] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [grading, setGrading] = useState<{ id: string; score: string; feedback: string } | null>(null)

  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiInputs, setAiInputs] = useState({ subject: 'Математика', grade: '8', difficulty: 'Орташа', type: 'test' })
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiError, setAiError] = useState('')

  const generateWithAI = async () => {
    setGeneratingAI(true)
    setAiError('')
    try {
      const response = await fetch('/api/ai/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiInputs)
      })

      if (!response.ok) {
        throw new Error('ЖИ тапсырма генерациялай алмады. Сервер қатесі.')
      }

      const data = await response.json()
      if (data.task) {
        let desc = data.task.description || ''
        if (data.task.options && data.task.options.length > 0) {
          desc += '\n\n**Нұсқалар:**\n' + data.task.options.map((o: any, idx: number) => {
            const label = String.fromCharCode(65 + idx) // A, B, C...
            return `${label}) ${o.text} ${o.correct ? '(Дұрыс жауап)' : ''}`
          }).join('\n')
        }
        if (data.task.correctAnswer) {
          desc += `\n\n**Дұрыс жауап:** ${data.task.correctAnswer}`
        }

        setForm({
          title: data.task.title || '',
          description: desc || '',
          deadline: form.deadline,
          max_score: data.task.points || 10
        })
        setShowAIPanel(false)
      } else {
        throw new Error('Қайтарылған тапсырма құрылымы қате.')
      }
    } catch (err: any) {
      setAiError(err.message || 'Белгісіз қате шықты.')
    } finally {
      setGeneratingAI(false)
    }
  }

  const loadAssignments = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('assignments')
      .select('*')
      .eq('created_by', profile.id)
      .order('created_at', { ascending: false })
    setAssignments(data || [])
  }

  useEffect(() => {
    if (profile) {
      loadAssignments()
    }
  }, [profile])

  const loadSubmissions = async (assignmentId: string) => {
    setSelectedAssignment(assignmentId)
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*, profiles!assignment_submissions_student_id_fkey(full_name)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    setSubmissions(data || [])
  }

  const handleCreate = async () => {
    if (!profile) return
    setSaving(true)
    const { data: newAssignment, error } = await supabase
      .from('assignments')
      .insert({
        ...form,
        created_by: profile.id,
        deadline: form.deadline || null,
        max_score: Number(form.max_score),
      })
      .select()
      .single()

    if (newAssignment && !error) {
      await notifyStudentsOfNewAssignment(supabase, newAssignment.title)
    }

    setForm({ title: '', description: '', deadline: '', max_score: 100 })
    setShowForm(false)
    setSaving(false)
    loadAssignments()
  }

  const handleGrade = async () => {
    if (!grading || !profile) return
    setSaving(true)
    const scoreVal = Number(grading.score)
    await supabase.from('assignment_submissions').update({
      score: scoreVal, feedback: grading.feedback, graded_by: profile.id, graded_at: new Date().toISOString(),
    }).eq('id', grading.id)

    // Add XP to student, notify, and update creative score
    const sub = submissions.find(s => s.id === grading.id)
    if (sub) {
      await updateUserXP(supabase, sub.student_id, scoreVal)
      const assignmentTitle = assignments.find(a => a.id === selectedAssignment)?.title || 'Тапсырма'
      await notifyGraded(supabase, sub.student_id, assignmentTitle, scoreVal)
      await calculateCreativeScore(supabase, sub.student_id)
    }

    setGrading(null)
    setSaving(false)
    if (selectedAssignment) loadSubmissions(selectedAssignment)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Тапсырмалар</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-xl hover:bg-[#4338CA]">
          <Plus className="w-4 h-4" /> Жаңа
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <h3 className="font-semibold text-sm text-[#0F172A]">Тапсырма жасау</h3>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" /> {showAIPanel ? 'Қолмен жазу режимі' : 'ЖИ көмегімен жасау'}
            </button>
          </div>

          {showAIPanel ? (
            <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EEF2FF] p-4 rounded-xl border border-[#DDD6FE] space-y-3">
              <div className="text-xs font-bold text-[#7C3AED] flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Жасанды Интеллектпен тапсырма генерациялау</span>
              </div>
              
              {aiError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
                  {aiError}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-1">Пән</label>
                  <select
                    value={aiInputs.subject}
                    onChange={e => setAiInputs(a => ({ ...a, subject: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                  >
                    <option value="Математика">Математика</option>
                    <option value="Физика">Физика</option>
                    <option value="Химия">Химия</option>
                    <option value="Биология">Биология</option>
                    <option value="География">География</option>
                    <option value="Информатика">Информатика</option>
                    <option value="Қазақ тілі">Қазақ тілі</option>
                    <option value="Ағылшын тілі">Ағылшын тілі</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-1">Сынып</label>
                  <select
                    value={aiInputs.grade}
                    onChange={e => setAiInputs(a => ({ ...a, grade: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                  >
                    <option value="5">5-сынып</option>
                    <option value="6">6-сынып</option>
                    <option value="7">7-сынып</option>
                    <option value="8">8-сынып</option>
                    <option value="9">9-сынып</option>
                    <option value="10">10-сынып</option>
                    <option value="11">11-сынып</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-1">Қиындығы</label>
                  <select
                    value={aiInputs.difficulty}
                    onChange={e => setAiInputs(a => ({ ...a, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                  >
                    <option value="Жеңіл">Жеңіл</option>
                    <option value="Орташа">Орташа</option>
                    <option value="Қиын">Қиын</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-1">Тапсырма түрі</label>
                  <select
                    value={aiInputs.type}
                    onChange={e => setAiInputs(a => ({ ...a, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                  >
                    <option value="test">Тест (жауап нұсқаларымен)</option>
                    <option value="open">Ашық сұрақ</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={generateWithAI}
                  disabled={generatingAI}
                  className="px-4 py-2 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-[#4F46E5]/10 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Генерациялануда...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Тапсырма генерациялау
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Тақырып</label>
              <input type="text" placeholder="Тақырып" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Сипаттама</label>
              <textarea placeholder="Сипаттама" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Дедлайн</label>
                <input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Максималды балл</label>
                <input type="number" placeholder="Max балл" value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: Number(e.target.value) }))} className="w-32 px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]" />
              </div>
            </div>
          </div>

          <button onClick={handleCreate} disabled={saving || !form.title} className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-[#4F46E5]/10 flex items-center justify-center gap-1.5 cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Құру'}
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} onClick={() => loadSubmissions(a.id)} className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${selectedAssignment === a.id ? 'border-[#4F46E5] shadow-md' : 'border-[#E2E8F0] hover:shadow-sm'}`}>
              <h3 className="font-semibold text-sm text-[#0F172A]">{a.title}</h3>
              <p className="text-xs text-[#64748B] mt-1">{a.deadline ? `Дедлайн: ${new Date(a.deadline).toLocaleDateString('kk')}` : 'Дедлайн жоқ'} • Max: {a.max_score}</p>
            </div>
          ))}
        </div>

        {selectedAssignment && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E2E8F0] font-semibold text-sm text-[#0F172A]">Жіберілген жұмыстар</div>
            <div className="divide-y divide-[#E2E8F0]">
              {submissions.map(s => (
                <div key={s.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-[#0F172A]">{s.profiles?.full_name || '—'}</span>
                    {s.score !== null ? (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">✅ {s.score}</span>
                    ) : (
                      <button onClick={() => setGrading({ id: s.id, score: '', feedback: '' })} className="text-xs text-[#4F46E5] font-medium hover:underline">Бағалау</button>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B]">{s.content}</p>
                  {grading?.id === s.id && (
                    <div className="mt-3 space-y-2 border-t border-[#E2E8F0] pt-3">
                      <input type="number" placeholder="Балл" value={grading?.score || ''} onChange={e => setGrading(g => g ? { ...g, score: e.target.value } : g)} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />
                      <textarea placeholder="Кері байланыс" value={grading?.feedback || ''} onChange={e => setGrading(g => g ? { ...g, feedback: e.target.value } : g)} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[60px]" />
                      <button onClick={handleGrade} disabled={saving} className="px-4 py-2 bg-[#10B981] text-white text-sm rounded-xl disabled:opacity-50 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Бағалау
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {submissions.length === 0 && <div className="p-6 text-center text-xs text-[#94A3B8]">Жіберілген жұмыстар жоқ</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
