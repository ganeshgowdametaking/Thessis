import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
    fetch('https://fvprdknorvuggwxfqly.supabase.co/functions/v1/accept-admin-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    <div className="flex flex-col items-center justify-center min-h-screen">
      {status === 'pending' && <p>Processing your invitation...</p>}
      {status === 'success' && <p className="text-green-600">{message}</p>}
      {status === 'error' && <p className="text-red-600">{message}</p>}
    </div>
  );
};

export default AcceptAdminInvitePage; 