import React from 'react';
import type { MessageGroup as MessageGroupType } from '../utils/messageGrouping';

interface MessageGroupProps {
  group: MessageGroupType;
  otherParticipant: any;
  ownProfile: any;
}

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const MessageGroup: React.FC<MessageGroupProps> = ({ group, otherParticipant }) => {
  const senderName = group.isOwn ? 'You' : (otherParticipant?.full_name || 'User');

  return (
    <>
      {group.showNewDividerBefore && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-primary/25" />
          <span className="text-xs font-semibold text-primary shrink-0">New Message</span>
          <div className="flex-1 h-px bg-primary/25" />
        </div>
      )}

      <div className="flex w-full">
        <div className={`flex flex-col gap-1 max-w-[82%] md:max-w-[70%] ${group.isOwn ? 'items-end ml-auto' : 'items-start'}`}>
          <div className={`flex items-baseline gap-2 ${group.isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm font-semibold text-slate-900">{senderName}</span>
            <span className="text-xs text-slate-500">{formatTime(group.messages[0].created_at)}</span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            {group.messages.map((message) => (
              <div
                key={message.id}
                className={`w-fit max-w-full rounded-2xl p-4 shadow-sm ${group.isOwn
                  ? 'bg-sage text-white ml-auto'
                  : 'bg-stone-off text-slate-900'
                  }`}
              >
                {message.attachment_url && (
                  <div className="mb-2">
                    {message.attachment_type?.startsWith('image/') ? (
                      <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={message.attachment_url}
                          alt={message.attachment_name || 'Attachment'}
                          className="max-w-full rounded-lg border border-black/5 hover:opacity-90 transition-opacity cursor-pointer"
                          style={{ maxHeight: '300px' }}
                        />
                      </a>
                    ) : (
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-lg border shadow-inner transition-colors ${group.isOwn
                          ? 'bg-white/10 hover:bg-white/20 border-white/20'
                          : 'bg-white hover:bg-slate-50 border-stone-border'
                          }`}
                      >
                        <div className={`p-2 rounded-lg ${group.isOwn ? 'bg-white/20' : 'bg-slate-100'}`}>
                          <span className="material-symbols-outlined text-[24px]">description</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-bold truncate ${group.isOwn ? 'text-white' : 'text-slate-900'}`}>
                            {message.attachment_name || 'Document.pdf'}
                          </span>
                          <span className={`text-[10px] uppercase tracking-wider font-bold opacity-70 ${group.isOwn ? 'text-white' : 'text-slate-500'}`}>
                            PDF DOCUMENT
                          </span>
                        </div>
                        <span className={`material-symbols-outlined text-[20px] ml-auto ${group.isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                          download
                        </span>
                      </a>
                    )}
                  </div>
                )}

                {message.content && (
                  <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
