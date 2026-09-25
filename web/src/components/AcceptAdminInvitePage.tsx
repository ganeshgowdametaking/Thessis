import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, BarChart3, Check, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AcceptAdminInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'pending'|'success'|'error'>('pending');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link.');
      return;
    }
    fetch('https://fvprdknorvuqggwxfqly.supabase.co/functions/v1/accept-admin-invite', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage('You have been promoted to admin! You can now access the analytics dashboard. Redirecting...');
          setTimeout(() => navigate('/settings'), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to accept invitation.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Failed to accept invitation.');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen md:min-h-[calc(100vh-5rem)] flex flex-col lg:flex-row">
      {/* Left: what admin access includes */}
      <aside className="hidden lg:flex lg:w-[43%] shrink-0 bg-ink text-white flex-col justify-between p-16">
        <img src="/brand/thessis-logo-white.svg" alt="Thessis" className="h-8 w-auto self-start" />

        <div className="flex flex-col gap-5 max-w-md">
          <span className="text-[13px] font-bold uppercase tracking-wider text-indigo-200">Admin access</span>
          <h2 className="font-display font-extrabold text-[34px] leading-tight">You've been invited to help run Thessis.</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            Admins get a couple of extra tools for looking after the platform.
          </p>
        </div>

        <ul className="flex flex-col gap-3 max-w-md">
          <li className="flex items-center gap-3.5 p-4 bg-[#1B1B33] rounded-2xl">
            <span className="h-9 w-9 shrink-0 rounded-[10px] bg-[#26264A] text-indigo-200 flex items-center justify-center">
              <BarChart3 className="h-[18px] w-[18px]" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">Analytics dashboard</span>
              <span className="text-[12.5px] text-slate-400">See platform-wide growth, referrals and compliance data.</span>
            </span>
          </li>
          <li className="flex items-center gap-3.5 p-4 bg-[#1B1B33] rounded-2xl">
            <span className="h-9 w-9 shrink-0 rounded-[10px] bg-[#26264A] text-indigo-200 flex items-center justify-center">
              <UserPlus className="h-[18px] w-[18px]" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">Invite other admins</span>
              <span className="text-[12.5px] text-slate-400">Send admin invites from your Settings page.</span>
            </span>
          </li>
        </ul>
      </aside>

      {/* Right: status card */}
      <div className="flex-1 bg-parchment flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-[440px] bg-white border border-slate-200 rounded-2xl shadow-sm px-8 py-11 sm:px-10 flex flex-col items-center text-center gap-[18px]"
          role="status"
          aria-live="polite"
        >
          {status === 'pending' && (
            <>
              <span className="h-[72px] w-[72px] rounded-full bg-ink-wash flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h1 className="font-display font-extrabold text-[22px] text-ink">Accepting your invitation…</h1>
                <p className="text-[13.5px] leading-relaxed text-slate-500">Hang tight — this only takes a moment.</p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-ink-wash overflow-hidden mt-1.5">
                <div className="h-full w-2/5 rounded-full bg-primary animate-indeterminate" />
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <span className="h-[72px] w-[72px] rounded-full bg-success-tint flex items-center justify-center">
                <Check className="h-8 w-8 text-success" strokeWidth={2.5} />
              </span>
              <span className="bg-success-tint text-success-ink text-[11.5px] font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                Admin
              </span>
              <div className="flex flex-col gap-1.5">
                <h1 className="font-display font-extrabold text-[22px] text-ink">You're now an admin</h1>
                <p className="text-[13.5px] leading-relaxed text-slate-500">{message}</p>
              </div>
              <div className="w-full flex flex-col gap-2 mt-1">
                <div className="w-full h-1.5 rounded-full bg-success-tint overflow-hidden">
                  <div className="h-full rounded-full bg-success animate-fill-bar-3s" />
                </div>
                <span className="text-xs text-slate-500">Taking you to Settings…</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full mt-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-hover transition-colors"
              >
                Go to Settings now
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="h-[72px] w-[72px] rounded-full bg-danger-tint flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h1 className="font-display font-extrabold text-[22px] text-ink">This invite link didn't work</h1>
                <p className="text-[13.5px] leading-relaxed text-slate-500">Ask the admin who invited you to send a new link.</p>
              </div>
              <div className="w-full bg-danger-tint border border-red-200 rounded-xl px-3.5 py-3 text-[12.5px] text-red-600 text-left">
                {message}
              </div>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full mt-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-hover transition-colors"
              >
                Go to Settings
              </button>
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="text-[12.5px] font-bold text-primary hover:underline"
              >
                Back to jobs
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptAdminInvitePage; 