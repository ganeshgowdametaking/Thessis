import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Supabase Configuration Check:')
console.log('URL:', supabaseUrl ? '✅ Present' : '❌ Missing')
console.log('Key:', supabaseAnonKey ? '✅ Present' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[PRESENT]' : '[MISSING]')
  console.warn('⚠️ Continuing with fallback configuration...')
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'thessis-web-app',
        'apikey': supabaseAnonKey || 'placeholder-key'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  }
)

// Auth helpers with enhanced error handling
export const auth = {
  signUp: async (email: string, password: string, userData: any) => {
    console.log('🔐 Attempting sign up for:', email)
    try {
      // Use password-based signup so user can log in with password
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      if (error) {
        console.error('❌ Sign up error:', error)
        return { data: null, error }
      }

      // Check for existing user (Supabase returns user object but empty identities if already exists)
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        console.warn('⚠️ User already exists:', email)
        return {
          data: null,
          error: { message: 'An account already exists with this email address. Please sign in instead.' }
        }
      }

      console.log('✅ Sign up successful, confirmation email sent')
      return { data, error: null }
    } catch (error) {
      console.error('❌ Network error during sign up:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  signIn: async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email)
    try {
      // Only try password-based sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        console.error('❌ Password sign in error:', error)
        return { data: null, error }
      } else {
        console.log('✅ Password sign in successful')
        return { data, error: null }
      }
    } catch (error) {
      console.error('❌ Network error during sign in:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  signOut: async (options?: { scope?: 'local' | 'global' | 'others' }) => {
    const scope = options?.scope || 'local'
    console.log(`🔐 Signing out (${scope})...`)
    try {
      const { error } = await supabase.auth.signOut({ scope })
      if (error) {
        console.error('❌ Sign out error:', error)
      } else {
        console.log(`✅ Sign out (${scope}) successful`)
      }
      return { error }
    } catch (error) {
      console.error('❌ Network error during sign out:', error)
      return { error: { message: 'Network connection failed during sign out.' } }
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error && error.message !== 'Auth session missing!') {
        console.error('❌ Get user error:', error)
        return { user: null, error }
      }

      if (!user) {
        console.log('ℹ️ No authenticated user session')
      }

      return { user, error: null }
    } catch (error) {
      console.error('❌ Network error getting user:', error)
      return { user: null, error: { message: 'Network connection failed. Please check your internet connection.' } }
    }
  },

  verifyOTP: async (email: string, token: string, type: 'signup' | 'recovery' = 'signup') => {
    console.log(`🔐 Verifying OTP (${type}) for:`, email)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type
      })

      if (error) {
        console.error('❌ OTP verification error:', error)
      } else {
        console.log('✅ OTP verification successful')
      }

      return { data, error }
    } catch (error) {
      console.error('❌ Network error during OTP verification:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  resendOTP: async (email: string) => {
    console.log('🔐 Resending OTP for:', email)

    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email
      })

      if (error) {
        console.error('❌ Resend OTP error:', error)
      } else {
        console.log('✅ OTP resent successfully')
      }

      return { data, error }
    } catch (error) {
      console.error('❌ Network error during OTP resend:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  resetPassword: async (email: string) => {
    console.log('🔐 Sending password reset for:', email)

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined
      })

      if (error) {
        console.error('❌ Password reset error:', error)
      } else {
        console.log('✅ Password reset email sent successfully')
      }

      return { data, error }
    } catch (error) {
      console.error('❌ Network error during password reset:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  signInWithGoogle: async () => {
    console.log('🔐 Attempting Google sign in...')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) {
        console.error('❌ Google sign in error:', error)
        return { data: null, error }
      } else {
        console.log('✅ Google sign in initiated successfully')
        return { data, error: null }
      }
    } catch (error) {
      console.error('❌ Network error during Google sign in:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  signInWithLinkedIn: async () => {
    console.log('🔐 Attempting LinkedIn sign in...')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        console.error('❌ LinkedIn sign in error:', error)
        return { data: null, error }
      } else {
        console.log('✅ LinkedIn sign in initiated successfully')
        return { data, error: null }
      }
    } catch (error) {
      console.error('❌ Network error during LinkedIn sign in:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  updatePassword: async (password: string, options?: { logoutOthers?: boolean }) => {
    console.log('🔐 Attempting password update...')
    try {
      const { data, error } = await supabase.auth.updateUser({
        password
      })
      if (error) {
        console.error('❌ Password update error:', error)
        return { data: null, error }
      } else {
        console.log('✅ Password update successful')

        if (options?.logoutOthers) {
          console.log('🔐 Triggering global sign-out for other devices...')
          await supabase.auth.signOut({ scope: 'others' })
        }

        return { data, error: null }
      }
    } catch (error) {
      console.error('❌ Network error during password update:', error)
      return { data: null, error: { message: 'Network connection failed during password update.' } }
    }
  }
}

// Connection test removed to optimize initial load