import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CompanyConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  useEffect(() => {
    // Get data from navigation state or URL params
    if (location.state) {
      setEmail(location.state.email || '');
      setCompanyName(location.state.companyName || '');
    } else {
      // Try to get from URL params
      const urlParams = new URLSearchParams(window.location.search);
      setEmail(urlParams.get('email') || '');
      setCompanyName(urlParams.get('company_name') || '');
    }
  }, [location]);

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        throw error;
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error: any) {
      console.error('Resend error:', error);
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyAccount = () => {
    // This would typically check if the user is verified
    // For now, we'll redirect to the onboarding wizard
    navigate('/company-onboarding');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) throw error;
      setOtpSuccess('Email verified successfully! Redirecting...');
      setTimeout(() => navigate('/company-onboarding'), 1500);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-2 text-white">
          <Building className="h-8 w-8" />
          <span className="text-xl font-bold font-display">Thessis</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          {/* Welcome Message */}
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Welcome to Thessis!
          </h1>
          
          <p className="text-lg text-slate-600 mb-2">
            You're one click away from posting your first job!
          </p>

          {companyName && (
            <p className="text-slate-500 mb-6">
              Account created for <span className="font-semibold">{companyName}</span>
            </p>
          )}

          {/* Email Verification Section */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Verify Your Email
            </h3>
            
            <p className="text-slate-600 mb-4">
              We've sent a 6-digit verification code to:
            </p>
            
            <p className="font-semibold text-blue-600 mb-4">
              {email}
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
                disabled={otpLoading}
              />
              {otpError && <div className="text-red-600 text-sm">{otpError}</div>}
              {otpSuccess && <div className="text-green-600 text-sm">{otpSuccess}</div>}
              <button
                type="submit"
                disabled={otpLoading || otp.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                {otpLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 mt-4"
            >
              {resendLoading ? 'Sending...' : 'Resend verification code'}
            </button>
            {resendSuccess && (
              <p className="text-green-600 text-sm mt-2">
                Verification code sent!
              </p>
            )}
          </div>

          {/* Trust Message */}
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm font-medium">
              💡 Verified companies get 2× more referral reach
            </p>
          </div>

          {/* Verify Account Button */}
          <button
            onClick={handleVerifyAccount}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 mb-4"
          >
            <span>Verify Your Account</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Additional Info */}
          <div className="text-sm text-slate-500 space-y-2">
            <p>
              Can't find the email? Check your spam folder.
            </p>
            <p>
              Need help? Contact our support team.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-blue-600">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-blue-100">
          <p className="text-sm">
            © 2026 Thessis. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyConfirmationPage; 