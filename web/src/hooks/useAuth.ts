import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, auth } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        setError(null)

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
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
      }
    }

    getInitialSession()

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event)
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
          setError(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

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
    signInWithGoogle
  }
}