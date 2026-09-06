import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { trustService } from '../services/TrustService';
import { supabase } from '../lib/supabase';

const SettingsPage: React.FC = () => {
  const { signOut, updatePassword, updateProfile, user, profile } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'account' | 'feedback' | 'admin'>('account');
  const [emailVerificationOpen, setEmailVerificationOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [adminInviteOpen, setAdminInviteOpen] = useState(false);
  const [verificationCooldownUntil, setVerificationCooldownUntil] = useState<number | null>(null);
  const [, forceCooldownTick] = useState(0);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Sync organization email and step when profile loads
  React.useEffect(() => {
    const currentEmail = (profile as any)?.work_email || profile?.secondary_email;
    if (currentEmail) {
      setOrganizationEmail(currentEmail);
    }
    if ((profile as any)?.work_email_verified || profile?.secondary_email_verified) {
      setVerificationStep('verified');
    } else {
      setVerificationStep('input');
    }
  }, [profile]);

  // Tick every second while the "Send Code" cooldown is active, purely so
  // the countdown label updates — the real rate limit is enforced
  // server-side in generate_verification_code, this is just UX politeness.
  React.useEffect(() => {
    if (!verificationCooldownUntil) return;
    const interval = setInterval(() => {
      if (Date.now() >= verificationCooldownUntil) {
        setVerificationCooldownUntil(null);
      } else {
        forceCooldownTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [verificationCooldownUntil]);

  // Account State
  const [organizationEmail, setOrganizationEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Super User / Admin Management State
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const isSuperUser = user?.email === 'ganeshgowdaapplication@gmail.com';
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Demote Admin Modal State
  const [showDemoteConfirmModal, setShowDemoteConfirmModal] = useState(false);
  const [targetAdmin, setTargetAdmin] = useState<{ id: string, email: string } | null>(null);

  // Feedback State
  const [feedback, setFeedback] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('General Feedback');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Verification Step Logic
  const [verificationStep, setVerificationStep] = useState<'input' | 'otp' | 'verified'>(
    ((profile as any)?.work_email_verified || profile?.secondary_email_verified) ? 'verified' : 'input'
  );
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const verifiedOrgEmail = (profile as any)?.work_email || profile?.secondary_email || '';
  const isOrgVerified = Boolean((profile as any)?.work_email_verified || profile?.secondary_email_verified);

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await updatePassword(newPassword, { logoutOthers: true });
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully! Other devices have been logged out.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Fetch administrators for Super User
  React.useEffect(() => {
    if (activeTab === 'admin' && isSuperUser) {
      fetchAdministrators();
    }
  }, [activeTab, isSuperUser]);

  const fetchAdministrators = async () => {
    setAdminsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_administrators');
      if (error) throw error;
      setAdministrators(data || []);
    } catch (err: any) {
      console.error('Error fetching administrators:', err);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleDemoteAdmin = async () => {
    if (!targetAdmin || targetAdmin.email === user?.email) {
      return;
    }

    setAdminsLoading(true);
    setShowDemoteConfirmModal(false);

    try {
      const { error } = await (supabase.rpc as any)('demote_admin', { admin_id: targetAdmin.id });
      if (error) throw error;

      // Refresh list
      await fetchAdministrators();
      setMessage({ type: 'success', text: `Access revoked for ${targetAdmin.email}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error demoting admin:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to revoke access' });
    } finally {
      setAdminsLoading(false);
      setTargetAdmin(null);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback) {
      setFeedbackMessage({ type: 'error', text: 'Please enter your message' });
      return;
    }
    setFeedbackLoading(true);
    setFeedbackMessage(null);
    try {
      const { error } = await (supabase.from('feedback') as any).insert({
        subject: feedbackSubject,
        message: feedback,
        user_email: user?.email,
        user_name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0],
        user_id: user?.id
      });

      if (error) {
        throw new Error(error.message || 'Failed to send feedback');
      }

      setFeedbackMessage({ type: 'success', text: 'Thank you for your feedback! Your message has been sent to our team.' });
      setFeedback('');
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: 'Failed to send feedback. Please try again later.' });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!user?.id) {
      setMessage({ type: 'error', text: 'Please sign in again and retry.' });
      return;
    }
    if (!organizationEmail || !organizationEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid organization email' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const normalizedEmail = organizationEmail.trim().toLowerCase();
      const { success, error } = await trustService.startWorkEmailVerification(user.id, normalizedEmail);
      if (!success) {
        setMessage({ type: 'error', text: error || 'Failed to send verification code.' });
        return;
      }
      setVerificationStep('otp');
      setVerificationCooldownUntil(Date.now() + 60000);
      setMessage({ type: 'success', text: 'Verification code sent to ' + normalizedEmail });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!user?.id) {
      setMessage({ type: 'error', text: 'Please sign in again and retry.' });
      return;
    }
    if (verificationOtp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code.' });
      return;
    }

    setIsVerifying(true);
    setMessage(null);
    try {
      const normalizedEmail = organizationEmail.trim().toLowerCase();
      const { success, error } = await trustService.verifyWorkEmail(user.id, normalizedEmail, verificationOtp);
      if (!success) {
        setMessage({ type: 'error', text: error || 'Invalid verification code.' });
        return;
      }
      await updateProfile({
        secondary_email: normalizedEmail,
        secondary_email_verified: true,
        work_email: normalizedEmail,
        work_email_verified: true
      });
      setVerificationStep('verified');
      setMessage({ type: 'success', text: 'Email verified successfully!' });
    } catch (err: any) {
      console.error('❌ Verification failed:', err);
      let errorMessage = err.message || 'Invalid verification code.';

      // Handle the specific unique constraint violation for verified secondary emails
      if (err.code === '23505' && err.message?.includes('unique_verified_secondary_email')) {
        errorMessage = 'This organization email is already verified on another account. Please use a unique email.';
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetVerification = () => {
    setVerificationStep('input');
    setMessage(null);
  };

  const handleSendAdminInvite = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setInviteMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const { data, error } = await (supabase.rpc('promote_user_to_admin_by_email', {
        user_email: normalizedEmail
      }) as any);

      if (error) {
        throw new Error(error.message || 'Failed to promote user.');
      }

      if (data?.success) {
        setInviteMessage({ type: 'success', text: `User ${normalizedEmail} has been promoted to Administrator successfully!` });
        setInviteEmail('');
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteMessage(null);
        }, 3000);
        return;
      }

      throw new Error(data?.error || 'Failed to promote user.');
    } catch (err: any) {
      setInviteMessage({ type: 'error', text: err?.message || 'Failed to promote user.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      setDeleteMessage({ type: 'error', text: 'Please sign in again and retry.' });
      return;
    }

    setDeleteLoading(true);
    setDeleteMessage(null);
    setShowDeleteConfirmModal(false);

    try {
      const { data, error } = await (supabase.rpc('delete_my_account', {
        delete_reason: deleteReason.trim() || null,
      }) as any);

      if (error) {
        throw new Error(error.message || 'Failed to delete account.');
      }

      if (!(data as any)?.success) {
        throw new Error((data as any)?.error || 'Failed to delete account.');
      }

      // Explicitly clear the local session and storage to prevent "Zombie Session" errors
      await supabase.auth.signOut();
      localStorage.clear(); // Nuclear option to ensure all cached data is gone

      window.location.replace('/');
    } catch (err: any) {
      setDeleteMessage({
        type: 'error',
        text: err?.message || 'Failed to delete account. Please try again.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone flex flex-col">
      <main className="flex-grow py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg border transition-all ${activeTab === 'account'
                    ? 'bg-stone-off text-slate-900 border-transparent shadow-sm'
                    : 'text-slate-500 border-transparent hover:bg-stone-off/50'
                    }`}
                >
                  <span className={`material-symbols-outlined transition-colors ${activeTab === 'account' ? 'text-sage' : 'text-slate-400 group-hover:text-slate-600'}`}>person</span>
                  Account
                </button>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={`w-full group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg border transition-all ${activeTab === 'feedback'
                    ? 'bg-stone-off text-slate-900 border-transparent shadow-sm'
                    : 'text-slate-500 border-transparent hover:bg-stone-off/50'
                    }`}
                >
                  <span className={`material-symbols-outlined transition-colors ${activeTab === 'feedback' ? 'text-sage' : 'text-slate-400 group-hover:text-slate-600'}`}>rate_review</span>
                  Feedback
                </button>
                {isSuperUser && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`w-full group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg border transition-all ${activeTab === 'admin'
                      ? 'bg-slate-900 text-white border-transparent shadow-sm'
                      : 'text-slate-500 border-transparent hover:bg-stone-off/50'
                      }`}
                  >
                    <span className={`material-symbols-outlined transition-colors ${activeTab === 'admin' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'}`}>security</span>
                    Admin Management
                  </button>
                )}
                <div className="pt-4 mt-4 border-t border-slate-100"></div>
                <button onClick={handleLogout} className="w-full group flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-red-500 group-hover:text-red-600">logout</span>
                  Logout
                </button>
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-3 space-y-4 md:space-y-6">
            <div className="lg:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h1 className="text-lg font-bold text-slate-900 mb-3">Settings</h1>
              <div className={`grid ${isSuperUser ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`h-11 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'account'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  Account
                </button>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={`h-11 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'feedback'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  Feedback
                </button>
                {isSuperUser && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`h-11 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'admin'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    Admin
                  </button>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full h-11 rounded-xl bg-red-50 text-red-600 text-sm font-semibold"
              >
                Logout
              </button>
            </div>

            {activeTab === 'account' ? (
              <>
                <details className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" open={emailVerificationOpen}>
                  <summary
                    onClick={(event) => {
                      event.preventDefault();
                      setEmailVerificationOpen((prev) => !prev);
                    }}
                    className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-stone-off/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                        <span className="material-symbols-outlined">mark_email_read</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Email Verification</h3>
                        <p className="text-sm text-slate-500">Manage your organization email address</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
                  </summary>
                  <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 border-t border-slate-100">
                    <div className="max-w-xl space-y-5 md:space-y-6 pt-4">
                      {isOrgVerified && verificationStep === 'verified' && (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 md:p-6 flex flex-col gap-4 animate-in fade-in duration-500">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-sage text-[24px]">verified</span>
                            </div>
                            <div className="flex-grow">
                              <h4 className="text-base font-bold text-slate-900 leading-tight">Verified & Profile Completed</h4>
                              <p className="text-sm text-slate-500 mt-1">Your professional identity is active with <span className="font-semibold text-slate-700">{verifiedOrgEmail}</span></p>
                            </div>
                            <button
                              onClick={handleResetVerification}
                              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:shadow transition-all flex items-center gap-2 group"
                            >
                              <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">edit</span>
                              Change
                            </button>
                          </div>
                        </div>
                      )}
                      {verificationStep !== 'verified' && (
                        <div className="space-y-4 pt-4 border-t border-slate-50 mt-4">
                          <label className="block text-sm font-medium text-slate-700">Organization Email <span className="text-red-500">*</span></label>

                          {message && (
                            <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                              {message.text}
                            </div>
                          )}

                          {verificationStep === 'input' && (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="material-symbols-outlined text-slate-500 text-[20px]">mail</span>
                                </div>
                                <input
                                  className="block w-full rounded-lg border border-slate-500 bg-white pl-10 py-2.5 text-slate-900 placeholder:text-slate-500 focus:border-sage focus:outline-none sm:text-sm shadow-sm transition-all"
                                  placeholder="name@company.com"
                                  type="email"
                                  value={organizationEmail}
                                  onChange={(e) => setOrganizationEmail(e.target.value)}
                                />
                              </div>
                              <button
                                onClick={handleSendVerificationCode}
                                disabled={loading || !organizationEmail || !organizationEmail.includes('@') || Boolean(verificationCooldownUntil)}
                                className="bg-sage text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-sage-dark transition-all whitespace-nowrap active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {loading
                                  ? 'Sending...'
                                  : verificationCooldownUntil
                                    ? `Wait ${Math.max(0, Math.ceil((verificationCooldownUntil - Date.now()) / 1000))}s`
                                    : 'Send Code'}
                              </button>
                            </div>
                          )}

                          {verificationStep === 'otp' && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                              <p className="text-sm text-slate-500">We've sent a 6-digit code to {organizationEmail}. Please enter it below.</p>
                              <div className="flex flex-wrap gap-3">
                                <input
                                  className="block w-full max-w-[200px] rounded-lg border border-slate-900 bg-white px-4 py-2.5 text-center text-xl font-bold tracking-widest text-slate-900 focus:border-sage focus:outline-none shadow-sm transition-all"
                                  placeholder="000000"
                                  maxLength={6}
                                  value={verificationOtp}
                                  onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                                />
                                <button
                                  onClick={handleVerifyOTP}
                                  disabled={isVerifying || verificationOtp.length !== 6}
                                  className="bg-slate-900 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                  {isVerifying ? 'Verifying...' : 'Confirm'}
                                </button>
                              </div>
                              <button onClick={() => setVerificationStep('input')} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider">Change Email</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </details>

                <details className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" open={passwordOpen}>
                  <summary
                    onClick={(event) => {
                      event.preventDefault();
                      setPasswordOpen((prev) => !prev);
                    }}
                    className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-stone-off/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                        <span className="material-symbols-outlined">lock_reset</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
                        <p className="text-sm text-slate-500">Update your account security credentials</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
                  </summary>
                  <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 border-t border-slate-100">
                    <div className="max-w-md space-y-5 pt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                        <input className="block w-full rounded-lg border border-stone-border bg-white py-2.5 text-slate-900 focus:border-sage focus:outline-none sm:text-sm" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        <div className="flex justify-end mt-1">
                          <a className="text-xs font-medium text-sage hover:text-sage-dark" href="#">Forgot Password?</a>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                          <input className="block w-full rounded-lg border border-stone-border bg-white py-2.5 text-slate-900 focus:border-sage focus:outline-none sm:text-sm" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                          <input className="block w-full rounded-lg border border-stone-border bg-white py-2.5 text-slate-900 focus:border-sage focus:outline-none sm:text-sm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                      </div>
                      {message && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {message.text}
                        </div>
                      )}
                      <div className="pt-2">
                        <button
                          onClick={handleUpdatePassword}
                          disabled={loading}
                          className="bg-sage text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {loading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Updating...
                            </>
                          ) : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </div>
                </details>

                {(isSuperUser || profile?.role === 'admin') && (
                  <details className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" open={adminInviteOpen}>
                    <summary
                      onClick={(event) => {
                        event.preventDefault();
                        setAdminInviteOpen((prev) => !prev);
                      }}
                      className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-stone-off/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                          <span className="material-symbols-outlined">admin_panel_settings</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Admin Invite</h3>
                          <p className="text-sm text-slate-500">Add administrators to your organization</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
                    </summary>
                    <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 border-t border-slate-100">
                      <div className="space-y-4 pt-4">
                        <div className="bg-stone-off rounded-xl p-4 md:p-6 border border-slate-100">
                          <h4 className="text-base font-semibold text-slate-900 mb-2">Invite Administrator</h4>
                          <p className="text-sm text-slate-500 mb-6 leading-relaxed">Admins have full access to your organization's settings, billing, and user management. Only invite trusted team members.</p>
                          <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Promote New Admin
                          </button>
                        </div>
                      </div>
                    </div>
                  </details>
                )}

                <details className="group bg-red-50/40 rounded-2xl shadow-sm border border-red-100 overflow-hidden" open={deleteAccountOpen}>
                  <summary
                    onClick={(event) => {
                      event.preventDefault();
                      setDeleteAccountOpen((prev) => !prev);
                    }}
                    className="flex items-center justify-between p-4 md:p-6 cursor-pointer hover:bg-red-50/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600">
                        <span className="material-symbols-outlined">delete_forever</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Delete Account</h3>
                        <p className="text-sm text-slate-500">Permanently remove your account and data</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-500 group-open:rotate-90 transition-transform duration-200">chevron_right</span>
                  </summary>
                  <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 border-t border-red-100">
                    <div className="space-y-4 pt-4">
                      <p className="text-sm text-slate-600 italic">This action cannot be undone. All your data, referrals, and connections will be permanently deleted.</p>
                      <textarea
                        className="block w-full rounded-lg border-stone-border bg-white py-2 px-3 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none sm:text-sm min-h-[100px]"
                        placeholder="Please tell us why you are leaving..."
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                      />
                      {deleteMessage && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${deleteMessage.type === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                          {deleteMessage.text}
                        </div>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirmModal(true)}
                        disabled={deleteLoading}
                        className="bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleteLoading ? 'Deleting...' : 'Delete My Account'}
                      </button>
                    </div>
                  </div>
                </details>
              </>
            ) : activeTab === 'admin' && isSuperUser ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600">
                        <span className="material-symbols-outlined text-[28px]">shield_person</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Admin Management</h3>
                        <p className="text-sm text-slate-500">Overview of all users with administrative privileges</p>
                      </div>
                    </div>
                    <button
                      onClick={fetchAdministrators}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Refresh list"
                    >
                      <span className={`material-symbols-outlined ${adminsLoading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                  </div>

                  {adminsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <div className="flex gap-1 mb-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <p className="text-sm font-medium text-slate-500">Loading administrator registry...</p>
                    </div>
                  ) : administrators.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                            <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                            <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
                            <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Verification</th>
                            <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {administrators.map((admin) => (
                            <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                    {admin.full_name?.charAt(0) || admin.email?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900">{admin.full_name || 'Anonymous User'}</div>
                                    <div className="text-xs text-slate-500 font-medium">{admin.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                                  {admin.role}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm text-slate-500 font-medium">
                                  {new Date(admin.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {admin.work_email_verified ? (
                                  <div className="flex items-center gap-1.5 text-sage">
                                    <span className="text-[10px] font-bold uppercase">Verified</span>
                                    <span className="material-symbols-outlined text-[16px]">verified</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-300 uppercase">Unverified</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right">
                                {admin.email !== user?.email ? (
                                  <button
                                    onClick={() => {
                                      setTargetAdmin({ id: admin.id, email: admin.email });
                                      setShowDemoteConfirmModal(true);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center ml-auto group"
                                    title="Remove Administrator Access"
                                  >
                                    <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">person_remove</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-300 uppercase px-2 italic">You</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="material-symbols-outlined text-slate-300 text-[48px] mb-4">group_off</span>
                      <p className="text-slate-500 font-medium">No administrators found</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 md:p-6">
                  <div className="flex items-center gap-4 mb-4 md:mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sage-light text-sage">
                      <span className="material-symbols-outlined text-[28px]">rate_review</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Feedback</h3>
                      <p className="text-sm text-slate-500">Help us improve Thessis by sharing your thoughts</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-2">Subject</label>
                      <select
                        value={feedbackSubject}
                        onChange={(e) => setFeedbackSubject(e.target.value)}
                        className="block w-full rounded-lg border border-stone-border bg-white py-2.5 px-3 text-slate-900 focus:border-sage focus:outline-none sm:text-sm shadow-sm transition-all cursor-pointer"
                      >
                        <option>General Feedback</option>
                        <option>Bug Report</option>
                        <option>Feature Request</option>
                        <option>User Experience</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-2">Message</label>
                      <textarea
                        className="block w-full rounded-lg border border-slate-300 bg-white py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:border-sage focus:outline-none sm:text-sm min-h-[200px] shadow-sm transition-all"
                        placeholder="How can we make Thessis better for you?"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </div>

                    {feedbackMessage && (
                      <div className={`p-4 rounded-xl text-sm font-medium ${feedbackMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {feedbackMessage.text}
                      </div>
                    )}

                    <button
                      onClick={handleSubmitFeedback}
                      disabled={feedbackLoading}
                      className="bg-sage text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-sage-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      {feedbackLoading ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Sending...
                        </>
                      ) : 'Submit Feedback'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Promote User to Administrator</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="block w-full rounded-lg border border-stone-border bg-white py-2.5 px-3 text-slate-900 placeholder:text-slate-500 focus:border-sage focus:outline-none sm:text-sm"
                />
              </div>
              {inviteMessage && (
                <div className={`p-3 rounded-lg text-sm font-medium ${inviteMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {inviteMessage.text}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendAdminInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="flex-1 bg-sage text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-sage-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  onClick={() => { setShowInviteModal(false); setInviteEmail(''); setInviteMessage(null); }}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-parchment-sunken transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-600">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Account Deletion</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete your account? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-parchment-sunken transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDemoteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-600">
                <span className="material-symbols-outlined">person_remove</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Revoke Admin Access</h3>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl mb-6 border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to remove administrative access for:
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                {targetAdmin?.email}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDemoteConfirmModal(false); setTargetAdmin(null); }}
                disabled={adminsLoading}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-parchment-sunken transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDemoteAdmin}
                disabled={adminsLoading}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {adminsLoading ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
