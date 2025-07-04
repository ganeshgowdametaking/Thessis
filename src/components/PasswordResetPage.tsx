import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
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

  useEffect(() => {
    // Extract access_token and refresh_token from URL hash (if present)
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token') || ''
      if (access_token) {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(() => setSessionReady(true))
          .catch(() => setSessionReady(true)) // allow form to show even if session fails
        return
      }
    }
    // If no token, allow form to show (for other flows)
    setSessionReady(true)
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

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (error) throw error

      setSuccess('Password updated successfully! You can now sign in with your new password.')
      setTimeout(() => {
        navigate('/jobs')
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
    if (password.length === 0) return { strength: 0, text: '', color: '' }
    if (password.length < 6) return { strength: 1, text: 'Too short', color: 'text-red-500' }
    if (password.length < 8) return { strength: 2, text: 'Weak', color: 'text-orange-500' }
    if (password.length < 12) return { strength: 3, text: 'Good', color: 'text-yellow-500' }
    return { strength: 4, text: 'Strong', color: 'text-green-500' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  if (!sessionReady) {
    return <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-100 animate-fadeIn"><div>Loading...</div></div>
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-100 animate-fadeIn">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fadeIn { animation: fadeIn 0.7s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-8 sm:p-10 transition-all duration-300 animate-fadeIn">
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Set New Password</h2>
          <p className="text-slate-600 text-sm text-center">
            Enter your new password below to complete the reset process.
          </p>
        </div>

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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
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
            {formData.password && (
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm New Password <span className="text-red-500">*</span>
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
                placeholder="Confirm new password"
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

          <button
            type="submit"
            disabled={loading || formData.password !== formData.confirmPassword}
            className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/jobs')}
            className="text-slate-600 hover:text-slate-800 text-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default PasswordResetPage 