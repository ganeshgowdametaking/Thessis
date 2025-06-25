import React, { useState } from 'react';
import { Settings, User, Shield, LogOut, ChevronRight, Trash2 } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

interface SettingsPageProps {
  currentSection: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentSection }) => {
  const { user, signOut } = useAuthContext();
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

  const menuItems = [
    { id: 'account-settings', label: 'Account Settings', icon: User },
    { id: 'privacy-policy', label: 'Privacy Settings', icon: Shield },
    { id: 'logout', label: 'Logout', icon: LogOut, danger: true }
  ];

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