'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, Link2 } from 'lucide-react'

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

  const load = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
  }
  useEffect(() => { load() }, [])

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
      const { data: studentProfile } = await supabase.from('profiles').select('xp, creative_score').eq('id', sub.student_id).single()
      if (studentProfile) {
        const newXp = studentProfile.xp + total
        const creativeBonus = (grading.scores['Креативтілік'] || 0) * 2
        await supabase.from('profiles').update({ 
          xp: newXp, 
          creative_score: (studentProfile.creative_score || 0) + creativeBonus 
        }).eq('id', sub.student_id)
      }
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
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6 space-y-3">
          <input placeholder="Тақырып" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm"/>
          <textarea placeholder="Сипаттама" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[80px]"/>
          <input type="datetime-local" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm"/>
          <button onClick={handleCreate} disabled={saving||!form.title} className="px-5 py-2.5 bg-[#4F46E5] text-white text-sm rounded-xl disabled:opacity-50">{saving?'...':'Құру'}</button>
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
