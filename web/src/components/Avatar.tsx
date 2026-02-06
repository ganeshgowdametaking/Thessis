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

    // Create a simple colored background based on user ID
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const colorIndex = profile?.id ? profile.id.charCodeAt(0) % colors.length : 0;
    const backgroundColor = colors[colorIndex];

    // Get initials
    const initials = profile?.full_name
        ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    // Return a simple SVG data URL
    const svg = `
    <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="150" height="150" fill="${backgroundColor}"/>
      <text x="75" y="85" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
    </svg>
  `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
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
