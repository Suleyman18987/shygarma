'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BookOpen, Trophy, BarChart3, Gamepad2, ArrowRight, Star, Users, Award } from 'lucide-react'

export default function LandingPage() {
  const [supabase] = useState(() => createClient())
  const [stats, setStats] = useState({ students: 0, olympiads: 0, projects: 0 })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { count: studentCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
        
        const { count: olympiadCount } = await supabase
          .from('olympiads')
          .select('*', { count: 'exact', head: true })

        const { count: projectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })

        setStats({
          students: studentCount || 0,
          olympiads: olympiadCount || 0,
          projects: projectCount || 0
        })
      } catch (e) {
        console.error('Error fetching landing page stats:', e)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 lg:px-16 py-4 bg-white border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-[#0F172A]">DarynSpace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-[#4F46E5] hover:bg-[#EEF2FF] rounded-xl transition-colors">
            Кіру
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl transition-colors">
            Тіркелу
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-16 py-20 lg:py-28 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#EEF2FF] rounded-full text-sm text-[#4F46E5] font-medium mb-6">
          <Star className="w-4 h-4" /> Шығармашылық платформа
        </div>
        <h1 className="text-4xl lg:text-6xl font-extrabold text-[#0F172A] leading-tight mb-6">
          Олимпиадалар, жобалар,{' '}
          <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
            шығармашылық
          </span>
        </h1>
        <p className="text-lg text-[#64748B] max-w-2xl mx-auto mb-10">
          Білім алушылардың шығармашылық белсенділігін арттыруға арналған заманауи платформа. 
          Олимпиадалар өткізіңіз, жобаларды бағалаңыз, прогресті бақылаңыз.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl transition-colors shadow-lg shadow-indigo-200">
            Бастау <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="px-8 py-3.5 text-base font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] hover:border-[#4F46E5] rounded-xl transition-colors">
            Кіру
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 lg:px-16 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6">
          {[
            { icon: Users, label: 'Оқушылар', value: stats.students },
            { icon: Trophy, label: 'Олимпиадалар', value: stats.olympiads },
            { icon: Award, label: 'Жобалар', value: stats.projects },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center hover:shadow-md transition-shadow">
              <s.icon className="w-8 h-8 mx-auto text-[#4F46E5] mb-3" />
              <div className="text-2xl font-bold text-[#0F172A]">{s.value}</div>
              <div className="text-sm text-[#64748B]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-16 py-20 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#0F172A] mb-12">Мүмкіндіктер</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Trophy, title: 'Олимпиадалар', desc: 'Тест, қысқа жауап, шығармашылық есептер', color: '#4F46E5', bg: '#EEF2FF' },
              { icon: BookOpen, title: 'Жобалар', desc: 'Жоба жарыстарын ұйымдастыру және бағалау', color: '#7C3AED', bg: '#F5F3FF' },
              { icon: BarChart3, title: 'Прогресс', desc: 'Графиктер, аналитика, Creative Score', color: '#10B981', bg: '#ECFDF5' },
              { icon: Gamepad2, title: 'Геймификация', desc: 'XP, деңгейлер, бейдждер, рейтинг', color: '#F59E0B', bg: '#FFFBEB' },
            ].map((f, i) => (
              <div key={i} className="bg-[#F8FAFC] rounded-2xl p-6 hover:shadow-md transition-shadow border border-[#E2E8F0]">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: f.bg }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-[#0F172A] mb-2">{f.title}</h3>
                <p className="text-sm text-[#64748B]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="px-6 lg:px-16 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-[#0F172A] mb-12">Әр рөлге арналған</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { role: '👨‍🏫 Мұғалім', items: ['Тапсырма беру', 'Олимпиада құру', 'Бағалау', 'Прогресс бақылау'] },
            { role: '🧑‍🎓 Оқушы', items: ['Олимпиадаға қатысу', 'Жоба жіберу', 'Рейтинг', 'Creative Score'] },
            { role: '👨‍💼 Админ', items: ['Қолданушыларды басқару', 'Аналитика', 'Контент басқару', 'Жүйені бақылау'] },
            { role: '👪 Ата-ана', items: ['Бала нәтижесі', 'Прогресс', 'Хабарламалар', 'Бақылау'] },
          ].map((r, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">{r.role}</h3>
              <ul className="space-y-2">
                {r.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-[#64748B]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-16 py-8 border-t border-[#E2E8F0] text-center text-sm text-[#94A3B8]">
        © 2026 Bibigul Tulekova. Барлық құқықтар қорғалған.
      </footer>
    </div>
  )
}
