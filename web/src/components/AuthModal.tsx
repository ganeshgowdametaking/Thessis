import React, { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader, CheckCircle } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import GoogleSignInButton from './GoogleSignInButton'
import { supabase } from '../lib/supabase'
import { getUTMForSignup, clearUTMData } from '../utils/utmHandler'

type AuthMode = 'signin' | 'signup' | 'verify-email' | 'forgot-password' | 'verify-reset-otp' | 'update-password'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode, onModeChange }) => {
  const { signIn, signUp, verifyOTP, resendOTP, resetPassword } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    otp: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signin') {
        const { error } = await signIn(formData.email, formData.password)
        if (error) throw error
        onClose()
      } else if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }

        // Include UTM attribution data in signup
        const utmData = getUTMForSignup()
        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.fullName,
          ...utmData,
        })
        if (error) throw error

        // Clear UTM data after successful signup initiation
        clearUTMData()
        setSuccess('Account created! Please check your email for a code.')
        onModeChange('verify-email')
      } else if (mode === 'verify-email') {
        if (!formData.otp || formData.otp.length !== 6) {
          throw new Error('Please enter a valid 6-digit code')
        }
        const { error } = await verifyOTP(formData.email, formData.otp, 'signup')
        if (error) throw error
        setSuccess('Email verified successfully!')
        setTimeout(() => {
          onClose()
          setSuccess('')
        }, 2000)
      } else if (mode === 'forgot-password') {
        if (!formData.email) throw new Error('Please enter your email')
        const { error } = await resetPassword(formData.email)
        if (error) throw error
        setSuccess('Recovery code sent! Please check your email.')
        onModeChange('verify-reset-otp')
      } else if (mode === 'verify-reset-otp') {
        if (!formData.otp || formData.otp.length !== 6) {
          throw new Error('Please enter the 6-digit recovery code')
        }
        const { error } = await verifyOTP(formData.email, formData.otp, 'recovery')
        if (error) throw error
        setSuccess('Identity verified! Please set your new password.')
        onModeChange('update-password')
      } else if (mode === 'update-password') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }
        const { error } = await supabase.auth.updateUser({
          password: formData.password
        })
        if (error) throw error
        setSuccess('Password updated successfully!')
        setTimeout(() => {
          onModeChange('signin')
          setSuccess('')
        }, 3000)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'verify-email') {
        const { error } = await resendOTP(formData.email)
        if (error) throw error
        setSuccess('New verification code sent')
      } else if (mode === 'verify-reset-otp') {
        const { error } = await resetPassword(formData.email)
        if (error) throw error
        setSuccess('New recovery code sent')
      }
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
    if (password.length === 0) return { text: '', color: '', segments: 0 }
    let score = 0
    if (password.length >= 8) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    const colors = ['text-red-500', 'text-orange-500', 'text-blue-500', 'text-green-600']
    const texts = ['Weak', 'Fair', 'Good', 'Strong']
    return { text: texts[score - 1] || texts[0], color: colors[score - 1] || colors[0], segments: score }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-[#F9F9F7]/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-[480px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={24} />
        </button>

        <div className="pt-8 px-8 pb-0">
          <div className="flex justify-center mb-6">
            <img src="/logo2.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>

          {(mode === 'signin' || mode === 'signup') && (
            <div className="flex border-b border-slate-100">
              <button onClick={() => onModeChange('signin')} className={`flex-1 pb-3 text-sm font-bold tracking-wide transition-colors ${mode === 'signin' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-slate-600'}`}>Sign In</button>
              <button onClick={() => onModeChange('signup')} className={`flex-1 pb-3 text-sm font-bold tracking-wide transition-colors ${mode === 'signup' ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-slate-600'}`}>Create Account</button>
            </div>
          )}

          {mode === 'verify-email' && <div className="text-center mb-4"><h2 className="text-xl font-bold">Verify Email</h2><p className="text-sm text-slate-500">Enter the code sent to {formData.email}</p></div>}
          {mode === 'forgot-password' && <div className="text-center mb-4"><h2 className="text-xl font-bold">Reset Password</h2><p className="text-sm text-slate-500">Enter your email to receive a recovery code</p></div>}
          {mode === 'verify-reset-otp' && <div className="text-center mb-4"><h2 className="text-xl font-bold">Verify Identity</h2><p className="text-sm text-slate-500">Enter the 6-digit recovery code sent to your email</p></div>}
          {mode === 'update-password' && <div className="text-center mb-4"><h2 className="text-xl font-bold">New Password</h2><p className="text-sm text-slate-500">Set a secure password for your account</p></div>}
        </div>

        {error && <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}
        {success && <div className="mx-8 mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

        <div className="p-8 flex flex-col gap-5">
          {mode === 'verify-email' || mode === 'verify-reset-otp' ? (
            <>
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-slate-300 py-3 text-center text-3xl font-mono tracking-[0.5em] focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="000000"
                maxLength={6}
              />
              <button onClick={handleSubmit} disabled={loading || formData.otp.length !== 6} className="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {loading && <Loader className="animate-spin" size={18} />}
                {mode === 'verify-email' ? 'Verify Email' : 'Verify Identity'}
              </button>
              <button onClick={handleResendOTP} disabled={loading} className="text-sm font-semibold text-primary hover:underline">Resend Code</button>
            </>
          ) : mode === 'forgot-password' ? (
            <>
              <div className="relative">
                <input className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none" placeholder="name@company.com" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                <Mail className="absolute right-3 top-3 text-slate-400" size={20} />
              </div>
              <button onClick={handleSubmit} disabled={loading || !formData.email} className="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all">
                {loading ? 'Sending...' : 'Send Recovery Code'}
              </button>
            </>
          ) : mode === 'update-password' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <input className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none" placeholder="New Password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
              <div className="relative">
                <input className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none" placeholder="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-slate-400">{showConfirmPassword ? <EyeOff size={20} /> : <Lock size={20} />}</button>
              </div>
              <button type="submit" disabled={loading || formData.password !== formData.confirmPassword || formData.password.length < 8} className="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          ) : (
            <>
              <GoogleSignInButton className="w-full py-2.5 border border-slate-300 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors" />
              <div className="relative flex items-center py-1"><div className="flex-grow border-t border-slate-100"></div><span className="px-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">Or use email</span><div className="flex-grow border-t border-slate-100"></div></div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === 'signup' && <div className="relative"><input className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none" placeholder="Full Name" type="text" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} required /><User className="absolute right-3 top-3 text-slate-400" size={20} /></div>}
                <div className="relative"><input className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none" placeholder="Email Address" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required /><Mail className="absolute right-3 top-3 text-slate-400" size={20} /></div>
                <div className="relative flex flex-col gap-1">
                  <input className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none" placeholder="Password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  {mode === 'signin' && <button type="button" onClick={() => onModeChange('forgot-password')} className="text-xs font-bold text-primary hover:underline self-end">Forgot Password?</button>}
                </div>
                {mode === 'signup' && <div className="relative"><input className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none" placeholder="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-slate-400">{showConfirmPassword ? <EyeOff size={20} /> : <Lock size={20} />}</button></div>}
                <button type="submit" disabled={loading || (mode === 'signup' && (formData.password !== formData.confirmPassword || formData.password.length < 8))} className="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {loading && <Loader className="animate-spin" size={18} />}
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>

        {mode !== 'signin' && mode !== 'signup' && (
          <div className="p-4 text-center border-t border-slate-50 bg-slate-50/50">
            <button onClick={() => onModeChange('signin')} className="text-sm font-bold text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2 w-full">
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal