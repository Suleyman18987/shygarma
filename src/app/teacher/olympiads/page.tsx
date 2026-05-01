'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2, Trash2 } from 'lucide-react'

export default function TeacherOlympiadsPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [olympiads, setOlympiads] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '' })
  const [problems, setProblems] = useState<any[]>([])
  const [pForm, setPForm] = useState({ title: '', description: '', type: 'test', points: 10, options: '', correct_answer: '' })
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [existingProblems, setExistingProblems] = useState<any[]>([])

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">Олимпиадалар</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-xl"><Plus className="w-4 h-4" /> Жаңа</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-6 space-y-3">
          <input placeholder="Олимпиада атауы" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />
          <textarea placeholder="Сипаттама" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[60px]" />
          <div className="flex gap-3">
            <div className="flex-1"><label className="text-xs text-[#64748B]">Басталуы</label><input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" /></div>
            <div className="flex-1"><label className="text-xs text-[#64748B]">Аяқталуы</label><input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" /></div>
          </div>
          <hr className="border-[#E2E8F0]" />
          <h3 className="font-semibold text-sm text-[#0F172A]">Есептер ({problems.length})</h3>
          <div className="space-y-2">
            <input placeholder="Есеп атауы" value={pForm.title} onChange={e => setPForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />
            <textarea placeholder="Шарт" value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm min-h-[50px]" />
            <div className="flex gap-2">
              <select value={pForm.type} onChange={e => setPForm(f => ({ ...f, type: e.target.value }))} className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm">
                <option value="test">Тест</option><option value="short_answer">Қысқа жауап</option><option value="creative">Шығармашылық</option>
              </select>
              <input type="number" placeholder="Балл" value={pForm.points} onChange={e => setPForm(f => ({ ...f, points: +e.target.value }))} className="w-20 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />
            </div>
            {pForm.type === 'test' && <input placeholder="Нұсқалар (1-ші дұрыс, үтірмен бөлу)" value={pForm.options} onChange={e => setPForm(f => ({ ...f, options: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />}
            {pForm.type === 'short_answer' && <input placeholder="Дұрыс жауап" value={pForm.correct_answer} onChange={e => setPForm(f => ({ ...f, correct_answer: e.target.value }))} className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm" />}
            <button onClick={addProblem} disabled={!pForm.title} className="px-4 py-2 text-sm bg-[#EEF2FF] text-[#4F46E5] rounded-xl font-medium disabled:opacity-50">+ Есеп қосу</button>
          </div>
          {problems.map((p, i) => <div key={i} className="bg-[#F8FAFC] rounded-xl p-3 text-sm flex justify-between"><span>{i + 1}. {p.title} ({p.type}) — {p.points}б</span><button onClick={() => setProblems(problems.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-red-400" /></button></div>)}
          <button onClick={handleCreate} disabled={saving || !form.title} className="px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-xl disabled:opacity-50">{saving ? '...' : 'Құру'}</button>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {olympiads.map(o => (
            <div key={o.id} onClick={() => selectOly(o.id)} className={`bg-white rounded-2xl border p-4 cursor-pointer ${selectedId === o.id ? 'border-[#4F46E5] shadow-md' : 'border-[#E2E8F0]'}`}>
              <div className="flex justify-between"><h3 className="font-semibold text-sm">{o.title}</h3><span className={`text-xs px-2 py-0.5 rounded-lg ${o.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{o.status}</span></div>
            </div>
          ))}
        </div>
        {selectedId && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0]">
            <div className="px-5 py-3 border-b border-[#E2E8F0] font-semibold text-sm">Есептер</div>
            <div className="divide-y divide-[#E2E8F0]">
              {existingProblems.map((p, i) => (
                <div key={p.id} className="px-5 py-3"><span className="text-sm font-medium">{i + 1}. {p.title}</span><span className="text-xs text-[#64748B] ml-2">({p.type}, {p.points}б)</span></div>
              ))}
              {existingProblems.length === 0 && <div className="p-6 text-center text-xs text-[#94A3B8]">Есептер жоқ</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
