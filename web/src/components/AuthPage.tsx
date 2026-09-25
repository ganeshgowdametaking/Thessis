import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import GoogleSignInButton from './GoogleSignInButton'
import LinkedInSignInButton from './LinkedInSignInButton'
import { supabase } from '../lib/supabase'
import { getUTMForSignup, clearUTMData } from '../utils/utmHandler'

type AuthMode = 'signin' | 'signup' | 'verify-email' | 'forgot-password' | 'verify-reset-otp' | 'update-password'

interface AuthPageProps {
  initialMode: 'signin' | 'signup'
}

const inputClass = 'w-full rounded-xl border border-slate-300 py-3 px-4 text-sm focus:border-primary focus:outline-none'
const labelClass = 'block text-[12.5px] font-semibold text-slate-600 mb-1.5'

const REMEMBERED_EMAIL_KEY = 'thessis_remembered_email'

const AuthPage: React.FC<AuthPageProps> = ({ initialMode }) => {
  const navigate = useNavigate()
  const { signIn, signUp, verifyOTP, resendOTP, resetPassword } = useAuthContext()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)))
  const [formData, setFormData] = useState({
    email: localStorage.getItem(REMEMBERED_EMAIL_KEY) || '',
    password: '',
    confirmPassword: '',
    fullName: '',
    otp: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signin') {
        const { error } = await signIn(formData.email, formData.password)
        if (error) throw error
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email)
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY)
        }
        navigate('/jobs')
      } else if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }

        const utmData = getUTMForSignup()
        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.fullName,
          ...utmData,
        })
        if (error) throw error

        clearUTMData()
        setSuccess('Account created! Please check your email for a code.')
        setMode('verify-email')
      } else if (mode === 'verify-email') {
        if (!formData.otp || formData.otp.length !== 6) {
          throw new Error('Please enter a valid 6-digit code')
        }
        const { error } = await verifyOTP(formData.email, formData.otp, 'signup')
        if (error) throw error
        setSuccess('Email verified successfully!')
        setTimeout(() => navigate('/onboarding'), 2000)
      } else if (mode === 'forgot-password') {
        if (!formData.email) throw new Error('Please enter your email')
        const { error } = await resetPassword(formData.email)
        if (error) throw error
        setSuccess('Recovery code sent! Please check your email.')
        setMode('verify-reset-otp')
      } else if (mode === 'verify-reset-otp') {
        if (!formData.otp || formData.otp.length !== 6) {
          throw new Error('Please enter the 6-digit recovery code')
        }
        const { error } = await verifyOTP(formData.email, formData.otp, 'recovery')
        if (error) throw error
        setSuccess('Identity verified! Please set your new password.')
        setMode('update-password')
      } else if (mode === 'update-password') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long')
        }
        const { error } = await supabase.auth.updateUser({ password: formData.password })
        if (error) throw error
        supabase.rpc('send_password_changed_email').then(undefined, () => {})
        setSuccess('Password updated successfully!')
        setTimeout(() => {
          setMode('signin')
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: auth section */}
      <div className="relative w-full lg:w-1/2 flex items-center justify-center px-6 py-16 sm:py-20 bg-parchment">
        <Link to="/" className="absolute top-6 left-6 sm:top-8 sm:left-8">
          <img src="/brand/thessis-logo-primary.svg" alt="Thessis" className="h-7 w-auto" />
        </Link>

        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-10">
          {(mode === 'signin' || mode === 'signup') && (
            <div className="text-left mb-6">
              <h1 className="font-display font-extrabold text-ink text-[22px]">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-[13px] text-slate-500 mt-1">
                {mode === 'signin' ? 'Log in to keep track of your applications' : 'Takes about a minute — no credit card needed'}
              </p>
            </div>
          )}
          {mode === 'verify-email' && <div className="text-center mb-6"><h1 className="text-2xl font-bold text-ink">Verify Email</h1><p className="text-sm text-slate-500 mt-1">Enter the code sent to {formData.email}</p></div>}
          {mode === 'forgot-password' && <div className="text-center mb-6"><h1 className="text-2xl font-bold text-ink">Reset Password</h1><p className="text-sm text-slate-500 mt-1">Enter your email to receive a recovery code</p></div>}
          {mode === 'verify-reset-otp' && <div className="text-center mb-6"><h1 className="text-2xl font-bold text-ink">Verify Identity</h1><p className="text-sm text-slate-500 mt-1">Enter the 6-digit recovery code sent to your email</p></div>}
          {mode === 'update-password' && <div className="text-center mb-6"><h1 className="text-2xl font-bold text-ink">New Password</h1></div>}

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

          {mode === 'verify-email' || mode === 'verify-reset-otp' ? (
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-slate-300 py-3 text-center text-3xl font-mono tracking-[0.5em] focus:border-primary focus:outline-none"
                placeholder="000000"
                maxLength={6}
              />
              <button onClick={handleSubmit} disabled={loading || formData.otp.length !== 6} className="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {loading && <Loader className="animate-spin" size={18} />}
                {mode === 'verify-email' ? 'Verify Email' : 'Verify Identity'}
              </button>
              <button onClick={handleResendOTP} disabled={loading} className="text-sm font-semibold text-primary hover:underline self-center">Resend Code</button>
            </div>
          ) : mode === 'forgot-password' ? (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <input className={inputClass} placeholder="name@company.com" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                <Mail className="absolute right-3 top-3 text-slate-400" size={20} />
              </div>
              <button onClick={handleSubmit} disabled={loading || !formData.email} className="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all">
                {loading ? 'Sending...' : 'Send Recovery Code'}
              </button>
            </div>
          ) : mode === 'update-password' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <input className={inputClass} placeholder="New Password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
              <div className="relative">
                <input className={inputClass} placeholder="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-slate-400">{showConfirmPassword ? <EyeOff size={20} /> : <Lock size={20} />}</button>
              </div>
              <button type="submit" disabled={loading || formData.password !== formData.confirmPassword || formData.password.length < 8} className="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          ) : (
            <>
              <GoogleSignInButton className="w-full py-2.5 border border-slate-300 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors" />
              <LinkedInSignInButton className="w-full mt-3 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2" />

              <div className="relative flex items-center py-6">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="px-4 text-xs text-slate-400 font-semibold">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {mode === 'signup' && (
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <div className="relative">
                      <input className={inputClass} placeholder="Full Name" type="text" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} required />
                      <User className="absolute right-3 top-3 text-slate-400" size={20} />
                    </div>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <input className={inputClass} placeholder="Enter your email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                    <Mail className="absolute right-3 top-3 text-slate-400" size={20} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input className={inputClass} placeholder="Enter your password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required minLength={8} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                </div>
                {mode === 'signup' && (
                  <div>
                    <label className={labelClass}>Confirm Password</label>
                    <div className="relative">
                      <input className={inputClass} placeholder="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-slate-400">{showConfirmPassword ? <EyeOff size={20} /> : <Lock size={20} />}</button>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading || (mode === 'signup' && (formData.password !== formData.confirmPassword || formData.password.length < 8))} className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {loading && <Loader className="animate-spin" size={18} />}
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              {mode === 'signin' && (
                <div className="flex items-center justify-between mt-4">
                  <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Remember me
                  </label>
                  <button type="button" onClick={() => setMode('forgot-password')} className="text-[12.5px] font-bold text-primary hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}

              <p className="text-center text-sm text-slate-500 mt-6">
                {mode === 'signin' ? (
                  <>Don't have an account? <button type="button" onClick={() => navigate('/signup')} className="font-bold text-primary hover:underline">Sign up</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => navigate('/login')} className="font-bold text-primary hover:underline">Sign in</button></>
                )}
              </p>
            </>
          )}

          {mode !== 'signin' && mode !== 'signup' && (
            <button onClick={() => setMode('signin')} className="mt-6 text-sm font-bold text-slate-400 hover:text-primary transition-colors flex items-center justify-center gap-2 w-full">
              Back to Sign In
            </button>
          )}
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink flex-col justify-between p-16 text-white">
        <img src="/brand/thessis-logo-white.svg" alt="Thessis" className="h-8 w-auto self-start" />

        <div className="flex flex-col gap-5 max-w-md">
          <span className="text-[13px] font-bold uppercase tracking-wider text-indigo-200">
            {mode === 'signup' ? 'Free for job seekers' : 'Built for job seekers'}
          </span>
          <h2 className="font-display font-extrabold text-[34px] leading-tight">
            {mode === 'signup'
              ? 'Skip the resume black hole. Get referred instead.'
              : 'Every referral starts with someone who already believes in you.'}
          </h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            {mode === 'signup'
              ? 'Create your profile, get scored against real roles in seconds, and connect with employees who can vouch for you.'
              : 'Create a free profile, get scored against real roles, and get connected to employees who can vouch for you.'}
          </p>
        </div>

        <div className="flex gap-7">
          <div className="flex flex-col gap-0.5">
            <span className="font-display font-extrabold text-[22px]">500+</span>
            <span className="text-xs text-slate-400">warm intros made</span>
          </div>
          <div className="w-px bg-slate-700" />
          <div className="flex flex-col gap-0.5">
            <span className="font-display font-extrabold text-[22px]">4.9/5</span>
            <span className="text-xs text-slate-400">from job seekers</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
