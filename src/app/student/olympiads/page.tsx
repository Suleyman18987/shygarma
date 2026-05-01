'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Clock, Users as UsersIcon, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function StudentOlympiadsPage() {
  const supabase = createClient()
  const [olympiads, setOlympiads] = useState<any[]>([])
  const [tab, setTab] = useState<'active' | 'finished'>('active')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('olympiads')
        .select('*')
        .eq('status', tab)
        .order('created_at', { ascending: false })
      setOlympiads(data || [])
    }
    load()
  }, [tab])

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Олимпиадалар 🏆</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('active')} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === 'active' ? 'bg-[#4F46E5] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B]'}`}>
          Белсенді
        </button>
        <button onClick={() => setTab('finished')} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === 'finished' ? 'bg-[#4F46E5] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B]'}`}>
          Аяқталған
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {olympiads.map(o => (
          <Link key={o.id} href={`/student/olympiads/${o.id}`} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <span className={`px-2 py-1 text-xs font-medium rounded-lg ${o.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {o.status === 'active' ? 'Белсенді' : 'Аяқталған'}
              </span>
            </div>
            <h3 className="font-semibold text-[#0F172A] mb-2 group-hover:text-[#4F46E5] transition-colors">{o.title}</h3>
            <p className="text-sm text-[#64748B] mb-4 line-clamp-2">{o.description || 'Сипаттама жоқ'}</p>
            {o.end_time && (
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <Clock className="w-3.5 h-3.5" />
                {new Date(o.end_time).toLocaleDateString('kk')} дейін
              </div>
            )}
            <div className="mt-3 flex items-center gap-1 text-sm text-[#4F46E5] font-medium">
              Қатысу <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
        {olympiads.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-[#94A3B8]">
            Олимпиадалар жоқ
          </div>
        )}
      </div>
    </div>
  )
}
