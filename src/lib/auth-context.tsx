'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  authError: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Supabase profile fetch error:', error)
      }
        
      if (data && !error) {
        setProfile(data as Profile)
      } else {
        setProfile(null)
      }
    } catch (e) {
      console.error('Unexpected error fetching profile:', e)
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    // Hard timeout: loading never gets stuck more than 6s
    const timeout = setTimeout(() => setLoading(false), 6000)

    let subscription: { unsubscribe: () => void } | null = null
    let mounted = true

    const init = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) setAuthError(userError.message)
        
        if (user) {
          setUser(user)
          await fetchProfile(user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (e: any) {
        setAuthError(e?.message || 'Unknown error')
        setUser(null)
        setProfile(null)
      } finally {
        clearTimeout(timeout)
        if (mounted) setLoading(false)
      }
    }

    init().then(() => {
      if (!mounted) return
      
      // Secondary: listen for future auth events AFTER init to avoid lock race condition
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT') {
            setUser(null)
            setProfile(null)
          } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          }
        }
      )
      subscription = data.subscription
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, authError, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
