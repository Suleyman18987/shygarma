'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError || !data?.user) {
        setError('Қате email немесе құпия сөз')
        setLoading(false)
        return
      }

      // Fetch profile to get role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        setError('Профиль табылмады. Қайтадан тіркеліп көріңіз.')
        setLoading(false)
        return
      }

      // Navigate — loading state stays true during navigation (intentional)
      router.push(`/${profile.role}`)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Белгісіз қате шықты'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center">
            <Star className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-[#0F172A]">DarynSpace</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2 text-center">Жүйеге кіру</h1>
          <p className="text-sm text-[#64748B] mb-6 text-center">Email және құпия сөзді енгізіңіз</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Құпия сөз</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Кіру'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#64748B] mt-6">
          Аккаунт жоқ па?{' '}
          <Link href="/register" className="text-[#4F46E5] font-medium hover:underline">Тіркелу</Link>
        </p>
        <p className="text-center mt-2">
          <Link href="/" className="text-sm text-[#94A3B8] hover:text-[#64748B]">← Басты бетке</Link>
        </p>
      </div>
    </div>
  )
}
