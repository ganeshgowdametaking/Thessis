import React, { memo } from 'react';
import { Avatar } from './Avatar';

interface ConversationItemProps {
    conversation: any;
    isSelected: boolean;
    onClick: (id: string) => void;
    profile: any;

    isOnline?: boolean;
}

export const ConversationItem: React.FC<ConversationItemProps> = memo(({
    conversation,
    isSelected,
    onClick,
    profile,

}) => {
    // Simplified: Use denormalized message data if available, fallback to nested messages array.
    const lastMessage = conversation.last_message_preview
        ? {
            content: conversation.last_message_preview,
            created_at: conversation.last_message_at,
            sender_id: conversation.last_message_sender_id
        }
        : (conversation.messages && conversation.messages[0]);

    // Determine unread count based on our role in the conversation
    const unreadCount = conversation.participant_1 === profile?.id
        ? (conversation.unread_count_p2 || 0)
        : (conversation.unread_count_p1 || 0);

    return (
        <button
            onClick={() => onClick(conversation.id)}
            className={`w-full p-4 flex items-center gap-3 transition-all border-b border-stone-100 last:border-0 hover:bg-white/80 ${isSelected ? 'bg-white shadow-sm border-l-4 border-l-sage' : 'border-l-4 border-l-transparent text-slate-600'
                }`}
        >
            <div className="relative">
                <Avatar profile={profile} size="md" />
                {/* Online Status Indicator (Placeholder) */}
                {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div> */}
            </div>

            <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-semibold truncate pr-2 ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                        {profile?.full_name || 'Unknown User'}
                    </h3>
                    {lastMessage && (
                        <span className={`text-[10px] shrink-0 ${isSelected ? 'text-sage' : 'text-slate-400'}`}>
                            {formatRelativeTime(lastMessage.created_at)}
                        </span>
                    )}
                </div>
                <div className="flex justify-between items-center">
                    <p className={`text-xs truncate ${!lastMessage?.read_at && lastMessage?.sender_id !== profile?.id
                        ? 'font-semibold text-slate-800'
                        : 'text-slate-500'
                        }`}>
                        {lastMessage ? (
                            <>
                                {lastMessage.sender_id === profile?.id ? '' : 'You: '}
                                {lastMessage.content}
                            </>
                        ) : (
                            <span className="italic text-slate-400">No messages yet</span>
                        )}
                    </p>
                    {unreadCount > 0 && (
                        <span className="ml-2 bg-sage text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
});

// Helper for time formatting (duplicated here for isolation or can be imported if extracted)
// For simpler prop drilling, let's just use the passed prop or a local helper
const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;

    return `${Math.floor(diffInDays / 7)}w`;
};
