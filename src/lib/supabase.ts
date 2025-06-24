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
        'X-Client-Info': 'tanktide-web-app',
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
      // Use OTP-based signup instead of email confirmation
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: userData,
          shouldCreateUser: true
        }
      })

      if (error) {
        console.error('❌ Sign up error:', error)
        return { data: null, error }
      }

      console.log('✅ OTP sent successfully for signup')
      return { data, error: null }
    } catch (error) {
      console.error('❌ Network error during sign up:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  signIn: async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email)
    
    try {
      // For existing users, try password-based sign in first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.log('⚠️ Password sign in failed, trying OTP...')
        // If password sign in fails, fall back to OTP
        const { data: otpData, error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false
          }
        })
        
        if (otpError) {
          console.error('❌ OTP sign in error:', otpError)
          return { data: null, error: otpError }
        } else {
          console.log('✅ OTP sent successfully for sign in')
          return { data: otpData, error: null }
        }
      } else {
        console.log('✅ Password sign in successful')
        return { data, error: null }
      }
    } catch (error) {
      console.error('❌ Network error during sign in:', error)
      return { data: null, error: { message: 'Network connection failed. Please check your internet connection and try again.' } }
    }
  },

  signOut: async () => {
    console.log('🔐 Signing out...')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Sign out error:', error)
      } else {
        console.log('✅ Sign out successful')
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
      } else {
        console.log('✅ User session found:', user.email)
      }
      
      return { user, error: null }
    } catch (error) {
      console.error('❌ Network error getting user:', error)
      return { user: null, error: { message: 'Network connection failed. Please check your internet connection.' } }
    }
  },

  verifyOTP: async (email: string, token: string) => {
    console.log('🔐 Verifying OTP for:', email)
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
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
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
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
  }
}

// Enhanced connection test with better error handling
const testConnection = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Skipping connection test due to missing environment variables')
    return
  }

  try {
    console.log('🔄 Testing Supabase connection...')
    const { data, error } = await supabase.from('profiles').select('count').limit(1).maybeSingle()
    if (error && !error.message.includes('relation "profiles" does not exist')) {
      console.error('❌ Supabase connection test failed:', error)
    } else {
      console.log('✅ Supabase connection test successful')
    }
  } catch (error) {
    console.error('❌ Supabase connection test exception:', error)
    console.warn('⚠️ This may be due to missing environment variables or network issues')
  }
}

if (supabaseUrl && supabaseAnonKey) {
  testConnection()
}