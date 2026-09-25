import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the session from the URL
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (data.session) {
          console.log('✅ Authentication successful');
          const pendingInvite = sessionStorage.getItem('adminInviteReturnTo');
          sessionStorage.removeItem('adminInviteReturnTo');
          const inviteUrl = pendingInvite ? new URL(pendingInvite, window.location.origin) : null;
          const returnToInvite = inviteUrl?.origin === window.location.origin &&
            inviteUrl.pathname === '/accept-admin-invite' && inviteUrl.searchParams.has('token')
            ? `${inviteUrl.pathname}${inviteUrl.search}`
            : null;
          navigate(returnToInvite || '/jobs', { replace: true });
        } else {
          console.log('❌ No session found');
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner text="Completing sign in..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-900/20 border border-red-500 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Sign In Failed</h2>
            <p className="text-red-300">{error}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
