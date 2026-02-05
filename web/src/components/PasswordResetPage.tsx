import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
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

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Extract access_token and refresh_token from URL hash (if present)
        const hash = window.location.hash
        if (hash) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token') || ''

          if (access_token) {
            console.log('🔑 Setting auth session from recovery token...')
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) {
              console.error('❌ Failed to set session:', error.message)
              setError('This reset link is invalid or has expired. Please request a new one.')
            } else {
              console.log('✅ Session set successfully')
            }
          }
        } else {
          // Check if we already have a session
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            console.warn('⚠️ No session found and no recovery token in hash')
            // Don't show error yet, as they might be navigating manually
          }
        }
      } catch (err: any) {
        console.error('❌ Session initialization error:', err.message)
      } finally {
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
      // Validate password confirmation
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      // Verify we have a session before updating
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('❌ Password update failed: No active session', sessionError)
        throw new Error('Your reset session has expired. Please refresh the page or click the link in your email again.')
      }

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (error) throw error

      setSuccess('Password updated successfully! Redirecting you back to the app...')
      setTimeout(() => {
        if (isIOS) {
          window.location.href = 'tanktide://login'
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
    return { strength: 4, text: 'Strong', color: 'text-green-600', width: '100%' }
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const hasMinLength = formData.password.length >= 8

  if (!sessionReady) {
    return (
      <div className="bg-page min-h-screen flex items-center justify-center p-4">
        <div className="text-body-slate">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-page min-h-screen flex items-center justify-center p-4 font-display">
      <div className="w-full max-w-[480px] flex flex-col gap-6">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo2.png"
            alt="TankTide Logo"
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* Main Card */}
        <div className="bg-card border border-card-border rounded-xl shadow-subtle overflow-hidden p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-title-slate text-2xl font-bold leading-tight">Reset Password</h1>
            <p className="text-body-slate text-base font-normal leading-normal">
              Please choose a new password for your account.
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* New Password Field */}
            <label className="flex flex-col w-full group">
              <p className="text-label-slate text-sm font-medium leading-normal pb-2">New Password</p>
              <div className="flex w-full items-stretch rounded-lg transition-colors focus-within:ring-2 focus-within:ring-btn-sage/20 shadow-sm">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-title-slate focus:outline-0 focus:ring-0 border border-input-border bg-white focus:border-btn-sage h-12 placeholder:text-slate-400 p-4 text-base font-normal leading-normal"
                  placeholder="Enter at least 8 characters..."
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  minLength={8}
                />
                <div
                  className="text-slate-400 flex border border-l-0 border-input-border bg-white items-center justify-center px-4 rounded-r-lg cursor-pointer hover:text-btn-sage transition-colors group-focus-within:border-btn-sage group-focus-within:text-btn-sage"
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
              <div className="flex w-full items-stretch rounded-lg transition-colors focus-within:ring-2 focus-within:ring-btn-sage/20 shadow-sm">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-title-slate focus:outline-0 focus:ring-0 border border-input-border bg-white focus:border-btn-sage h-12 placeholder:text-slate-400 p-4 text-base font-normal leading-normal"
                  placeholder="Re-enter new password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                />
                <div
                  className="text-slate-400 flex border border-l-0 border-input-border bg-white items-center justify-center px-4 rounded-r-lg cursor-pointer hover:text-btn-sage transition-colors group-focus-within:border-btn-sage group-focus-within:text-btn-sage"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="text-[24px]" /> : <Eye className="text-[24px]" />}
                </div>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
                <p className="text-green-600 text-xs mt-1">Passwords match ✓</p>
              )}
            </label>

            {/* Submit Button and Back Link */}
            <div className="flex flex-col gap-4 pt-2">
              <button
                type="submit"
                disabled={loading || formData.password !== formData.confirmPassword || !hasMinLength}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-btn-sage hover:bg-btn-sage-hover text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="text-footer-slate hover:text-footer-hover text-sm font-medium leading-normal text-center transition-colors flex items-center justify-center gap-2 group"
              >
                <ArrowLeft className="text-[18px] transition-transform group-hover:-translate-x-1" />
                Back to Dashboard
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-copyright-slate text-xs">
          © 2024 Sage & Stone. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default PasswordResetPage 