'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, Link2, Sparkles, CheckCircle } from 'lucide-react'
import { updateUserXP } from '@/lib/xp-utils'
import { notifyGraded } from '@/lib/notification-utils'
import { calculateCreativeScore } from '@/lib/creative-score'
import { checkPlagiarism } from '@/lib/plagiarism'

interface ProjectGradingFormProps {
  submissionId: string
  criteria: Array<{ name: string; max: number }>
  initialScores: Record<string, number>
  initialFeedback: string
  onGrade: (scores: Record<string, number>, feedback: string) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function ProjectGradingForm({ submissionId, criteria, initialScores, initialFeedback, onGrade, onCancel, saving }: ProjectGradingFormProps) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const defaultScores: Record<string, number> = {}
    criteria.forEach(c => {
      defaultScores[c.name] = initialScores[c.name] ?? 0
    })
    return defaultScores
  })
  const [feedback, setFeedback] = useState(initialFeedback)

  const handleScoreChange = (name: string, val: number) => {
    setScores(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGrade(scores, feedback)
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0)

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-[#E2E8F0] pt-4 space-y-3">
      <div className="text-xs font-bold text-[#0F172A] mb-2">Критерийлер бойынша бағалау:</div>
      {criteria.map(c => (
        <div key={c.name} className="space-y-1">
          <div className="flex justify-between text-xs font-medium text-[#64748B]">
            <span>{c.name} (0-{c.max})</span>
            <span className="text-[#4F46E5] font-bold">{scores[c.name] ?? 0} / {c.max}</span>
          </div>
          <input
            type="range"
            min="0"
            max={c.max}
            value={scores[c.name] ?? 0}
            onChange={e => handleScoreChange(c.name, Number(e.target.value))}
            className="w-full accent-[#4F46E5] cursor-pointer"
          />
        </div>
      ))}
      <div className="text-sm font-bold text-[#0F172A] mt-2 pt-2 border-t border-dashed border-[#E2E8F0] flex justify-between items-center">
        <span>Жалпы балл:</span>
        <span className="text-[#10B981] bg-green-50 px-2.5 py-0.5 rounded-lg border border-green-200">{total} балл</span>
      </div>
      <div>
        <label className="text-[10px] font-bold text-[#64748B] block mb-1">Кері байланыс (пікір)</label>
        <textarea
          placeholder="Кері байланыс"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[60px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Сақтау
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#64748B] text-xs font-semibold rounded-xl cursor-pointer transition-colors"
        >
          Болдырмау
        </button>
      </div>
    </form>
  )
}

export default function TeacherProjectsPage() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [projects, setProjects] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', requirements: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [grading, setGrading] = useState<any>(null)
  const [plagiarismResults, setPlagiarismResults] = useState<Record<string, { maxSimilarity: number; matchedStudentName?: string }>>({})
  const [activeTab, setActiveTab] = useState<'manage' | 'grade'>('manage')

  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGrade, setAiGrade] = useState('8')
  const [aiSubject, setAiSubject] = useState('Математика')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiError, setAiError] = useState('')

  const handleCheckPlagiarism = (subId: string, description: string) => {
    const result = checkPlagiarism(subId, description, submissions)
    setPlagiarismResults(prev => ({ ...prev, [subId]: result }))
  }

  const generateProjectWithAI = async () => {
    if (!aiPrompt.trim()) return
    setGeneratingAI(true)
    setAiError('')
    try {
      const prompt = `Жоба тақырыбы бойынша жаңа жоба ұсынысын қазақ тілінде жаса.
Бағыты немесе тақырыбы: "${aiPrompt}"
Пән: "${aiSubject}"
Сыныбы: "${aiGrade}"

Тапсырма форматы JSON түрінде келесі құрылыммен болуы керек (тек таза JSON қайтар, басқа ештеңе жазба, ешқандай \`\`\`json белгілері керек емес):
{
  "title": "Жоба атауы",
  "description": "Жобаның толық сипаттамасы мен мақсаты",
  "requirements": "Жобаға қойылатын талаптар мен тапсыру критерийлері"
}`

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      })

      if (!response.ok) {
        throw new Error('ЖИ жоба генерациялай алмады. Сервер қатесі.')
      }

      const data = await response.json()
      if (data.response) {
        let cleanText = data.response.trim()
        cleanText = cleanText.replace(/^```json/i, '').replace(/```$/, '').trim()
        const parsed = JSON.parse(cleanText)

        setForm({
          title: parsed.title || '',
          description: parsed.description || '',
          requirements: parsed.requirements || '',
          deadline: form.deadline
        })
        setShowAIPanel(false)
      } else {
        throw new Error('Жауап бос келді.')
      }
    } catch (err: any) {
      setAiError(err.message || 'Белгісіз қате шықты. Басқаша сұрап көріңіз.')
    } finally {
      setGeneratingAI(false)
    }
  }

  const load = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', profile.id)
      .order('created_at', { ascending: false })
    setProjects(data || [])
  }

  useEffect(() => {
    if (profile) {
      load()
    }
  }, [profile])

  const loadSubs = async (pid: string) => {
    setSelectedProject(pid)
    const { data } = await supabase.from('project_submissions').select('*, profiles!project_submissions_student_id_fkey(full_name)').eq('project_id', pid)
    setSubmissions(data || [])
  }

  const handleCreate = async () => {
    if (!profile) return
    setSaving(true)
    await supabase.from('projects').insert({ ...form, created_by: profile.id, deadline: form.deadline || null })
    setShowForm(false)
    setSaving(false)
    setForm({ title: '', description: '', requirements: '', deadline: '' })
    load()
  }

  const handleGrade = async (subId: string, scores: Record<string, number>, feedbackText: string) => {
    if (!profile) return
    setSaving(true)
    const total = Object.values(scores).reduce((a: number, b: number) => a + b, 0)
    await supabase.from('project_submissions').update({ scores: scores, total_score: total, feedback: feedbackText, graded_by: profile.id }).eq('id', subId)
    
    const sub = submissions.find(s => s.id === subId)
    if (sub) {
      await updateUserXP(supabase, sub.student_id, total)

      const projectTitle = projects.find(p => p.id === selectedProject)?.title || 'Жоба'
      await notifyGraded(supabase, sub.student_id, projectTitle, total)

      await calculateCreativeScore(supabase, sub.student_id)
    }

    setGrading(null)
    setSaving(false)
    if (selectedProject) loadSubs(selectedProject)
  }

  const proj = projects.find(p => p.id === selectedProject)
  const crit = proj?.criteria || [
    { name: 'Идея', max: 10 },
    { name: 'Креативтілік', max: 10 },
    { name: 'Шешім', max: 10 },
    { name: 'Қолданбалығы', max: 10 }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#0F172A]">Жобалар кабинеті</h1>
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
          📋 Жобалар тізімі
        </button>
        <button
          onClick={() => {
            setActiveTab('grade')
            if (projects.length > 0 && !selectedProject) {
              loadSubs(projects[0].id)
            }
          }}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'grade'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          🔎 Жұмыстарды тексеру
        </button>
      </div>

      {activeTab === 'manage' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F172A]">Ұсынылған жобалар</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-xl hover:bg-[#4338CA] transition-colors"
            >
              <Plus className="w-4 h-4" /> Жаңа жоба
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <h3 className="font-semibold text-sm text-[#0F172A]">Жоба параметрлері</h3>
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className="text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EEF2FF] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" /> {showAIPanel ? 'Қолмен жазу режимі' : 'ЖИ көмегімен жасау'}
                </button>
              </div>

              {showAIPanel && (
                <div className="bg-gradient-to-r from-[#F5F3FF] to-[#EEF2FF] p-4 rounded-xl border border-[#DDD6FE] space-y-3">
                  <div className="text-xs font-bold text-[#7C3AED] flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Жасанды Интеллектпен жоба идеясын генерациялау</span>
                  </div>
                  
                  {aiError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
                      {aiError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#64748B] block mb-1">Пән</label>
                      <select
                        value={aiSubject}
                        onChange={e => setAiSubject(e.target.value)}
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
                        value={aiGrade}
                        onChange={e => setAiGrade(e.target.value)}
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
                  </div>

                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-[#64748B] block mb-1">Жоба бағыты немесе тақырыбы</label>
                    <input
                      type="text"
                      placeholder="Мысалы: Жасанды интеллектті білімде қолдану, Экология, Робототехника"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={generateProjectWithAI}
                      disabled={generatingAI || !aiPrompt.trim()}
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
                          Жоба генерациялау
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Тақырып</label>
                  <input placeholder="Тақырып" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Сипаттама</label>
                  <textarea placeholder="Жоба сипаттамасы мен мақсаты" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Талаптар мен Критерийлер</label>
                  <textarea placeholder="Жобаға қойылатын талаптар мен критерийлер" value={form.requirements} onChange={e=>setForm(f=>({...f,requirements:e.target.value}))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#64748B] block mb-0.5">Дедлайн</label>
                  <input type="datetime-local" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"/>
                </div>
              </div>
              
              <button onClick={handleCreate} disabled={saving||!form.title} className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-[#4F46E5]/10 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Құру'}
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {projects.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-[#0F172A] text-base mb-2">{p.title}</h3>
                  <p className="text-xs text-[#64748B] line-clamp-3 mb-4 whitespace-pre-wrap">{p.description}</p>
                </div>
                {p.deadline && (
                  <div className="border-t border-[#F1F5F9] pt-3 text-xs text-[#64748B]">
                    Дедлайн: {new Date(p.deadline).toLocaleDateString('kk')}
                  </div>
                )}
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-2 text-center py-12 text-[#94A3B8] text-sm">
                Жобалар әлі жасалмаған. Жаңа жоба құру үшін жоғарыдағы батырманы басыңыз.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-[#64748B] block mb-2">Жобаны таңдаңыз</label>
            <select
              value={selectedProject || ''}
              onChange={e => {
                const val = e.target.value
                if (val) {
                  loadSubs(val)
                } else {
                  setSelectedProject(null)
                  setSubmissions([])
                }
              }}
              className="w-full max-w-md px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A] font-medium"
            >
              <option value="">-- Жобаны таңдаңыз --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
                <span className="font-bold text-sm text-[#0F172A]">Оқушы жұмыстары тізімі</span>
                <span className="text-xs font-bold text-[#64748B]">{submissions.length} жіберілді</span>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {submissions.map(s => (
                  <div key={s.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-sm text-[#0F172A]">
                        {s.profiles?.full_name}{s.team_name ? ` (${s.team_name})` : ''}
                      </span>
                      {s.total_score != null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-xl">
                            Бағаланды: {s.total_score} б
                          </span>
                          <button
                            onClick={() => setGrading(grading?.id === s.id ? null : { id: s.id, scores: s.scores || {}, feedback: s.feedback || '' })}
                            className="text-xs text-[#64748B] hover:text-[#4F46E5] hover:underline"
                          >
                            Өзгерту
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setGrading(grading?.id === s.id ? null : { id: s.id, scores: {}, feedback: '' })}
                          className="text-xs text-white bg-[#4F46E5] hover:bg-[#4338CA] px-3.5 py-1.5 font-semibold rounded-xl transition-colors"
                        >
                          Бағалау
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-[#64748B] bg-slate-50 p-3.5 border border-slate-200 rounded-xl whitespace-pre-wrap leading-relaxed shadow-inner mb-3">
                      {s.description}
                    </p>

                    <div className="flex gap-4">
                      {s.link_url && (
                        <a href={s.link_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-700 underline flex items-center gap-1 font-medium">
                          <Link2 className="w-3.5 h-3.5"/> Жоба сілтемесі
                        </a>
                      )}
                      {s.file_url && (
                        <a href={s.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#4F46E5] hover:text-[#4338CA] underline font-bold flex items-center gap-1">
                          📥 Жүктелген файлды көру
                        </a>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => handleCheckPlagiarism(s.id, s.description)}
                        className="text-[10px] font-bold text-slate-500 hover:text-[#4F46E5] bg-slate-100 hover:bg-[#EEF2FF] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        🔎 Плагиат тексеру
                      </button>
                      {plagiarismResults[s.id] !== undefined && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          plagiarismResults[s.id].maxSimilarity >= 70
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : plagiarismResults[s.id].maxSimilarity >= 30
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-green-50 text-green-600 border border-green-100'
                        }`}>
                          Ұқсастық: {plagiarismResults[s.id].maxSimilarity}%
                          {plagiarismResults[s.id].maxSimilarity > 0 && ` (${plagiarismResults[s.id].matchedStudentName})`}
                        </span>
                      )}
                    </div>

                    {grading?.id === s.id && grading && (
                      <ProjectGradingForm
                        submissionId={s.id}
                        criteria={crit}
                        initialScores={grading.scores}
                        initialFeedback={grading.feedback}
                        saving={saving}
                        onGrade={async (scores, feedback) => {
                          await handleGrade(s.id, scores, feedback)
                        }}
                        onCancel={() => setGrading(null)}
                      />
                    )}
                  </div>
                ))}
                {submissions.length === 0 && (
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
