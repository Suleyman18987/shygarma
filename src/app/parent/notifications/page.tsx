'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Bell, Check } from 'lucide-react'

export default function ParentNotificationsPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [notifs, setNotifs] = useState<any[]>([])

  useEffect(() => {
    if (profile) supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).then(({ data }) => setNotifs(data || []))
  }, [profile])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Хабарламалар 🔔</h1>
      <div className="space-y-3">
        {notifs.map(n => (
          <div key={n.id} className={`bg-white rounded-2xl border p-4 flex items-start gap-3 ${n.is_read ? 'border-[#E2E8F0]' : 'border-[#4F46E5] bg-[#EEF2FF]'}`}>
            <Bell className="w-5 h-5 text-[#4F46E5] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-sm text-[#0F172A]">{n.title}</div>
              <div className="text-xs text-[#64748B] mt-0.5">{n.message}</div>
              <div className="text-xs text-[#94A3B8] mt-1">{new Date(n.created_at).toLocaleString('kk')}</div>
            </div>
            {!n.is_read && <button onClick={() => markRead(n.id)} className="p-1 hover:bg-[#EEF2FF] rounded-lg"><Check className="w-4 h-4 text-[#4F46E5]" /></button>}
          </div>
        ))}
        {notifs.length === 0 && <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-[#94A3B8]">Хабарламалар жоқ</div>}
      </div>
    </div>
  )
}
