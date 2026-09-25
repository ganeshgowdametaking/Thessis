import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { trustService } from '../services/TrustService';
import { supabase } from '../lib/supabase';
import { AlertCircle, Briefcase, Check, Loader2, Lock, LogOut, Mail, MessageSquare, Pencil, RefreshCw, ShieldCheck, Trash2, UserMinus, UserRound } from 'lucide-react';

type SettingsTab = 'account' | 'security' | 'work-email' | 'feedback' | 'admin';

const SettingsPage: React.FC = () => {
  const { signOut, updatePassword, refreshProfile, user, profile } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [verificationCooldownUntil, setVerificationCooldownUntil] = useState<number | null>(null);
  const [, forceCooldownTick] = useState(0);

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
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const { error } = await updatePassword(newPassword, { logoutOthers: true });
      if (error) {
        setPasswordMessage({ type: 'error', text: error.message });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully! Other devices have been logged out.' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMessage(null), 5000);
      }
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setPasswordLoading(false);
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
      await refreshProfile();
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

  const canManageAdmins = isSuperUser || profile?.role === 'admin';
  const tabs: { id: SettingsTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account', shortLabel: 'Account', icon: <UserRound className="h-[18px] w-[18px]" /> },
    { id: 'security', label: 'Sign-in & security', shortLabel: 'Security', icon: <Lock className="h-[18px] w-[18px]" /> },
    { id: 'work-email', label: 'Work email', shortLabel: 'Work email', icon: <Briefcase className="h-[18px] w-[18px]" /> },
    { id: 'feedback', label: 'Feedback', shortLabel: 'Feedback', icon: <MessageSquare className="h-[18px] w-[18px]" /> },
    ...(canManageAdmins ? [{ id: 'admin' as SettingsTab, label: 'Admins', shortLabel: 'Admins', icon: <ShieldCheck className="h-[18px] w-[18px]" /> }] : []),
  ];
  const feedbackTopics = [
    { value: 'General Feedback', label: 'General feedback' },
    { value: 'Bug Report', label: 'Bug report' },
    { value: 'Feature Request', label: 'Feature request' },
    { value: 'User Experience', label: 'User experience' },
    { value: 'Other', label: 'Other' },
  ];

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setMessage(null);
  };

  const cooldownSeconds = verificationCooldownUntil ? Math.max(0, Math.ceil((verificationCooldownUntil - Date.now()) / 1000)) : 0;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Your account';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();

  const inputClass = 'w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors disabled:bg-slate-50';
  const labelClass = 'block text-[12.5px] font-semibold text-slate-600 mb-1.5';
  const primaryButtonClass = 'h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  const outlineButtonClass = 'h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-[12.5px] font-bold text-ink hover:bg-parchment-sunken transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5';
  const dangerOutlineClass = 'h-9 px-3.5 rounded-xl border border-red-200 bg-white text-[12.5px] font-bold text-red-600 hover:bg-danger-tint transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5';

  const renderNotice = (notice: { type: 'success' | 'error'; text: string } | null) =>
    notice && (
      <div
        role={notice.type === 'error' ? 'alert' : 'status'}
        className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-semibold leading-snug ${notice.type === 'success' ? 'bg-success-tint text-success-ink' : 'bg-danger-tint text-red-600'}`}
      >
        {notice.type === 'success' ? <Check className="h-4 w-4 shrink-0 mt-px" strokeWidth={3} /> : <AlertCircle className="h-4 w-4 shrink-0 mt-px" />}
        {notice.text}
      </div>
    );

  const renderSection = (title: string, subtitle: string, children: React.ReactNode, danger = false) => (
    <section className="flex flex-col gap-2.5">
      <div className="px-0.5">
        <h2 className={`font-display text-[17px] font-extrabold ${danger ? 'text-red-600' : 'text-ink'}`}>{title}</h2>
        {subtitle && <p className="text-[12.5px] text-slate-500">{subtitle}</p>}
      </div>
      <div className={`bg-white border rounded-2xl overflow-hidden ${danger ? 'border-red-200' : 'border-slate-200'}`}>{children}</div>
    </section>
  );

  const renderRow = (title: string, description: React.ReactNode, action?: React.ReactNode, isLast = false) => (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5 px-4 py-4 md:px-[22px] md:py-[18px] ${isLast ? '' : 'border-b border-slate-100'}`}>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        {description && <div className="text-[12.5px] leading-snug text-slate-500 mt-0.5 break-words">{description}</div>}
      </div>
      {action && <div className="shrink-0 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );

  const renderStepper = (step: number) => {
    const steps = ['Email', 'Code', 'Verified'];
    return (
      <ol className="flex items-center gap-2.5">
        {steps.map((label, index) => {
          const number = index + 1;
          const done = number < step || (number === 3 && step === 3);
          const current = number === step && !done;
          return (
            <li key={label} className="flex items-center gap-2.5">
              {index > 0 && <span className="h-px w-5 sm:w-7 bg-slate-200" aria-hidden="true" />}
              <span className={`flex items-center gap-2 text-[12.5px] ${current || done ? 'font-bold text-ink' : 'font-semibold text-slate-500'}`}>
                <span className={`size-[22px] rounded-full flex items-center justify-center text-[11px] font-extrabold ${done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-parchment-sunken text-slate-500'}`}>
                  {done ? <Check className="h-3 w-3" strokeWidth={3.5} /> : number}
                </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderAccount = () => (
    <>
      {renderSection('Account', '', (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 md:px-[22px] md:py-[18px] border-b border-slate-100">
            <div className="flex items-center gap-3.5 min-w-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-12 rounded-full object-cover shrink-0" />
              ) : (
                <span className="size-12 shrink-0 rounded-full bg-ink-wash text-primary-hover font-display font-extrabold text-base flex items-center justify-center">{initials || <UserRound className="h-5 w-5" />}</span>
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-ink truncate">{displayName}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/profile')} className={outlineButtonClass}>
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </button>
          </div>
          {renderRow('Sign-in email', <>{user?.email} — the email you use to log in.</>)}
          {renderRow(
            'Work email',
            '',
            <>
              {isOrgVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-1 text-[11.5px] font-bold text-success-ink max-w-[240px] truncate">
                  <Check className="h-3 w-3 shrink-0" strokeWidth={3.5} />
                  Verified · {verifiedOrgEmail}
                </span>
              ) : (
                <span className="rounded-full bg-parchment-sunken px-2.5 py-1 text-[11.5px] font-bold text-slate-600">Not verified</span>
              )}
              <button type="button" onClick={() => selectTab('work-email')} className={outlineButtonClass}>
                {isOrgVerified ? 'Change' : 'Verify'}
              </button>
            </>,
            true
          )}
        </>
      ))}

      {renderSection('Danger zone', '', (
        <>
          {renderRow(
            'Delete account',
            '',
            <button type="button" onClick={() => setShowDeleteConfirmModal(true)} disabled={deleteLoading} className={dangerOutlineClass}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteLoading ? 'Deleting…' : 'Delete account'}
            </button>,
            !deleteMessage
          )}
          {deleteMessage && <div className="px-4 pb-4 md:px-[22px]">{renderNotice(deleteMessage)}</div>}
        </>
      ), true)}

      <button
        type="button"
        onClick={handleLogout}
        className="lg:hidden h-12 rounded-xl border border-slate-200 bg-white text-sm font-bold text-red-600 flex items-center justify-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </>
  );

  const renderSecurity = () =>
    renderSection('Sign-in & security', '', passwordFormOpen ? (
      <form
        className="px-4 py-4 md:px-[22px] md:py-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleUpdatePassword();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Change password</p>
            <p className="text-[12.5px] text-slate-500 mt-0.5">At least 6 characters. You'll stay signed in here; other devices will be signed out.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPasswordFormOpen(false);
              setNewPassword('');
              setConfirmPassword('');
              setPasswordMessage(null);
            }}
            className="shrink-0 text-[12.5px] font-bold text-slate-500 hover:text-ink"
          >
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>New password</span>
            <input className={inputClass} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <label className="block">
            <span className={labelClass}>Confirm new password</span>
            <input className={inputClass} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
        </div>
        {renderNotice(passwordMessage)}
        <div>
          <button type="submit" disabled={passwordLoading} className={primaryButtonClass}>
            {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {passwordLoading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    ) : (
      <>
        {renderRow(
          'Password',
          '',
          <button type="button" onClick={() => { setPasswordFormOpen(true); setPasswordMessage(null); }} className={outlineButtonClass}>
            Change password
          </button>,
          !passwordMessage
        )}
        {passwordMessage && <div className="px-4 pb-4 md:px-[22px]">{renderNotice(passwordMessage)}</div>}
      </>
    ));

  const renderWorkEmail = () => {
    const step = verificationStep === 'verified' && isOrgVerified ? 3 : verificationStep === 'otp' ? 2 : 1;
    return renderSection('Work email', '', (
      <div className="px-4 py-4 md:px-[22px] md:py-5 flex flex-col gap-4">
        {renderStepper(step)}

        {step === 3 && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-success-tint px-4 py-3.5">
            <div className="min-w-0 text-[13px] text-success-ink">
              <p className="flex items-center gap-1.5 font-bold"><Check className="h-4 w-4" strokeWidth={3} />Verified</p>
              <p className="truncate">{verifiedOrgEmail}</p>
            </div>
            <button type="button" onClick={handleResetVerification} className={outlineButtonClass}>Change</button>
          </div>
        )}

        {step === 1 && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendVerificationCode();
            }}
          >
            <label className="block">
              <span className={labelClass}>Work email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className={`${inputClass} pl-10`}
                  placeholder="name@company.com"
                  type="email"
                  autoComplete="email"
                  value={organizationEmail}
                  onChange={(e) => setOrganizationEmail(e.target.value)}
                />
              </div>
            </label>
            {renderNotice(message)}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <button
                type="submit"
                disabled={loading || !organizationEmail || !organizationEmail.includes('@') || Boolean(verificationCooldownUntil)}
                className={primaryButtonClass}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Sending…' : verificationCooldownUntil ? `Wait ${cooldownSeconds}s` : 'Send code'}
              </button>
              <span className="text-xs text-slate-500">We'll email you a 6-digit code.</span>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOTP();
            }}
          >
            <p className="text-[13px] text-slate-600">We sent a 6-digit code to <strong className="text-ink">{organizationEmail}</strong>.</p>
            <label className="block">
              <span className="sr-only">6-digit code</span>
              <input
                className="w-full max-w-[260px] h-14 px-4 rounded-xl border-[1.5px] border-slate-300 bg-white text-center font-display text-2xl font-extrabold tracking-[0.5em] text-ink placeholder:text-slate-300 focus:border-primary focus:outline-none"
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={verificationOtp}
                onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            {renderNotice(message)}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="submit" disabled={isVerifying || verificationOtp.length !== 6} className={primaryButtonClass}>
                {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                {isVerifying ? 'Verifying…' : 'Confirm'}
              </button>
              {verificationCooldownUntil ? (
                <span className="text-[12.5px] text-slate-500">Resend code in {cooldownSeconds}s</span>
              ) : (
                <button type="button" onClick={handleSendVerificationCode} disabled={loading} className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50">
                  Resend code
                </button>
              )}
              <button type="button" onClick={() => setVerificationStep('input')} className="text-[12.5px] font-bold text-primary hover:underline">
                Use a different email
              </button>
            </div>
          </form>
        )}
      </div>
    ));
  };

  const renderFeedback = () =>
    renderSection('Feedback', '', (
      <form
        className="px-4 py-4 md:px-[22px] md:py-5 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitFeedback();
        }}
      >
        <div className="flex flex-col gap-2">
          <span className={labelClass}>What's it about?</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Feedback topic">
            {feedbackTopics.map((topic) => (
              <button
                key={topic.value}
                type="button"
                role="radio"
                aria-checked={feedbackSubject === topic.value}
                onClick={() => setFeedbackSubject(topic.value)}
                className={`h-9 px-3.5 rounded-full border text-[12.5px] font-bold transition-colors ${feedbackSubject === topic.value ? 'bg-ink border-ink text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className={labelClass}>Message</span>
          <textarea
            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none min-h-[140px] resize-y"
            placeholder="How can we make Thessis better for you?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </label>
        {renderNotice(feedbackMessage)}
        <div>
          <button type="submit" disabled={feedbackLoading} className={primaryButtonClass}>
            {feedbackLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {feedbackLoading ? 'Sending…' : 'Send feedback'}
          </button>
        </div>
      </form>
    ));

  const renderAdmins = () => (
    <>
      {renderSection('Admins', '', (
        renderRow(
          'Make someone an admin',
          '',
          <button type="button" onClick={() => setShowInviteModal(true)} className={outlineButtonClass}>
            <ShieldCheck className="h-4 w-4" />
            Make someone an admin
          </button>,
          true
        )
      ))}

      {isSuperUser && renderSection('People with admin access', administrators.length > 0 ? `${administrators.length} ${administrators.length === 1 ? 'admin' : 'admins'}` : 'Everyone who can manage Thessis.', (
        <>
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-[22px] border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">Only you can remove access.</span>
            <button type="button" onClick={fetchAdministrators} className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-600 hover:text-ink" title="Refresh list">
              <RefreshCw className={`h-3.5 w-3.5 ${adminsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          {message && <div className="px-4 pt-3 md:px-[22px]">{renderNotice(message)}</div>}
          {adminsLoading && administrators.length === 0 ? (
            <div className="px-4 py-10 flex items-center justify-center gap-2 text-sm text-slate-500" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading admins…
            </div>
          ) : administrators.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No admins found.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {administrators.map((admin) => (
                <li key={admin.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 md:px-[22px]">
                  <span className="size-9 shrink-0 rounded-full bg-ink-wash text-primary-hover text-xs font-extrabold flex items-center justify-center">
                    {(admin.full_name?.charAt(0) || admin.email?.charAt(0) || '?').toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-ink truncate">{admin.full_name || 'Unnamed member'}</p>
                    <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                  </div>
                  {admin.work_email_verified ? (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-1 text-[11px] font-bold text-success-ink whitespace-nowrap">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                      Work email verified
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex rounded-full bg-parchment-sunken px-2.5 py-1 text-[11px] font-bold text-slate-600 whitespace-nowrap">Not verified</span>
                  )}
                  <span className="hidden md:block w-24 text-right text-xs text-slate-500">
                    {admin.created_at ? new Date(admin.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                  <span className="w-full sm:w-[130px] flex sm:justify-end">
                    {admin.email !== user?.email ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetAdmin({ id: admin.id, email: admin.email });
                          setShowDemoteConfirmModal(true);
                        }}
                        className={`${dangerOutlineClass} h-8 whitespace-nowrap`}
                      >
                        Remove access
                      </button>
                    ) : (
                      <span className="text-[11.5px] font-bold text-slate-500">You</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ))}
    </>
  );

  const renderModal = (
    icon: React.ReactNode,
    tone: string,
    title: string,
    body: React.ReactNode,
    extra: React.ReactNode,
    onCancel: () => void,
    confirm: React.ReactNode
  ) => (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-ink/45" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full sm:max-w-[400px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex flex-col gap-2.5">
          <span className={`size-12 rounded-full flex items-center justify-center ${tone}`}>{icon}</span>
          <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
          <div className="text-[13px] leading-relaxed text-slate-500">{body}</div>
          {extra}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 px-5 pt-2 pb-6 sm:py-4 sm:border-t sm:border-slate-100 sm:bg-parchment">
          <button type="button" autoFocus onClick={onCancel} className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-parchment-sunken transition-colors">
            Cancel
          </button>
          {confirm}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-parchment font-display flex flex-col">
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-4 md:px-6 py-5 md:py-9 flex flex-col gap-4 md:gap-6">
        <header>
          <h1 className="font-display text-2xl md:text-[30px] font-extrabold text-ink">Settings</h1>
        </header>

        {/* Section chips on smaller screens */}
        <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => selectTab(tab.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full border text-[12.5px] font-bold transition-colors ${activeTab === tab.id ? 'bg-ink border-ink text-white' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              {tab.shortLabel}
            </button>
          ))}
        </div>

        <div className="flex gap-6 items-start">
          <nav className="hidden lg:flex w-[250px] shrink-0 sticky top-24 flex-col gap-0.5 bg-white border border-slate-200 rounded-2xl p-2.5" aria-label="Settings sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => selectTab(tab.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors ${activeTab === tab.id ? 'bg-ink-wash text-primary-hover font-bold' : 'text-slate-600 font-semibold hover:bg-parchment-sunken'}`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'admin' && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin</span>}
              </button>
            ))}
            <div className="h-px bg-slate-200 mx-1 my-2" />
            <button type="button" onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold text-red-600 hover:bg-danger-tint transition-colors">
              <LogOut className="h-[18px] w-[18px]" />
              Log out
            </button>
          </nav>

          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {activeTab === 'account' && renderAccount()}
            {activeTab === 'security' && renderSecurity()}
            {activeTab === 'work-email' && renderWorkEmail()}
            {activeTab === 'feedback' && renderFeedback()}
            {activeTab === 'admin' && canManageAdmins && renderAdmins()}
          </div>
        </div>
      </main>

      {showInviteModal && renderModal(
        <ShieldCheck className="h-6 w-6" />,
        'bg-ink-wash text-primary',
        'Make someone an admin',
        <>They get admin access straight away — there's no invite for them to accept. Admins can see the analytics dashboard and add other admins.</>,
        <div className="flex flex-col gap-3 mt-1">
          <label className="block">
            <span className={labelClass}>Email of their Thessis account</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
              className={inputClass}
            />
          </label>
          {renderNotice(inviteMessage)}
        </div>,
        () => { setShowInviteModal(false); setInviteEmail(''); setInviteMessage(null); },
        <button
          type="button"
          onClick={handleSendAdminInvite}
          disabled={inviteLoading || !inviteEmail.trim()}
          className="flex-[1.3] h-11 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {inviteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {inviteLoading ? 'Working…' : 'Make admin'}
        </button>
      )}

      {showDeleteConfirmModal && renderModal(
        <Trash2 className="h-6 w-6" />,
        'bg-danger-tint text-red-600',
        'Delete your account?',
        <>Your profile, referrals and connections will be permanently removed and you'll be signed out. This can't be undone.</>,
        <label className="block mt-1">
          <span className={labelClass}>Why are you leaving? (optional)</span>
          <textarea
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none min-h-[76px] resize-none"
            placeholder="Tell us what we could do better…"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        </label>,
        () => { if (!deleteLoading) setShowDeleteConfirmModal(false); },
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
          className="flex-[1.3] h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deleteLoading ? 'Deleting…' : 'Delete my account'}
        </button>
      )}

      {showDemoteConfirmModal && renderModal(
        <UserMinus className="h-6 w-6" />,
        'bg-danger-tint text-red-600',
        'Remove admin access?',
        <><strong className="text-ink break-all">{targetAdmin?.email}</strong> will lose admin access straight away.</>,
        null,
        () => { setShowDemoteConfirmModal(false); setTargetAdmin(null); },
        <button
          type="button"
          onClick={handleDemoteAdmin}
          disabled={adminsLoading}
          className="flex-[1.3] h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {adminsLoading ? 'Removing…' : 'Remove access'}
        </button>
      )}
    </div>
  );
};

export default SettingsPage;
