import React, { useState } from 'react';
import { Settings, User, Shield, Bell, LogOut, ChevronRight, Trash2 } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

interface SettingsPageProps {
  currentSection: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentSection }) => {
  const { user, signOut } = useAuthContext();
  const [activeSection, setActiveSection] = useState(currentSection === 'settings' ? 'account-settings' : currentSection);
  const [notifications, setNotifications] = useState({
    email: true
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const menuItems = [
    { id: 'account-settings', label: 'Account Settings', icon: User },
    { id: 'privacy-policy', label: 'Privacy Settings', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'logout', label: 'Logout', icon: LogOut, danger: true }
  ];

  const handleNotificationToggle = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
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

  const handleChangePassword = async () => {
    try {
      if (newPassword !== confirmPassword) {
        alert('Passwords do not match.');
        return;
      }
      
      if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
      }
      
      // In a real implementation, this would call an API to change the password
      console.log('Changing password...');
      alert('Password changed successfully!');
      
      // Reset the form
      setShowForgotPassword(false);
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpSent(false);
      setOtpVerified(false);
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please try again.');
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
      
      alert('Your profile has been deleted. You will be redirected to the home page.');
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
              
              {/* Change Password Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
                
                {!showForgotPassword ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setShowForgotPassword(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Forgot Password?
                      </button>
                      <button className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base">
                        Update Password
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!otpSent ? (
                      <>
                        <p className="text-slate-600 text-sm">
                          We'll send a verification code to your email address to reset your password.
                        </p>
                        <div className="flex justify-end">
                          <button
                            onClick={handleSendOTP}
                            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                          >
                            Send Verification Code
                          </button>
                        </div>
                      </>
                    ) : !otpVerified ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Enter Verification Code
                          </label>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit code"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          />
                        </div>
                        <div className="flex justify-between">
                          <button
                            onClick={() => {
                              setShowForgotPassword(false);
                              setOtpSent(false);
                            }}
                            className="text-slate-600 hover:text-slate-800 text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleVerifyOTP}
                            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                          >
                            Verify Code
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          />
                        </div>
                        <div className="flex justify-between">
                          <button
                            onClick={() => {
                              setShowForgotPassword(false);
                              setOtpSent(false);
                              setOtpVerified(false);
                            }}
                            className="text-slate-600 hover:text-slate-800 text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleChangePassword}
                            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                          >
                            Change Password
                          </button>
                        </div>
                      </>
                    )}
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

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">Notification Preferences</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 text-sm sm:text-base">Email Notifications</div>
                    <div className="text-xs sm:text-sm text-slate-600">Receive notifications via email</div>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('email')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.email ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.email ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
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