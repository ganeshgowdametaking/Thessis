import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';

interface LinkedInSignInButtonProps {
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children?: React.ReactNode;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

const LinkedInSignInButton: React.FC<LinkedInSignInButtonProps> = ({
    className = '',
    variant = 'default',
    size = 'md',
    children,
    onSuccess,
    onError
}) => {
    const { signInWithLinkedIn, loading } = useAuthContext();

    const handleLinkedInSignIn = async () => {
        try {
            const { error } = await signInWithLinkedIn();
            if (error) {
                console.error('LinkedIn sign in error:', error);
                onError?.(error);
            } else {
                onSuccess?.();
            }
        } catch (error) {
            console.error('LinkedIn sign in failed:', error);
            onError?.('LinkedIn sign in failed. Please try again.');
        }
    };

    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        default: 'bg-[#0077b5] text-white hover:bg-[#006097] focus:ring-[#0077b5] shadow-sm',
        outline: 'bg-transparent text-[#0077b5] border border-[#0077b5] hover:bg-[#0077b5]/5 focus:ring-[#0077b5] shadow-sm',
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
            onClick={handleLinkedInSignIn}
            disabled={loading}
            className={buttonClasses}
        >
            {/* LinkedIn Icon (Simple SVG) */}
            <svg className="w-5 h-5 mr-3 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>

            {/* Button Text */}
            {children || (loading ? 'Signing in...' : 'Continue with LinkedIn')}
        </button>
    );
};

export default LinkedInSignInButton;
