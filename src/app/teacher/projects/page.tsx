'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, Link2, Sparkles } from 'lucide-react'
import { updateUserXP } from '@/lib/xp-utils'
import { notifyGraded } from '@/lib/notification-utils'
import { calculateCreativeScore } from '@/lib/creative-score'

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

  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGrade, setAiGrade] = useState('8')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiError, setAiError] = useState('')

  const generateProjectWithAI = async () => {
    if (!aiPrompt.trim()) return
    setGeneratingAI(true)
    setAiError('')
    try {
      const prompt = `Жоба тақырыбы бойынша жаңа жоба ұсынысын қазақ тілінде жаса.
Бағыты немесе тақырыбы: "${aiPrompt}"
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
    setShowForm(false); setSaving(false); setForm({ title: '', description: '', requirements: '', deadline: '' }); load()
  }

  const handleGrade = async () => {
    if (!grading || !profile) return
    setSaving(true)
    const total = Object.values(grading.scores as Record<string,number>).reduce((a:number,b:number)=>a+b,0)
    await supabase.from('project_submissions').update({ scores: grading.scores, total_score: total, feedback: grading.feedback, graded_by: profile.id }).eq('id', grading.id)
    
    const sub = submissions.find(s => s.id === grading.id)
    if (sub) {
      // 1. Add XP + check levels/badges via updateUserXP
      await updateUserXP(supabase, sub.student_id, total)

      // 2. Notify student & parent of grade
      const projectTitle = projects.find(p => p.id === selectedProject)?.title || 'Жоба'
      await notifyGraded(supabase, sub.student_id, projectTitle, total)

      // 3. Recalculate Creative Score (which updates creative_score in profiles)
      await calculateCreativeScore(supabase, sub.student_id)
    }

    setGrading(null); setSaving(false)
    if (selectedProject) loadSubs(selectedProject)
  }

  const proj = projects.find(p=>p.id===selectedProject)
  const crit = proj?.criteria || [{name:'Идея',max:10},{name:'Креативтілік',max:10},{name:'Шешім',max:10},{name:'Қолданбалығы',max:10}]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Жобалар</h1>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-xl"><Plus className="w-4 h-4"/>Жаңа</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <h3 className="font-semibold text-sm text-[#0F172A]">Жоба құру</h3>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#F5F3FF] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" /> {showAIPanel ? 'Қолмен жазу режимі' : 'ЖИ көмегімен жасау'}
            </button>
          </div>

          {showAIPanel ? (
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-[#64748B] block mb-1">Жоба бағыты немесе тақырыбы</label>
                  <input
                    type="text"
                    placeholder="Мысалы: Жасанды интеллектті білімде қолдану, Экология, Робототехника"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5] text-[#0F172A]"
                  />
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
          ) : null}

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
          <button onClick={handleCreate} disabled={saving||!form.title} className="px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-[#4F46E5]/10 cursor-pointer">{saving?'...':'Құру'}</button>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {projects.map(p=>(
            <div key={p.id} onClick={()=>loadSubs(p.id)} className={`bg-white rounded-2xl border p-4 cursor-pointer ${selectedProject===p.id?'border-[#4F46E5] shadow-md':'border-[#E2E8F0]'}`}>
              <h3 className="font-semibold text-sm text-[#0F172A]">{p.title}</h3>
            </div>
          ))}
        </div>
        {selectedProject && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0]">
            <div className="px-5 py-3 border-b border-[#E2E8F0] font-semibold text-sm">Жұмыстар</div>
            <div className="divide-y divide-[#E2E8F0]">
              {submissions.map(s=>(
                <div key={s.id} className="p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-sm">{s.profiles?.full_name}{s.team_name?` (${s.team_name})`:''}</span>
                    {s.total_score!=null?<span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">{s.total_score}</span>:
                    <button onClick={()=>setGrading({id:s.id,scores:{},feedback:''})} className="text-xs text-[#4F46E5]">Бағалау</button>}
                  </div>
                  <p className="text-xs text-[#64748B] mb-2">{s.description}</p>
                  <div className="flex gap-2">
                    {s.link_url && <a href={s.link_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline flex items-center gap-1"><Link2 className="w-3 h-3"/> Жоба сілтемесі</a>}
                    {s.file_url && <a href={s.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#4F46E5] underline font-medium">📥 Жүктелген файл</a>}
                  </div>
                  {grading?.id===s.id&&(
                    <div className="mt-3 border-t pt-3 space-y-2">
                      {crit.map((c:any)=>(
                        <div key={c.name}><label className="text-xs text-[#64748B]">{c.name} (0-{c.max})</label>
                        <input type="range" min="0" max={c.max} value={grading.scores[c.name]||0} onChange={e=>setGrading((g:any)=>({...g,scores:{...g.scores,[c.name]:+e.target.value}}))} className="w-full accent-[#4F46E5]"/>
                        <span className="text-sm text-[#4F46E5]">{grading.scores[c.name]||0}</span></div>
                      ))}
                      <textarea placeholder="Кері байланыс" value={grading.feedback} onChange={e=>setGrading((g:any)=>({...g,feedback:e.target.value}))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm"/>
                      <button onClick={handleGrade} className="px-4 py-2 bg-[#10B981] text-white text-sm rounded-xl">Бағалау</button>
                    </div>
                  )}
                </div>
              ))}
              {submissions.length===0&&<div className="p-6 text-center text-xs text-[#94A3B8]">Жұмыстар жоқ</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
