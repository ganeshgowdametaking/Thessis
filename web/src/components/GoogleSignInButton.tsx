import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';

interface GoogleSignInButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'md',
  children,
  onSuccess,
  onError
}) => {
  const { signInWithGoogle, loading } = useAuthContext();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google sign in error:', error);
        onError?.(error);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Google sign in failed:', error);
      onError?.('Google sign in failed. Please try again.');
    }
  };

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    default: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-blue-500 shadow-sm',
    outline: 'bg-transparent text-black border border-slate-300 hover:bg-slate-50 focus:ring-blue-500 shadow-sm',
    ghost: 'bg-transparent text-white hover:bg-white/10 focus:ring-white'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className={buttonClasses}
    >
      {/* Google Icon */}
      <img
        src="/google_logo.png"
        alt="Google"
        className="w-5 h-5 mr-3 object-contain"
      />

      {/* Button Text */}
      {children || (loading ? 'Signing in...' : 'Continue with Google')}
    </button>
  );
};

export default GoogleSignInButton; 