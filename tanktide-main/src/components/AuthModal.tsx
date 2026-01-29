import React, { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'
import GoogleSignInButton from './GoogleSignInButton'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup' | 'verify-email' | 'forgot-password'
  onModeChange: (mode: 'signin' | 'signup' | 'verify-email' | 'forgot-password') => void
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
        // Validate password confirmation
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }

        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long')
        }

        // Use signUp which now sends OTP instead of magic link
        const { error } = await signUp(formData.email, formData.password, {
          full_name: formData.fullName
        })
        if (error) throw error
        
        setSuccess('Account created! Please check your email for a 6-digit verification code.')
        onModeChange('verify-email')
      } else if (mode === 'verify-email') {
        if (!formData.otp || formData.otp.length !== 6) {
          throw new Error('Please enter a valid 6-digit verification code')
        }

        const { error } = await verifyOTP(formData.email, formData.otp)
        if (error) throw error
        
        setSuccess('Email verified successfully! Welcome to TankTide!')
        setTimeout(() => {
          onClose()
          setSuccess('')
        }, 2000)
      } else if (mode === 'forgot-password') {
        const { error } = await resetPassword(formData.email)
        if (error) throw error
        
        setSuccess('Password reset link sent to your email! Please check your inbox and follow the link to set a new password.')
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
      const { error } = await resendOTP(formData.email)
      if (error) throw error
      setSuccess('New verification code sent to your email')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (error) setError('')
  }

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '', segments: 0 }
    
    let score = 0
    let text = ''
    let color = ''
    
    // Length check
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    
    // Character variety checks
    if (/[a-z]/.test(password)) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    
    // Determine strength
    if (score <= 2) {
      text = 'Weak'
      color = 'text-red-500'
    } else if (score <= 4) {
      text = 'Fair'
      color = 'text-primary'
    } else {
      text = 'Strong'
      color = 'text-green-600'
    }
    
    const segments = Math.min(Math.ceil(score / 1.5), 4)
    
    return { strength: score, text, color, segments }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const handleGoogleSignInSuccess = () => {
    console.log('Google sign in successful!')
    onClose()
  }

  const handleGoogleSignInError = (error: string) => {
    console.error('Google sign in error:', error)
    setError(error)
  }

  if (!isOpen) return null

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
      
      <div className="fixed inset-0 bg-[#F9F9F7]/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-[480px] bg-white border border-border-light rounded-lg shadow-2xl flex flex-col overflow-hidden relative">
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="text-[24px]" />
          </button>

          {/* Header with Logo and Tabs */}
          <div className="pt-8 px-8 pb-0">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src="/logo2.png" 
                alt="TankTide Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>

            {/* Tabs - Only show for signin/signup modes */}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="flex border-b border-divider-line">
                <button 
                  onClick={() => onModeChange('signin')}
                  className={`flex-1 pb-3 text-center border-b-2 font-bold text-sm tracking-wide transition-colors ${
                    mode === 'signin' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-slate-icon hover:text-slate-text font-semibold'
                  }`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => onModeChange('signup')}
                  className={`flex-1 pb-3 text-center border-b-2 font-bold text-sm tracking-wide transition-colors ${
                    mode === 'signup' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-slate-icon hover:text-slate-text font-semibold'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Header for other modes */}
            {mode === 'verify-email' && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-dark mb-2">Verify Your Email</h2>
                <p className="text-slate-text">Enter the verification code sent to your email.</p>
              </div>
            )}

            {mode === 'forgot-password' && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-dark mb-2">Reset Your Password</h2>
                <p className="text-slate-text">We'll send you a reset link via email.</p>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mx-8 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Main Content */}
          <div className="p-8 flex flex-col gap-5">
            {mode === 'verify-email' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-label" htmlFor="otp">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={formData.otp}
                    onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-lg border border-stone-border bg-white py-3 px-4 text-sm text-slate-text placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow text-center text-2xl font-mono tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-slate-icon">Enter the 6-digit code sent to your email</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-text">Didn't receive the code?</span>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-primary hover:text-primary-hover font-semibold disabled:opacity-50 transition-colors"
                  >
                    Resend Code
                  </button>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>
              </>
            ) : mode === 'forgot-password' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-label" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-lg border border-stone-border bg-white py-3 px-4 text-sm text-slate-text placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                      id="email"
                      placeholder="name@company.com"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                    <Mail className="absolute right-3 top-3 text-slate-icon text-[20px]" />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </>
            ) : (
              <>
                {/* Social Login Buttons */}
                <div className="flex flex-col gap-3">
                  <GoogleSignInButton 
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-border bg-white hover:bg-stone-50 transition-colors py-2.5 px-4 text-sm font-semibold text-slate-dark"
                    onSuccess={handleGoogleSignInSuccess}
                    onError={handleGoogleSignInError}
                  />
                </div>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-divider-line"></div>
                  <span className="flex-shrink-0 mx-4 text-divider-text text-xs font-medium uppercase tracking-wider">
                    Or continue with email
                  </span>
                  <div className="flex-grow border-t border-divider-line"></div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {mode === 'signup' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-label" htmlFor="fullName">
                        Full Name
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border border-stone-border bg-white py-3 px-4 text-sm text-slate-text placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                          id="fullName"
                          placeholder="Your full name"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          required
                        />
                        <User className="absolute right-3 top-3 text-slate-icon text-[20px]" />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-label" htmlFor="email">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-stone-border bg-white py-3 px-4 text-sm text-slate-text placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                        id="email"
                        placeholder="name@company.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                      <Mail className="absolute right-3 top-3 text-slate-icon text-[20px]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-slate-label" htmlFor="password">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-stone-border bg-white py-3 px-4 text-sm text-slate-text placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                        id="password"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        className="absolute right-3 top-3 text-slate-icon hover:text-slate-text cursor-pointer"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="text-[20px]" />
                        ) : (
                          <Eye className="text-[20px]" />
                        )}
                      </button>
                    </div>
                    
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => onModeChange('forgot-password')}
                        className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline self-end mt-1"
                      >
                        Forgot Password?
                      </button>
                    )}

                    {mode === 'signup' && formData.password && (
                      <div className="mt-1">
                        <div className="flex gap-1 h-1.5 mb-1">
                          {[1, 2, 3, 4].map((segment) => (
                            <div
                              key={segment}
                              className={`flex-1 rounded-full ${
                                segment <= passwordStrength.segments ? 'bg-primary' : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${passwordStrength.color}`}>
                          Strength: {passwordStrength.text}
                        </p>
                      </div>
                    )}
                  </div>

                  {mode === 'signup' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-label" htmlFor="confirmPassword">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border border-stone-border bg-white py-3 px-4 text-sm text-slate-text placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                          id="confirmPassword"
                          placeholder="••••••••"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          required
                        />
                        <button
                          className="absolute right-3 top-3 text-slate-icon hover:text-slate-text cursor-pointer"
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="text-[20px]" />
                          ) : (
                            <Lock className="text-[20px]" />
                          )}
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                      )}
                      {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
                        <p className="text-green-600 text-xs mt-1">Passwords match ✓</p>
                      )}
                    </div>
                  )}

                  <button
                    className="mt-2 w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-50"
                    type="submit"
                    disabled={loading || (mode === 'signup' && formData.password !== formData.confirmPassword)}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="animate-spin text-[16px]" />
                        {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                      </span>
                    ) : (
                      mode === 'signin' ? 'Sign In' : 'Create Account'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          {(mode === 'signin' || mode === 'signup') && (
            <div className="bg-gray-50 p-4 text-center border-t border-divider-line">
              <p className="text-sm text-slate-text">
                Are you a company?{' '}
                <a className="font-bold text-primary hover:text-primary-hover hover:underline ml-1" href="/companies">
                  Sign in to Company Portal
                </a>
              </p>
            </div>
          )}

          {/* Back to Sign In for other modes */}
          {(mode === 'verify-email' || mode === 'forgot-password') && (
            <div className="p-4 text-center border-t border-divider-line">
              <button
                type="button"
                onClick={() => onModeChange('signin')}
                className="inline-flex items-center text-sm font-semibold text-slate-icon hover:text-primary transition-colors"
              >
                <ArrowLeft className="mr-1 text-[18px]" />
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default AuthModal