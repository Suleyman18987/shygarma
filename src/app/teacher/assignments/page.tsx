'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, CheckCircle } from 'lucide-react'

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

  const loadAssignments = async () => {
    const { data } = await supabase.from('assignments').select('*').order('created_at', { ascending: false })
    setAssignments(data || [])
  }

  useEffect(() => { loadAssignments() }, [])

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
    await supabase.from('assignments').insert({
      ...form, created_by: profile.id, deadline: form.deadline || null, max_score: Number(form.max_score),
    })
    setForm({ title: '', description: '', deadline: '', max_score: 100 })
    setShowForm(false)
    setSaving(false)
    loadAssignments()
  }

  const handleGrade = async () => {
    if (!grading || !profile) return
    setSaving(true)
    await supabase.from('assignment_submissions').update({
      score: Number(grading.score), feedback: grading.feedback, graded_by: profile.id, graded_at: new Date().toISOString(),
    }).eq('id', grading.id)

    // Add XP to student
    const sub = submissions.find(s => s.id === grading.id)
    if (sub) {
      const { data: studentProfile } = await supabase.from('profiles').select('xp').eq('id', sub.student_id).single()
      if (studentProfile) {
        await supabase.from('profiles').update({ xp: studentProfile.xp + Number(grading.score) }).eq('id', sub.student_id)
      }
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
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6 space-y-3">
          <input type="text" placeholder="Тақырып" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
          <textarea placeholder="Сипаттама" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
          <div className="flex gap-3">
            <input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="flex-1 px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
            <input type="number" placeholder="Max балл" value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: Number(e.target.value) }))} className="w-32 px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]" />
          </div>
          <button onClick={handleCreate} disabled={saving || !form.title} className="px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-xl disabled:opacity-50">
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
