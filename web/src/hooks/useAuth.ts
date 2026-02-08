import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, auth } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref to prevent double-fetching in React 18 strict mode or rapid re-mounts
  const fetchingSession = useRef(false)

  useEffect(() => {
    let mounted = true

    // Get initial session with timeout
    const getInitialSession = async () => {
      // Prevent concurrent/duplicate fetches
      if (fetchingSession.current) return
      fetchingSession.current = true

      try {
        setError(null)

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 30000) // Increased to 30s as requested
        )

        const authPromise = auth.getCurrentUser()

        const { user } = await Promise.race([authPromise, timeoutPromise]) as any

        if (mounted) {
          setUser(user)
          setLoading(false)
        }
      } catch (error: any) {
        console.error('❌ Error getting initial session:', error)
        if (mounted) {
          setError(error.message || 'Failed to connect to authentication service')
          setLoading(false)
          // Set user to null so app can still render
          setUser(null)
        }
      } finally {
        // Reset local loading state if needed, but we keep fetchingSession true 
        // to prevent re-fetching on same mount (unless dependencies change)
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only react to specific, relevant events
        if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION' && event !== 'SIGNED_OUT' && event !== 'TOKEN_REFRESHED') {
          return
        }

        if (!mounted) return

        // Prevent flicker: only update if the user ID actually changed
        // OR if it's a sign-out event (session becomes null)
        const currentUserId = user?.id
        const newUserId = session?.user?.id

        if (currentUserId !== newUserId || event === 'SIGNED_OUT') {
          console.log('🔄 Auth state changed (Verified):', event)
          setUser(session?.user ?? null)
          setError(null)
        }

        // Always stop loading on these events
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [user]) // Add user to dependency array so we have fresh state

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setError(null)
      const { data, error } = await auth.signUp(email, password, userData)
      if (error) setError(error.message)
      return { data, error }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign up failed'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { data, error } = await auth.signIn(email, password)
      if (error) setError(error.message)
      return { data, error }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await auth.signOut()
      if (error) setError(error.message)
      return { error }
    } catch (error: any) {
      const errorMessage = error.message || 'Sign out failed'
      setError(errorMessage)
      return { error: { message: errorMessage } }
    }
  }

  const verifyOTP = async (email: string, token: string, type: 'signup' | 'recovery' = 'signup') => {
    try {
      setError(null)
      const { data, error } = await auth.verifyOTP(email, token, type)
      if (error) setError(error.message)
      return { data, error }
    } catch (error: any) {
      const errorMessage = error.message || 'OTP verification failed'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    }
  }

  const resendOTP = async (email: string) => {
    try {
      setError(null)
      const { data, error } = await auth.resendOTP(email)
      if (error) setError(error.message)
      return { data, error }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend OTP'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      const { data, error } = await auth.resetPassword(email)
      if (error) setError(error.message)
      return { data, error }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send password reset email'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    }
  }

  const signInWithGoogle = async () => {
    try {
      setError(null)
      const { data, error } = await auth.signInWithGoogle()
      if (error) setError(error.message)
      return { data, error }
    } catch (error: any) {
      const errorMessage = error.message || 'Google sign in failed'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      setError(null)
      const { data, error } = await auth.updatePassword(password)
      if (error) setError(error.message)
      return { data, error }
    } catch (error: any) {
      const errorMessage = error.message || 'Password update failed'
      setError(errorMessage)
      return { data: null, error: { message: errorMessage } }
    }
  }

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    verifyOTP,
    resendOTP,
    resetPassword,
    signInWithGoogle,
    updatePassword
  }
}