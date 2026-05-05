'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Loader2 } from 'lucide-react'

export default function AdminOlympiadsPage() {
  const { profile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [olympiads, setOlympiads] = useState<any[]>([])

  useEffect(() => {
    supabase.from('olympiads').select('*').order('created_at', { ascending: false }).then(({ data }) => setOlympiads(data || []))
  }, [])

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'finished' : 'active'
    await supabase.from('olympiads').update({ status: next }).eq('id', id)
    setOlympiads(o => o.map(x => x.id === id ? { ...x, status: next } : x))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Олимпиадалар басқару</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {olympiads.map(o => (
          <div key={o.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm text-[#0F172A]">{o.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-lg ${o.status === 'active' ? 'bg-green-50 text-green-600' : o.status === 'finished' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-50 text-yellow-600'}`}>{o.status}</span>
            </div>
            <p className="text-xs text-[#64748B] mb-3 line-clamp-2">{o.description || 'Сипаттама жоқ'}</p>
            <button onClick={() => toggleStatus(o.id, o.status)} className="text-xs text-[#4F46E5] font-medium hover:underline">
              {o.status === 'active' ? 'Аяқтау' : 'Қайта ашу'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
