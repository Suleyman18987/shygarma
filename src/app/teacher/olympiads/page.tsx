'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, Trash2, Sparkles, CheckCircle, XCircle } from 'lucide-react'
import { updateUserXP } from '@/lib/xp-utils'
import { calculateCreativeScore } from '@/lib/creative-score'

interface OlympiadGradingFormProps {
  submissionId: string
  studentId: string
  problemTitle: string
  maxPoints: number
  initialScore: number
  onGrade: (subId: string, studentId: string, score: number) => Promise<void>
  saving: boolean
}

function OlympiadGradingForm({ submissionId, studentId, problemTitle, maxPoints, initialScore, onGrade, saving }: OlympiadGradingFormProps) {
  const [score, setScore] = useState(initialScore)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGrade(submissionId, studentId, Number(score))
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
      <div className="text-xs font-bold text-[#64748B]">
        «{problemTitle}» бағалау (максималды: {maxPoints}б)
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max={maxPoints}
          required
          value={score}
          onChange={e => setScore(Number(e.target.value))}
          className="w-20 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Сақтау
        </button>
      </div>
    </form>
  )
}

export default function TeacherOlympiadsPage() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [olympiads, setOlympiads] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '' })
  const [problems, setProblems] = useState<any[]>([])
  const [pForm, setPForm] = useState({ title: '', description: '', type: 'test', points: 10, options: '', correct_answer: '' })
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [existingProblems, setExistingProblems] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'manage' | 'grade'>('manage')

  // Grading states
  const [selectedOly, setSelectedOly] = useState<string | null>(null)
  const [gradingSub, setGradingSub] = useState<string | null>(null)
  const [submissionsByStudent, setSubmissionsByStudent] = useState<any[]>([])
  const [olyProblems, setOlyProblems] = useState<any[]>([])

  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiInputs, setAiInputs] = useState({ subject: 'Математика', grade: '8', difficulty: 'Орташа', type: 'test', topic: '' })
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiError, setAiError] = useState('')

  const generateProblemWithAI = async () => {
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
        let optionsStr = ''
        if (data.task.options && data.task.options.length > 0) {
          const correctOpt = data.task.options.find((o: any) => o.correct)?.text || ''
          const otherOpts = data.task.options.filter((o: any) => !o.correct).map((o: any) => o.text)
          optionsStr = [correctOpt, ...otherOpts].filter(Boolean).join(', ')
        }

        setPForm({
          title: data.task.title || '',
          description: data.task.description || '',
          type: aiInputs.type,
          points: data.task.points || 10,
          options: optionsStr,
          correct_answer: data.task.correctAnswer || ''
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

  const load = async () => {
    const { data } = await supabase.from('olympiads').select('*').order('created_at', { ascending: false })
    setOlympiads(data || [])
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!profile) return; setSaving(true)
    const { data: oly } = await supabase.from('olympiads').insert({
      title: form.title, description: form.description, created_by: profile.id,
      start_time: form.start_time || null, end_time: form.end_time || null, status: 'active',
    }).select().single()
    if (oly && problems.length > 0) {
      await supabase.from('problems').insert(problems.map((p, i) => ({
        olympiad_id: oly.id, title: p.title, description: p.description, type: p.type,
        points: p.points, options: p.options, correct_answer: p.correct_answer, order_index: i,
      })))
    }
    setShowForm(false); setSaving(false); setProblems([]); load()
  }

  const addProblem = () => {
    const opts = pForm.type === 'test' ? pForm.options.split(',').map((t, i) => ({ text: t.trim(), correct: i === 0 })) : null
    setProblems([...problems, { ...pForm, options: opts }])
    setPForm({ title: '', description: '', type: 'test', points: 10, options: '', correct_answer: '' })
  }

  const selectOly = async (id: string) => {
    setSelectedId(id)
    const { data } = await supabase.from('problems').select('*').eq('olympiad_id', id).order('order_index')
    setExistingProblems(data || [])
  }

  const loadOlySubmissions = async (olyId: string) => {
    setSelectedOly(olyId)
    setSaving(true)
    
    const { data: probs } = await supabase
      .from('problems')
      .select('*')
      .eq('olympiad_id', olyId)
      .order('order_index')
    
    const problemsList = probs || []
    setOlyProblems(problemsList)

    if (problemsList.length === 0) {
      setSubmissionsByStudent([])
      setSaving(false)
      return
    }

    const { data: subs } = await supabase
      .from('olympiad_submissions')
      .select('*, profiles!olympiad_submissions_student_id_fkey(full_name)')
      .in('problem_id', problemsList.map(p => p.id))
      .order('submitted_at', { ascending: false })

    const subsList = subs || []

    const studentGroups: Record<string, { student_name: string, student_id: string, submissions: any[] }> = {}
    
    subsList.forEach(s => {
      const studentId = s.student_id
      const studentName = s.profiles?.full_name || 'Оқушы'
      if (!studentGroups[studentId]) {
        studentGroups[studentId] = {
          student_name: studentName,
          student_id: studentId,
          submissions: []
        }
      }
      studentGroups[studentId].submissions.push(s)
    })

    setSubmissionsByStudent(Object.values(studentGroups))
    setSaving(false)
  }

  const handleOlyGrade = async (subId: string, studentId: string, scoreVal: number) => {
    setSaving(true)
    await supabase.from('olympiad_submissions').update({
      score: scoreVal,
      is_correct: scoreVal > 0 ? true : false,
      graded_at: new Date().toISOString()
    }).eq('id', subId)

    await updateUserXP(supabase, studentId, scoreVal)
    await calculateCreativeScore(supabase, studentId)

    setGradingSub(null)
    setSaving(false)
    if (selectedOly) {
      await loadOlySubmissions(selectedOly)
    }
  }

  const getStudentTotalScore = (studentSubs: any[]) => {
    return studentSubs.reduce((sum, s) => sum + (s.score || 0), 0)
  }

  const getProblemSubmission = (studentSubs: any[], problemId: string) => {
    return studentSubs.find(s => s.problem_id === problemId)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0F172A]">Олимпиадалар кабинеті</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] mb-6">
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'manage'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          📋 Олимпиадалар тізімі
        </button>
        <button
          onClick={() => {
            setActiveTab('grade')
            if (olympiads.length > 0 && !selectedOly) {
              loadOlySubmissions(olympiads[0].id)
            }
          }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'grade'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          🔎 Оқушы жауаптарын тексеру
        </button>
      </div>

      {activeTab === 'manage' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F172A]">Олимпиадалар тізімі</h2>
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-xl hover:bg-[#4338CA] transition-colors">
              <Plus className="w-4 h-4" /> Жаңа олимпиада
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="space-y-3">
                <input placeholder="Олимпиада атауы" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]" />
                <textarea placeholder="Сипаттама" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]" />
                <div className="flex gap-3">
                  <div className="flex-1"><label className="text-xs font-bold text-[#64748B] block mb-1">Басталуы</label><input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A]" /></div>
                  <div className="flex-1"><label className="text-xs font-bold text-[#64748B] block mb-1">Аяқталуы</label><input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A]" /></div>
                </div>
              </div>

              <hr className="border-[#E2E8F0]" />

              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mt-4">
                <h3 className="font-semibold text-sm text-[#0F172A]">Есептер ({problems.length})</h3>
                <button
                  type="button"
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className="text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#4F46E5]" /> {showAIPanel ? 'Қолмен жазу режимі' : 'ЖИ көмегімен жасау'}
                </button>
              </div>

              {showAIPanel && (
                <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EEF2FF] p-4 rounded-xl border border-[#DDD6FE] space-y-3 mt-2">
                  <div className="text-xs font-bold text-[#7C3AED] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Жасанды Интеллектпен олимпиада есебін генерациялау</span>
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
                      <label className="text-[10px] font-bold text-[#64748B] block mb-1">Есеп түрі</label>
                      <select
                        value={aiInputs.type}
                        onChange={e => setAiInputs(a => ({ ...a, type: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                      >
                        <option value="test">Тест</option>
                        <option value="short_answer">Қысқа жауап</option>
                        <option value="creative">Шығармашылық</option>
                        <option value="code">Код (Python)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-[#64748B] block mb-1">Тақырып немесе бағыты (мысалы: Квадрат теңдеулер, Алгоритмдер)</label>
                    <input
                      type="text"
                      placeholder="Генерацияланатын есеп тақырыбын енгізіңіз (міндетті емес)"
                      value={aiInputs.topic}
                      onChange={e => setAiInputs(a => ({ ...a, topic: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={generateProblemWithAI}
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
                          Есеп генерациялау
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-3">
                <input placeholder="Есеп атауы" value={pForm.title} onChange={e => setPForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />
                <textarea placeholder="Шарт" value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[50px]" />
                <div className="flex gap-2">
                  <select value={pForm.type} onChange={e => setPForm(f => ({ ...f, type: e.target.value }))} className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm">
                    <option value="test">Тест</option><option value="short_answer">Қысқа жауап</option><option value="creative">Шығармашылық</option><option value="code">Код (Python)</option>
                  </select>
                  <input type="number" placeholder="Балл" value={pForm.points} onChange={e => setPForm(f => ({ ...f, points: +e.target.value }))} className="w-20 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />
                </div>
                {pForm.type === 'test' && <input placeholder="Нұсқалар (1-ші дұрыс, үтірмен бөлу)" value={pForm.options} onChange={e => setPForm(f => ({ ...f, options: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />}
                {(pForm.type === 'short_answer' || pForm.type === 'code') && <input placeholder={pForm.type === 'code' ? "Дұрыс нәтиже (print арқылы шығатын мән)" : "Дұрыс жауап"} value={pForm.correct_answer} onChange={e => setPForm(f => ({ ...f, correct_answer: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />}
                <button onClick={addProblem} disabled={!pForm.title} className="px-4 py-2 text-sm bg-[#EEF2FF] text-[#4F46E5] rounded-xl font-medium disabled:opacity-50 cursor-pointer">+ Есеп қосу</button>
              </div>

              {problems.map((p, i) => (
                <div key={i} className="bg-[#F8FAFC] rounded-xl p-3 text-sm flex justify-between items-center border border-[#E2E8F0]">
                  <span>{i + 1}. {p.title} ({p.type}) — {p.points}б</span>
                  <button onClick={() => setProblems(problems.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600 transition-colors" />
                  </button>
                </div>
              ))}

              <button onClick={handleCreate} disabled={saving || !form.title} className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Олимпиаданы жариялау'}
              </button>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {olympiads.map(o => (
                <div key={o.id} onClick={() => selectOly(o.id)} className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${selectedId === o.id ? 'border-[#4F46E5] shadow-md' : 'border-[#E2E8F0] hover:shadow-sm'}`}>
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm text-[#0F172A]">{o.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${o.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{o.status === 'active' ? 'Белсенді' : 'Аяқталған'}</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1.5 line-clamp-2">{o.description}</p>
                </div>
              ))}
            </div>

            {selectedId && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-[#E2E8F0] font-bold text-sm bg-slate-50 text-[#0F172A]">Олимпиада есептері</div>
                <div className="divide-y divide-[#E2E8F0]">
                  {existingProblems.map((p, i) => (
                    <div key={p.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#0F172A]">{i + 1}. {p.title}</span>
                        <span className="text-xs font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-md">{p.points}б</span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1 font-medium">Түрі: {p.type === 'test' ? 'Тест' : p.type === 'short_answer' ? 'Қысқа жауап' : p.type === 'code' ? 'Код (Python)' : 'Шығармашылық'}</p>
                    </div>
                  ))}
                  {existingProblems.length === 0 && <div className="p-6 text-center text-xs text-[#94A3B8]">Есептер табылмады</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-[#64748B] block mb-2">Олимпиаданы таңдаңыз</label>
            <select
              value={selectedOly || ''}
              onChange={e => {
                const val = e.target.value
                if (val) {
                  loadOlySubmissions(val)
                } else {
                  setSelectedOly(null)
                  setSubmissionsByStudent([])
                }
              }}
              className="w-full max-w-md px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A] font-medium"
            >
              <option value="">-- Олимпиаданы таңдаңыз --</option>
              {olympiads.map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </div>

          {selectedOly && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
                <span className="font-bold text-sm text-[#0F172A]">Қатысушы оқушылар</span>
                <span className="text-xs font-bold text-[#64748B]">{submissionsByStudent.length} оқушы басталды</span>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {submissionsByStudent.map(group => {
                  const totalGradedScore = getStudentTotalScore(group.submissions)
                  const olyMaxPoints = olyProblems.reduce((sum, p) => sum + p.points, 0)
                  return (
                    <div key={group.student_id} className="p-5">
                      <div className="flex justify-between items-center border-b border-dashed border-[#E2E8F0] pb-3 mb-4">
                        <span className="font-bold text-base text-[#0F172A]">{group.student_name}</span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-xl">
                          Жалпы балл: {totalGradedScore} / {olyMaxPoints}б
                        </span>
                      </div>

                      <div className="space-y-4">
                        {olyProblems.map((prob, idx) => {
                          const sub = getProblemSubmission(group.submissions, prob.id)
                          return (
                            <div key={prob.id} className="p-3 rounded-xl border border-[#F1F5F9] bg-[#FAFBFD]">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-xs font-bold text-[#0F172A]">{idx + 1}. {prob.title}</span>
                                  <span className="text-[10px] font-bold text-[#64748B] block">Типі: {prob.type} • Макс балл: {prob.points}б</span>
                                </div>
                                {sub ? (
                                  sub.is_correct === true ? (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3"/> {sub.score}б
                                    </span>
                                  ) : sub.is_correct === false ? (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <XCircle className="w-3 h-3"/> {sub.score}б (Қате)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                      Шығармашылық ({sub.score}б)
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                    Тапсырылмады
                                  </span>
                                )}
                              </div>

                              {sub && (
                                <div className="space-y-2">
                                  <div className="text-xs text-[#0F172A] bg-white p-2.5 rounded-lg border border-[#E2E8F0] font-mono whitespace-pre-wrap leading-relaxed shadow-sm">
                                    <span className="text-[10px] font-bold text-[#64748B] block mb-1">Жауап:</span>
                                    {sub.answer}
                                  </div>

                                  {prob.type === 'creative' && (
                                    <div className="mt-2">
                                      {gradingSub === sub.id ? (
                                        <OlympiadGradingForm
                                          submissionId={sub.id}
                                          studentId={group.student_id}
                                          problemTitle={prob.title}
                                          maxPoints={prob.points}
                                          initialScore={sub.score || 0}
                                          saving={saving}
                                          onGrade={handleOlyGrade}
                                        />
                                      ) : (
                                        <button
                                          onClick={() => setGradingSub(sub.id)}
                                          className="text-[10px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                        >
                                          Бағалау / Баллды өзгерту
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {submissionsByStudent.length === 0 && (
                  <div className="p-12 text-center text-sm text-[#94A3B8]">Жіберілген жұмыстар жоқ</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
