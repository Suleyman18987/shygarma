'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Clock, Upload, Loader2, Link2, ArrowRight } from 'lucide-react'

export default function StudentProjectsPage() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [projects, setProjects] = useState<any[]>([])
  const [subs, setSubs] = useState<Record<string, any>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState({ description: '', link_url: '', team_name: '' })
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      setProjects(data || [])
      if (profile) {
        const { data: s } = await supabase.from('project_submissions').select('*').eq('student_id', profile.id)
        const map: Record<string, any> = {}
        s?.forEach(sub => { map[sub.project_id] = sub })
        setSubs(map)
      }
    }
    load()
  }, [profile])

  const handleSubmit = async (projectId: string) => {
    if (!profile) return
    setSubmitting(true)
    let fileUrl = null
    
    if (file) {
      const ext = file.name.split('.').pop()
      const fileName = `${profile.id}_${Date.now()}.${ext}`
      const { data: uploadData, error } = await supabase.storage.from('projects').upload(fileName, file)
      if (!error && uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('projects').getPublicUrl(uploadData.path)
        fileUrl = publicUrl
      }
    }

    const { data } = await supabase.from('project_submissions').insert({
      project_id: projectId, student_id: profile.id, file_url: fileUrl, ...form,
    }).select().single()
    if (data) setSubs(prev => ({ ...prev, [projectId]: data }))
    setOpenId(null)
    setForm({ description: '', link_url: '', team_name: '' })
    setFile(null)
    setSubmitting(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Жобалар 🚀</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {projects.map(p => {
          const sub = subs[p.id]
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <h3 className="font-semibold text-[#0F172A] mb-2">{p.title}</h3>
              <p className="text-sm text-[#64748B] mb-3 line-clamp-3">{p.description}</p>
              {p.requirements && <p className="text-xs text-[#94A3B8] mb-3">Талаптар: {p.requirements}</p>}
              {p.deadline && (
                <div className="flex items-center gap-1.5 text-xs text-[#F59E0B] mb-3">
                  <Clock className="w-3.5 h-3.5" /> Дедлайн: {new Date(p.deadline).toLocaleDateString('kk')}
                </div>
              )}

              {sub ? (
                <div className="bg-[#F8FAFC] rounded-xl p-3 text-sm">
                  <div className="text-green-600 font-medium mb-1">✅ Жоба жіберілді</div>
                  {sub.total_score !== null && <div className="text-[#4F46E5] font-medium">Балл: {sub.total_score}</div>}
                  {sub.feedback && <div className="text-[#64748B] mt-1">{sub.feedback}</div>}
                </div>
              ) : openId === p.id ? (
                <div className="space-y-3 border-t border-[#E2E8F0] pt-3">
                  <input type="text" placeholder="Топ атауы (міндетті емес)" value={form.team_name} onChange={e => setForm(f => ({ ...f, team_name: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                  <textarea placeholder="Жоба сипаттамасы" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                  <input type="url" placeholder="Сілтеме (GitHub, YouTube, т.б.)" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[#64748B] ml-1">Файл жүктеу (PDF, DOCX, ZIP)</label>
                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EEF2FF] file:text-[#4F46E5] hover:file:bg-[#E0E7FF]" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleSubmit(p.id)} disabled={submitting || !form.description} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-xl disabled:opacity-50">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Жіберу
                    </button>
                    <button onClick={() => setOpenId(null)} className="px-4 py-2 text-sm text-[#64748B] bg-[#F8FAFC] rounded-xl">Болдырмау</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOpenId(p.id)} className="flex items-center gap-2 text-sm text-[#4F46E5] font-medium hover:underline">
                  Қатысу <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
        {projects.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-[#94A3B8]">Жобалар жоқ</div>
        )}
      </div>
    </div>
  )
}
