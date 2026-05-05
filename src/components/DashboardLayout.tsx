'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Trophy, ClipboardList, FolderKanban, BarChart3,
  Medal, Users, Settings, Bell, LogOut, Menu, X, Star, ChevronRight,
  Eye, UserCog
} from 'lucide-react'
import type { UserRole } from '@/lib/types'

const navItems: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Қолданушылар', href: '/admin/users', icon: Users },
    { label: 'Олимпиадалар', href: '/admin/olympiads', icon: Trophy },
    { label: 'Аналитика', href: '/admin/analytics', icon: BarChart3 },
  ],
  teacher: [
    { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
    { label: 'Менің сыныбым', href: '/teacher/my-class', icon: Users },
    { label: 'Тапсырмалар', href: '/teacher/assignments', icon: ClipboardList },
    { label: 'Жобалар', href: '/teacher/projects', icon: FolderKanban },
    { label: 'Олимпиадалар', href: '/teacher/olympiads', icon: Trophy },
  ],
  student: [
    { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { label: 'Олимпиадалар', href: '/student/olympiads', icon: Trophy },
    { label: 'Тапсырмалар', href: '/student/assignments', icon: ClipboardList },
    { label: 'Жобалар', href: '/student/projects', icon: FolderKanban },
    { label: 'Прогресс', href: '/student/progress', icon: BarChart3 },
    { label: 'Рейтинг', href: '/student/leaderboard', icon: Medal },
  ],
  parent: [
    { label: 'Dashboard', href: '/parent', icon: LayoutDashboard },
    { label: 'Бала прогресі', href: '/parent/child-progress', icon: Eye },
    { label: 'Хабарламалар', href: '/parent/notifications', icon: Bell },
  ],
}

export default function DashboardLayout({ children, role }: { children: React.ReactNode; role: UserRole }) {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !profile && !user) {
      router.push('/login')
    }
  }, [loading, profile, user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const items = navItems[role] || []
  const levelProgress = (profile.xp % 100) / 100

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[260px] bg-white border-r border-[#E2E8F0] z-50 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#E2E8F0]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#0F172A]">DarynSpace</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {items.map(item => {
            const isActive = pathname === item.href || (item.href !== `/${role}` && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#EEF2FF] text-[#4F46E5]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-[#E2E8F0]">
          <div className="bg-[#F8FAFC] rounded-xl p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-sm font-bold">
                {profile.full_name.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#0F172A] truncate">{profile.full_name || 'User'}</div>
                <div className="text-xs text-[#64748B] capitalize">{profile.role}</div>
              </div>
            </div>
            {profile.role === 'student' && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#64748B]">Level {profile.level}</span>
                  <span className="text-[#4F46E5] font-medium">{profile.xp} XP</span>
                </div>
                <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-full transition-all" style={{ width: `${levelProgress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full mt-3 px-3 py-2 text-sm text-[#EF4444] hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" /> Шығу
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-[#E2E8F0] px-4 lg:px-8 py-3 flex items-center gap-4">
          <button className="lg:hidden p-2 hover:bg-[#F8FAFC] rounded-xl" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-[#64748B]" />
          </button>
          <div className="flex-1" />
          {profile.role === 'student' && (
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2FF] rounded-lg">
                <span className="text-[#4F46E5] font-semibold">{profile.xp} XP</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F3FF] rounded-lg">
                <span className="text-[#7C3AED] font-semibold">CS: {Math.round(profile.creative_score)}</span>
              </div>
            </div>
          )}
          <button className="p-2 hover:bg-[#F8FAFC] rounded-xl relative">
            <Bell className="w-5 h-5 text-[#64748B]" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white text-sm font-bold">
            {profile.full_name.charAt(0).toUpperCase() || '?'}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
