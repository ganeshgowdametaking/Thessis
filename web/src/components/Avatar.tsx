import React, { useMemo } from 'react';

interface AvatarProps {
    profile: any;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const getProfilePicture = (profile: any) => {
    if (profile?.avatar_url) {
        return profile.avatar_url;
    }

    return '/default-avatar.svg';
};

export const Avatar: React.FC<AvatarProps> = React.memo(({ profile, size = 'md', className = '' }) => {
    const avatarUrl = useMemo(() => getProfilePicture(profile), [profile?.id, profile?.avatar_url, profile?.full_name]);

    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    return (
        <div
            className={`bg-center bg-no-repeat bg-cover rounded-full object-cover shrink-0 ${sizeClasses[size]} ${className}`}
            style={{ backgroundImage: `url("${avatarUrl}")` }}
        />
    );
});
