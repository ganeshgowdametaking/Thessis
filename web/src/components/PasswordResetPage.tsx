import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

const PasswordResetPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [sessionReady, setSessionReady] = useState(false)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const initialized = React.useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const initializeSession = async () => {
      console.log('🚀 [RESET_DIAGNOSTIC] Page Initialized')
      console.log('🔗 [RESET_DIAGNOSTIC] Full URL:', window.location.href)
      console.log('🧬 [RESET_DIAGNOSTIC] Query params:', window.location.search)
      console.log('🏁 [RESET_DIAGNOSTIC] Hash fragment:', window.location.hash)

      try {
        // 1. Check for existing session
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        if (existingSession) {
          console.log('✅ [RESET_DIAGNOSTIC] Existing session detected immediately:', existingSession.user.email)
          setSessionReady(true)
          return
        }

        // 2. Set up listener for auth changes (catches Supabase's automatic hash handling)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔄 [RESET_DIAGNOSTIC] Auth state changed:', event, session?.user?.email)
          if (session) {
            console.log('✅ [RESET_DIAGNOSTIC] Session received via onAuthStateChange')
            setSessionReady(true)
          }
        })

        // 3. Manual hash parsing as a fallback
        const hash = window.location.hash
        if (hash) {
          const cleanHash = hash.replace(/^#/, '')
          const params = new URLSearchParams(cleanHash)

          const access_token = params.get('access_token') || params.get('#access_token')
          const refresh_token = params.get('refresh_token') || ''

          if (access_token) {
            console.log('🔑 [RESET_DIAGNOSTIC] Manual token exchange initiated...')
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) {
              console.error('❌ [RESET_DIAGNOSTIC] Manual setSession failed:', error.message)
            } else {
              console.log('✅ [RESET_DIAGNOSTIC] Manual setSession successful')
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                console.log('👤 [RESET_DIAGNOSTIC] User verified manually:', user.email)
                setSessionReady(true)
                window.history.replaceState(null, '', window.location.pathname + window.location.search)
              }
            }
          }
        }

        // Wait a small delay to see if onAuthStateChange catches anything before giving up
        setTimeout(() => {
          setSessionReady(true)
          subscription.unsubscribe()
        }, 2000)

      } catch (err: any) {
        console.error('❌ [RESET_DIAGNOSTIC] Initialization exception:', err.message)
        setSessionReady(true)
      }
    }

    initializeSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      console.log('📡 [RESET_DIAGNOSTIC] Verifying user with server before update...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('❌ [RESET_DIAGNOSTIC] Password update blocked: No verified user found', userError)
        throw new Error('Verification failed. Your session may have expired. Please click the link in your email again.')
      }

      console.log('💾 [RESET_DIAGNOSTIC] User verified as:', user.email, '. Updating password now...')

      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (error) throw error

      supabase.rpc('send_password_changed_email').then(undefined, () => {})

      // Global sign-out for other devices
      await supabase.auth.signOut({ scope: 'others' })

      setSuccess('Password updated successfully! Redirecting you back to the app...')
      setTimeout(() => {
        if (isIOS) {
          window.location.href = 'thessis://login'
        } else {
          navigate('/jobs')
        }
      }, 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '', width: '0%' }
    if (password.length < 6) return { strength: 1, text: 'Too short', color: 'text-red-500', width: '25%' }
    if (password.length < 8) return { strength: 2, text: 'Weak', color: 'text-orange-500', width: '50%' }
    if (password.length < 12) return { strength: 3, text: 'Good', color: 'text-btn-sage', width: '75%' }
    return { strength: 4, text: 'Strong', color: 'text-success-ink', width: '100%' }
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const hasMinLength = formData.password.length >= 8
  const actionAreaClass = 'sticky sm:static bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-0 bg-white/95 sm:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-white/75 border-t border-slate-100 sm:border-0'

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-display">
    <div className="bg-page min-h-[100dvh] sm:min-h-screen lg:min-h-0 lg:w-1/2 flex items-stretch sm:items-center justify-center p-0 sm:p-4 lg:py-16">
      <div className="w-full max-w-[480px] flex flex-col gap-3 sm:gap-6 min-h-[100dvh] sm:min-h-0">
        {/* Logo */}
        <div className="flex justify-center mb-2 sm:mb-6 pt-[max(16px,env(safe-area-inset-top))] sm:pt-0">
          <img
            src="/brand/thessis-logo-primary.svg"
            alt="Thessis"
            className="h-9 w-auto"
          />
        </div>

        {/* Main Card */}
        <div className="bg-card border-x-0 sm:border border-card-border rounded-none sm:rounded-2xl shadow-none sm:shadow-subtle overflow-hidden p-4 sm:p-8 flex flex-col gap-5 sm:gap-6 flex-1">
          {/* Header */}
          <div className="text-center space-y-1.5 sm:space-y-2">
            <h1 className="text-title-slate text-xl sm:text-2xl font-bold leading-tight">Reset Password</h1>
          </div>

          {/* Diagnostic Check */}
          {!sessionReady && (
            <div className="p-3 bg-ink-wash border border-indigo-200 rounded-lg text-primary text-sm flex items-center justify-between">
              <span>Verifying link...</span>
              <Loader className="animate-spin text-[16px]" />
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm space-y-3">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  initialized.current = false
                  setSessionReady(false)
                }}
                className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded font-bold transition-colors"
              >
                Retry Link Verification
              </button>
            </div>
          )}

          {success && (
            <div className="p-3 bg-success-tint border border-success-tint rounded-lg text-success-ink text-sm flex items-center gap-2">
              <CheckCircle className="text-[16px] text-success-ink" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 min-h-0">
            {/* New Password Field */}
            <label className="flex flex-col w-full group">
              <p className="text-label-slate text-sm font-medium leading-normal pb-2">New Password</p>
              <div className="flex w-full items-stretch rounded-lg transition-colors shadow-sm">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-xl text-title-slate focus:outline-0 focus:ring-0 border border-input-border bg-white focus:border-btn-sage h-12 placeholder:text-slate-400 p-4 text-base font-normal leading-normal"
                  placeholder="Enter at least 8 characters..."
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  minLength={8}
                />
                <div
                  className="text-slate-400 flex border border-l-0 border-input-border bg-white items-center justify-center px-4 rounded-r-xl cursor-pointer hover:text-btn-sage transition-colors group-focus-within:border-btn-sage group-focus-within:text-btn-sage"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="text-[24px]" /> : <Eye className="text-[24px]" />}
                </div>
              </div>
            </label>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-6 justify-between items-center">
                  <p className="text-label-slate text-xs font-medium uppercase tracking-wider">Password Strength</p>
                  <p className="text-title-slate text-xs font-bold">{passwordStrength.text}</p>
                </div>
                <div className="rounded-full bg-slate-100 h-1.5 w-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-btn-sage transition-all duration-300 ease-out"
                    style={{ width: passwordStrength.width }}
                  ></div>
                </div>
                {hasMinLength && (
                  <div className="flex gap-1 text-xs text-label-slate items-center mt-1">
                    <CheckCircle className="text-[16px] text-btn-sage" />
                    <span>Contains at least 8 characters</span>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password Field */}
            <label className="flex flex-col w-full group">
              <p className="text-label-slate text-sm font-medium leading-normal pb-2">Confirm New Password</p>
              <div className="flex w-full items-stretch rounded-lg transition-colors shadow-sm">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-xl text-title-slate focus:outline-0 focus:ring-0 border border-input-border bg-white focus:border-btn-sage h-12 placeholder:text-slate-400 p-4 text-base font-normal leading-normal"
                  placeholder="Re-enter new password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                />
                <div
                  className="text-slate-400 flex border border-l-0 border-input-border bg-white items-center justify-center px-4 rounded-r-xl cursor-pointer hover:text-btn-sage transition-colors group-focus-within:border-btn-sage group-focus-within:text-btn-sage"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="text-[24px]" /> : <Eye className="text-[24px]" />}
                </div>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
                <p className="text-success-ink text-xs mt-1">Passwords match ✓</p>
              )}
            </label>

            {/* Submit Button and Back Link */}
            <div className={`flex flex-col gap-4 pt-2 ${actionAreaClass}`}>
              <button
                type="submit"
                disabled={loading || formData.password !== formData.confirmPassword || !hasMinLength}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-btn-sage hover:bg-btn-sage-hover text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>

            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-copyright-slate text-xs pb-[calc(env(safe-area-inset-bottom)+8px)] sm:pb-0">
          © 2026 Thessis. All rights reserved.
        </p>
      </div>
    </div>

      {/* Right: brand panel, same photo as login/sign-up. A CSS background, so phones (panel hidden) never download it. */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-ink bg-[url('/images/auth-panel.webp')] bg-cover bg-center p-16 text-white">
        <img src="/brand/thessis-logo-white.svg" alt="Thessis" className="h-8 w-auto self-start" />

        <div className="my-auto flex flex-col gap-5 max-w-md">
          <h2 className="font-display font-extrabold text-[34px] leading-tight">Let's get you back in.</h2>
        </div>
      </div>
    </div>
  )
}

export default PasswordResetPage
