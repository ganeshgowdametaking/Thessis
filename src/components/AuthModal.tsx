import React, { useState } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
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
    if (password.length === 0) return { strength: 0, text: '', color: '' }
    if (password.length < 6) return { strength: 1, text: 'Too short', color: 'text-red-500' }
    if (password.length < 8) return { strength: 2, text: 'Weak', color: 'text-orange-500' }
    if (password.length < 12) return { strength: 3, text: 'Good', color: 'text-yellow-500' }
    return { strength: 4, text: 'Strong', color: 'text-green-500' }
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

  // Add the Uiverse.io button styles scoped to .uiverse-signin-btn
  const uiverseBtnStyles = `
  .uiverse-signin-btn {
    align-items: center;
    background-image: linear-gradient(144deg, #af40ff, #5b42f3 50%, #00ddeb);
    border: 0;
    border-radius: 8px;
    box-shadow: rgba(151, 65, 252, 0.2) 0 15px 30px -5px;
    box-sizing: border-box;
    color: #ffffff;
    display: flex;
    font-size: 18px;
    justify-content: center;
    line-height: 1em;
    max-width: 100%;
    min-width: 140px;
    padding: 3px;
    text-decoration: none;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.3s;
  }
  .uiverse-signin-btn:active,
  .uiverse-signin-btn:hover {
    outline: 0;
  }
  .uiverse-signin-btn span {
    background-color: rgb(5, 6, 45);
    padding: 16px 24px;
    border-radius: 6px;
    width: 100%;
    height: 100%;
    transition: 300ms;
  }
  .uiverse-signin-btn:hover span {
    background: none;
  }
  .uiverse-signin-btn:active {
    transform: scale(0.9);
  }
  `;

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <style>{uiverseBtnStyles}</style>
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Join TankTide'}
            {mode === 'verify-email' && 'Verify Your Email'}
            {mode === 'forgot-password' && 'Reset Your Password'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === 'verify-email' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              We've sent a <strong>6-digit verification code</strong> to <strong>{formData.email}</strong>. 
              Please check your email and enter the code below.
            </p>
            <p className="text-blue-700 text-xs mt-2">
              💡 <strong>Note:</strong> Look for an email with a 6-digit code, not a confirmation link.
            </p>
            <p className="text-blue-600 text-xs mt-1">
              📧 Check your spam folder if you don't see the email within 2 minutes.
            </p>
          </div>
        )}

        {mode === 'forgot-password' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'verify-email' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={formData.otp}
                  onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Enter the 6-digit code sent to your email</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Resend Code
                </button>
              </div>
            </>
          ) : mode === 'forgot-password' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === 'signup' && formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                            passwordStrength.strength === 2 ? 'bg-orange-500 w-2/4' :
                            passwordStrength.strength === 3 ? 'bg-yellow-500 w-3/4' :
                            passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-blue-500'
                      }`}
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                  )}
                  {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
                    <p className="text-green-500 text-xs mt-1">Passwords match ✓</p>
                  )}
                </div>
              )}

              {mode === 'signin' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => onModeChange('forgot-password')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && formData.password !== formData.confirmPassword)}
            className={
              (mode === 'signin' || mode === 'signup')
                ? 'uiverse-signin-btn w-full disabled:opacity-50 disabled:cursor-not-allowed'
                : 'w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            }
          >
            {(mode === 'signin' || mode === 'signup') ? (
              <span>{loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}</span>
            ) : loading ? 'Loading...' :
              mode === 'forgot-password' ? 'Send Reset Link' :
              'Verify Email'}
          </button>

          {/* Google Sign In Button */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Or continue with</span>
                </div>
              </div>

              <GoogleSignInButton
                variant="outline"
                size="md"
                onSuccess={handleGoogleSignInSuccess}
                onError={handleGoogleSignInError}
                className="w-full"
              >
                {mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
              </GoogleSignInButton>
            </>
          )}
        </form>

        {mode !== 'verify-email' && mode !== 'forgot-password' && (
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')}
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}

        {mode === 'verify-email' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => onModeChange('signin')}
              className="text-slate-600 hover:text-slate-800 text-sm"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {mode === 'forgot-password' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => onModeChange('signin')}
              className="text-slate-600 hover:text-slate-800 text-sm"
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal