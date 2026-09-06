import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  // 'loading' covers both "checking for an existing session" and
  // "fetching the staff row for that session" — the app shouldn't
  // render anything role-dependent until both are settled.
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)

  const loadStaffProfile = useCallback(async (userId) => {
    if (!userId) {
      setStaffProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('staff')
      .select('id, business_id, shop_id, name, role')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      setProfileError(error.message)
      setStaffProfile(null)
    } else if (!data) {
      // A valid Supabase Auth login with no matching staff row. This
      // happens if someone's auth user was created but the staff row
      // provisioning step was skipped (see SETUP.md step 5).
      setProfileError(
        'Your login exists but is not linked to a staff record yet. Ask an admin to set this up.'
      )
      setStaffProfile(null)
    } else {
      setProfileError(null)
      setStaffProfile(data)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      setSession(session)
      await loadStaffProfile(session?.user?.id)
      if (isMounted) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setLoading(true)
      await loadStaffProfile(session?.user?.id)
      setLoading(false)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadStaffProfile])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = {
    session,
    user: session?.user ?? null,
    staffProfile,
    profileError,
    loading,
    isOwnerOrAdmin: staffProfile?.role === 'owner' || staffProfile?.role === 'admin',
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
