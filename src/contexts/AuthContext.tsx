import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useAuth } from '../hooks/useAuth'
import { profileService } from '../services/profileService'

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  verifyOTP: (email: string, token: string) => Promise<any>
  resendOTP: (email: string) => Promise<any>
  resetPassword: (email: string) => Promise<any>
  updateProfile: (updates: any) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, error: authError, signUp, signIn, signOut, verifyOTP, resendOTP, resetPassword } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      // Clear any previous errors when starting fresh
      setError(null)
      
      if (user && user.email_confirmed_at) {
        try {
          const userProfile = await profileService.getCurrentProfile()
          
          if (userProfile) {
            setProfile(userProfile)
          } else {
            // Profile doesn't exist, create it
            const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
            try {
              const newProfile = await profileService.createProfile({
                id: user.id,
                email: user.email!,
                full_name: fullName
              })
              setProfile(newProfile)
            } catch (createError: any) {
              console.error('Error creating profile:', createError)
              setError('Failed to create user profile')
            }
          }
        } catch (error: any) {
          console.error('Error loading profile:', error)
          setError('Failed to load user profile')
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    }

    if (!authLoading) {
      loadProfile()
    }
  }, [user, authLoading])

  const updateProfile = async (updates: any) => {
    if (!user) return
    
    try {
      const updatedProfile = await profileService.updateProfile(user.id, updates)
      setProfile(updatedProfile)
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  // Combine auth error and profile error
  const combinedError = authError || error

  const value = {
    user,
    profile,
    loading: authLoading || loading,
    error: combinedError,
    signUp,
    signIn,
    signOut,
    verifyOTP,
    resendOTP,
    resetPassword,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}