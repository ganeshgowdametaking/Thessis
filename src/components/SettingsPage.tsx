import React, { useState } from 'react';
import { Settings, User, Shield, LogOut, ChevronRight, Trash2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { profileService } from '../services/profileService';

interface SettingsPageProps {
  currentSection: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentSection }) => {
  const { user, profile, signOut, updateProfile } = useAuthContext();
  const [activeSection, setActiveSection] = useState(currentSection === 'settings' ? 'account-settings' : currentSection);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  
  // Secondary email verification states
  const [secondaryEmail, setSecondaryEmail] = useState(profile?.secondary_email || '');
  const [secondaryEmailOtp, setSecondaryEmailOtp] = useState('');
  const [secondaryEmailOtpSent, setSecondaryEmailOtpSent] = useState(false);
  const [secondaryEmailVerified, setSecondaryEmailVerified] = useState(profile?.secondary_email_verified || false);
  const [secondaryEmailLoading, setSecondaryEmailLoading] = useState(false);
  const [secondaryEmailError, setSecondaryEmailError] = useState('');
  const [secondaryEmailSuccess, setSecondaryEmailSuccess] = useState('');

  const [openAccountSubsection, setOpenAccountSubsection] = useState<'secondary-email' | 'change-password' | null>('secondary-email');

  const menuItems = [
    { id: 'account-settings', label: 'Account Settings', icon: User },
    { id: 'privacy-policy', label: 'Privacy Settings', icon: Shield },
    { id: 'logout', label: 'Logout', icon: LogOut, danger: true }
  ];

  // Validate organization email (not gmail.com)
  const validateOrganizationEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (email.toLowerCase().includes('gmail.com')) {
      return 'Please use your organization email address, not Gmail.';
    }
    return null;
  };

  const handleSendSecondaryEmailOTP = async () => {
    const validationError = validateOrganizationEmail(secondaryEmail);
    if (validationError) {
      setSecondaryEmailError(validationError);
      return;
    }

    setSecondaryEmailError('');
    setSecondaryEmailLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-secondary-email-otp', {
        body: { secondaryEmail }
      });

      if (error) {
        // Try to extract a user-friendly message from the error response
        let errorMsg = error?.message || error?.error_description || error?.error || 'Failed to send verification code. Please try again.';
        if (error instanceof Response) {
          try {
            const data = await error.json();
            errorMsg = data.error || data.message || errorMsg;
          } catch {}
        }
        throw new Error(errorMsg);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSecondaryEmailOtpSent(true);
      // For development: show OTP in success message if available
      let successMessage = data.message || 'Verification code sent to your organization email.';
      if (data.otp) {
        successMessage += ` (Debug: OTP is ${data.otp})`;
      }
      if (data.debug) {
        successMessage += ` (Debug: ${data.debug})`;
      }
      setSecondaryEmailSuccess(successMessage);
    } catch (error: any) {
      console.error('Error sending secondary email OTP:', error);
      let errorMsg = error?.message || error?.error_description || error?.error || 'Failed to send verification code. Please try again.';
      if (error instanceof Response) {
        try {
          const data = await error.json();
          errorMsg = data.error || data.message || errorMsg;
        } catch {}
      }
      setSecondaryEmailError(errorMsg);
    } finally {
      setSecondaryEmailLoading(false);
    }
  };

  const handleVerifySecondaryEmailOTP = async () => {
    if (!secondaryEmailOtp || secondaryEmailOtp.length !== 6) {
      setSecondaryEmailError('Please enter a valid 6-digit verification code.');
      return;
    }

    setSecondaryEmailError('');
    setSecondaryEmailLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-secondary-email-otp', {
        body: { 
          secondaryEmail,
          otp: secondaryEmailOtp
        }
      });

      if (error) {
        let errorMsg = error?.message || error?.error_description || error?.error || 'Failed to verify code. Please try again.';
        if (error instanceof Response) {
          try {
            const data = await error.json();
            errorMsg = data.error || data.message || errorMsg;
          } catch {}
        }
        throw new Error(errorMsg);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Update local state to reflect the verification
      setSecondaryEmailVerified(true);
      setSecondaryEmailSuccess(data.message || 'Organization email verified successfully!');
      // Refresh the profile to get updated data
      const updatedProfile = await profileService.getCurrentProfile();
      if (updatedProfile) {
        // Update the profile in the context
        // Note: This will trigger a re-render with the updated profile
      }
    } catch (error: any) {
      console.error('Error verifying secondary email OTP:', error);
      let errorMsg = error?.message || error?.error_description || error?.error || 'Failed to verify code. Please try again.';
      if (error instanceof Response) {
        try {
          const data = await error.json();
          errorMsg = data.error || data.message || errorMsg;
        } catch {}
      }
      setSecondaryEmailError(errorMsg);
    } finally {
      setSecondaryEmailLoading(false);
    }
  };

  const handleSendOTP = async () => {
    try {
      // In a real implementation, this would call an API to send OTP
      console.log('Sending OTP to email...');
      setOtpSent(true);
      alert('A verification code has been sent to your email.');
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send verification code. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      // In a real implementation, this would verify the OTP
      if (otp.length === 6) {
        console.log('Verifying OTP:', otp);
        setOtpVerified(true);
      } else {
        alert('Please enter a valid 6-digit code.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Failed to verify code. Please try again.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError('All fields are required.');
      return;
    }
    if (!user || !user.email) {
      setChangePasswordError('User not authenticated.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError('Password must be at least 6 characters long.');
      return;
    }
    setChangePasswordLoading(true);
    try {
      // Re-authenticate user
      const { error: signInError } = await import('../lib/supabase').then(({ supabase }) =>
        supabase.auth.signInWithPassword({
          email: user.email as string,
          password: currentPassword
        })
      );
      if (signInError) {
        setChangePasswordError('Current password is incorrect.');
        setChangePasswordLoading(false);
        return;
      }
      // Update password
      const { error } = await import('../lib/supabase').then(({ supabase }) =>
        supabase.auth.updateUser({ password: newPassword })
      );
      if (error) {
        setChangePasswordError(error.message || 'Failed to update password.');
      } else {
        setChangePasswordSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to update password.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleProfileDeletion = async () => {
    if (!deleteReason.trim()) {
      alert('Please provide a reason for deleting your profile.');
      return;
    }
    
    try {
      // In a real implementation, this would:
      // 1. Save the deletion reason to the database
      // 2. Delete the user's profile and data
      console.log('Deleting profile with reason:', deleteReason);
      
      // Sign out the user after deletion
      await signOut();
      
      alert('Your profile has been deleted. You will be redirected to the jobs page.');
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Failed to delete profile. Please try again.');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account-settings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Account Settings</h2>
              {/* Accordion for Account Subsections */}
              <div className="border-t border-slate-200 pt-6 mb-6">
                {/* Subheading: Organization Email Verification */}
                <button
                  type="button"
                  className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors text-left text-base font-semibold mb-2 ${openAccountSubsection === 'secondary-email' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  onClick={() => setOpenAccountSubsection(openAccountSubsection === 'secondary-email' ? null : 'secondary-email')}
                >
                  <span>Organization Email Verification</span>
                  <ChevronRight className={`h-5 w-5 transition-transform ${openAccountSubsection === 'secondary-email' ? 'rotate-90' : ''}`} />
                </button>
                {openAccountSubsection === 'secondary-email' && (
                  <div className="pl-2 pr-2 pb-6">
                    <div className="flex items-start space-x-2 mb-4">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Why verify your organization email?</p>
                        <p>This helps us verify your professional identity and provides additional security for your account.</p>
                      </div>
                    </div>

                    {secondaryEmailError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-800 text-sm">{secondaryEmailError}</span>
                        </div>
                      </div>
                    )}

                    {secondaryEmailSuccess && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-800 text-sm">{secondaryEmailSuccess}</span>
                        </div>
                      </div>
                    )}

                    {!secondaryEmailVerified ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Organization Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={secondaryEmail}
                            onChange={(e) => setSecondaryEmail(e.target.value)}
                            placeholder="your.name@company.com"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                            disabled={secondaryEmailOtpSent}
                            required
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Please use your organization email (not Gmail)
                          </p>
                        </div>

                        {!secondaryEmailOtpSent ? (
                          <button
                            onClick={handleSendSecondaryEmailOTP}
                            disabled={secondaryEmailLoading || !secondaryEmail}
                            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {secondaryEmailLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <Mail className="h-4 w-4" />
                                <span>Send Verification Code</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Verification Code <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={secondaryEmailOtp}
                                onChange={(e) => setSecondaryEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-center tracking-widest"
                                maxLength={6}
                                required
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={handleVerifySecondaryEmailOTP}
                                disabled={secondaryEmailLoading || secondaryEmailOtp.length !== 6}
                                className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                              >
                                {secondaryEmailLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Verifying...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Verify Email</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setSecondaryEmailOtpSent(false);
                                  setSecondaryEmailOtp('');
                                  setSecondaryEmailError('');
                                  setSecondaryEmailSuccess('');
                                }}
                                className="bg-slate-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm sm:text-base"
                              >
                                Change Email
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-green-800 font-medium">Organization Email Verified</p>
                            <p className="text-green-700 text-sm">{secondaryEmail}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSecondaryEmailVerified(false);
                            setSecondaryEmailOtpSent(false);
                            setSecondaryEmail('');
                            setSecondaryEmailOtp('');
                            setSecondaryEmailError('');
                            setSecondaryEmailSuccess('');
                          }}
                          className="mt-3 text-green-700 hover:text-green-800 text-sm font-medium"
                        >
                          Change Email
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Subheading: Change Password */}
                <button
                  type="button"
                  className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors text-left text-base font-semibold mb-2 ${openAccountSubsection === 'change-password' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  onClick={() => setOpenAccountSubsection(openAccountSubsection === 'change-password' ? null : 'change-password')}
                >
                  <span>Change Password</span>
                  <ChevronRight className={`h-5 w-5 transition-transform ${openAccountSubsection === 'change-password' ? 'rotate-90' : ''}`} />
                </button>
                {openAccountSubsection === 'change-password' && (
                  <div className="pl-2 pr-2 pb-6">
                    <form onSubmit={handleChangePassword} className="space-y-6">
                      <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
                        {changePasswordError && <div className="text-red-600 text-sm mb-2">{changePasswordError}</div>}
                        {changePasswordSuccess && <div className="text-green-600 text-sm mb-2">{changePasswordSuccess}</div>}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={e => setCurrentPassword(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                              required
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <button
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Forgot Password?
                            </button>
                            <button
                              type="submit"
                              className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                              disabled={changePasswordLoading}
                            >
                              {changePasswordLoading ? 'Updating...' : 'Update Password'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'privacy-policy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Privacy Settings</h2>
              
              {/* Delete Account Section */}
              <div className="border-t border-slate-200 pt-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Delete Your Account</h3>
                  <p className="text-red-700 text-sm mb-4">
                    This action is permanent and cannot be undone. All your data will be permanently removed from our servers.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Account</span>
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Please tell us why you're deleting your account
                        </label>
                        <textarea
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          rows={4}
                          placeholder="Your feedback helps us improve our service"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
                          required
                        />
                      </div>
                      <div className="flex justify-between">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="text-slate-600 hover:text-slate-800 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleProfileDeletion}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Confirm Deletion
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Settings</h3>
            <p className="text-slate-600 text-sm">Select a category from the sidebar to manage your settings.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Settings</h1>
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'logout') {
                        signOut();
                      } else {
                        setActiveSection(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left text-sm sm:text-base ${
                      activeSection === item.id
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;