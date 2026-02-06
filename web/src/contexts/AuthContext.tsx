import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useAuth } from '../hooks/useAuth'
import { profileService } from '../services/profileService'
import { connectionService } from '../services/connectionService'
import { analyticsService } from '../services/analyticsService'
import { iso2ToIso3 } from '../utils/countryMapping'

interface AuthContextType {
  user: User | null
  profile: any | null
  isAdmin: boolean
  loading: boolean
  error: string | null
  userConnections: Record<string, string>
  refreshUserConnections: () => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<any>
  verifyOTP: (email: string, token: string, type?: 'signup' | 'recovery') => Promise<any>
  resendOTP: (email: string) => Promise<any>
  resetPassword: (email: string) => Promise<any>
  updateProfile: (updates: any) => Promise<void>
  updatePassword: (password: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, error: authError, signUp, signIn, signInWithGoogle, signOut, verifyOTP, resendOTP, resetPassword, updatePassword } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userConnections, setUserConnections] = useState<Record<string, string>>({})

  const refreshUserConnections = async () => {
    if (!user) return

    try {
      const connections = await connectionService.getConnections()
      const connectionsMap: Record<string, string> = {}

      connections.forEach((connection: any) => {
        if (connection.requester_id === user.id) {
          if (connection.status === 'pending') {
            connectionsMap[connection.addressee_id] = 'pending_sent'
          } else if (connection.status === 'accepted') {
            connectionsMap[connection.addressee_id] = 'connected'
          }
        } else if (connection.addressee_id === user.id) {
          if (connection.status === 'pending') {
            connectionsMap[connection.requester_id] = 'pending_received'
          } else if (connection.status === 'accepted') {
            connectionsMap[connection.requester_id] = 'connected'
          }
        }
      })

      setUserConnections(connectionsMap)
    } catch (err) {
      console.error('Error refreshing user connections:', err)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      // Clear any previous errors when starting fresh
      setError(null)

      if (user && user.email_confirmed_at) {
        // Only fetch if we don't have a profile yet or the user ID changed
        if (!profile || profile.id !== user.id) {
          try {
            setLoading(true)
            // Load connections in parallel
            refreshUserConnections()

            const userProfile = await profileService.getCurrentProfile()

            if (userProfile) {
              setProfile(userProfile)
            } else {
              // Profile doesn't exist, create it immediately
              const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
              const isEU = localStorage.getItem('is_eu_user') === 'true';

              try {
                // Create profile first with null country
                const newProfile = await profileService.createProfile({
                  id: user.id,
                  email: user.email!,
                  full_name: fullName,
                  is_eu_user: isEU,
                  country_code: null
                })
                setProfile(newProfile)

                // Track EU signup for GDPR-compliant analytics
                if (isEU) {
                  analyticsService.trackEUSignup();
                }

                // Non-blocking IP fetch for country detection
                fetch('https://ipapi.co/json/')
                  .then(res => res.json())
                  .then(async (data) => {
                    if (data && data.country_code) {
                      const countryCode = iso2ToIso3(data.country_code);
                      if (countryCode) {
                        await profileService.updateProfile(user.id, { country_code: countryCode });
                        // Update local state if needed, or let next fetch handle it
                        setProfile((prev: any) => ({ ...prev, country_code: countryCode }));
                      }
                    }
                  })
                  .catch(err => console.log('Background country detection failed:', err));

              } catch (createError: any) {
                console.error('Error creating profile:', createError)
                setError('Failed to create user profile')
              }
            }
          } catch (error: any) {
            console.error('Error loading profile:', error)
            setError('Failed to load user profile')
          } finally {
            setLoading(false)
          }
        }
      } else {
        setProfile(null)
        setUserConnections({})
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadProfile()
    }
  }, [user?.id, authLoading])

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
    isAdmin: profile?.role === 'admin',
    loading: authLoading || loading,
    error: combinedError,
    userConnections,
    refreshUserConnections,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    verifyOTP,
    resendOTP,
    resetPassword,
    updateProfile,
    updatePassword
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