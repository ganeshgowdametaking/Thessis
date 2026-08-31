import React from 'react';

interface MessageAvatarProps {
    profile: any;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
};

export const MessageAvatar: React.FC<MessageAvatarProps> = React.memo(({ profile, size = 'md', className = '' }) => {
    const avatarUrl = profile?.avatar_url || '/default-avatar.svg';

    return (
        <div
            className={`bg-center bg-no-repeat bg-cover rounded-full object-cover shrink-0 ${sizeClasses[size]} ${className}`}
            style={{ backgroundImage: `url("${avatarUrl}")` }}
        />
    );
});
