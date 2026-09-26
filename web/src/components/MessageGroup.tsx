import React, { useEffect, useState } from 'react';
import { messageService } from '../services/messageService';
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

const EMOJI_SPLIT_REGEX = /(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/gu;
const EMOJI_TEST_REGEX = /^\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*$/u;

const renderContentWithEmoji = (text: string): React.ReactNode =>
  text.split(EMOJI_SPLIT_REGEX).map((part, i) =>
    part && EMOJI_TEST_REGEX.test(part)
      ? <span key={i} className="text-[0.85em] align-[-0.05em]">{part}</span>
      : part
  );


const PrivateAttachment: React.FC<{ message: any; isOwn: boolean }> = ({ message, isOwn }) => {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => messageService.getAttachmentUrl(message.attachment_url)
      .then(value => { if (active) { setUrl(value); setFailed(false); } })
      .catch(() => { if (active) { setUrl(''); setFailed(true); } });
    void refresh();
    const timer = window.setInterval(refresh, 240_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [message.attachment_url]);
  if (!url) return <span className="text-sm text-slate-500">{failed ? 'Attachment unavailable' : 'Loading attachment…'}</span>;
  return (
                  message.attachment_type?.startsWith('image/') ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-fit max-w-full rounded-2xl overflow-hidden shadow-sm ${isOwn ? 'ml-auto' : ''}`}
                    >
                      <img
                        src={url}
                        alt={message.attachment_name || 'Attachment'}
                        className="block max-w-full hover:opacity-90 transition-opacity cursor-pointer"
                        style={{ maxHeight: '300px' }}
                      />
                    </a>
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-fit max-w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl shadow-sm transition-opacity hover:opacity-90 ${isOwn
                        ? 'bg-sage text-white ml-auto'
                        : 'bg-stone-off text-slate-900'
                        }`}
                    >
                      <div className={`p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-slate-100'}`}>
                        <span className="material-symbols-outlined text-[24px]">description</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-bold truncate ${isOwn ? 'text-white' : 'text-slate-900'}`}>
                          {message.attachment_name || 'Document.pdf'}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold opacity-70 ${isOwn ? 'text-white' : 'text-slate-500'}`}>
                          PDF DOCUMENT
                        </span>
                      </div>
                      <span className={`material-symbols-outlined text-[20px] ml-auto ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                        download
                      </span>
                    </a>
                  )
  );
};

export const MessageGroup: React.FC<MessageGroupProps> = ({ group, otherParticipant }) => {
  const senderName = otherParticipant?.full_name || 'User';

  return (
    <>
      {group.dateDividerLabel && (
        <div className="flex justify-center">
          <span className="text-xs font-medium text-slate-500">
            {group.dateDividerLabel}
          </span>
        </div>
      )}

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
            {!group.isOwn && (
              <span className="text-sm font-semibold text-slate-900">{senderName}</span>
            )}
            <span className="text-xs text-slate-500">{formatTime(group.messages[0].created_at)}</span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            {group.messages.map((message) => (
              <React.Fragment key={message.id}>
                {message.attachment_url && <PrivateAttachment message={message} isOwn={group.isOwn} />}

                {message.content && (
                  <div
                    className={`w-fit max-w-full rounded-2xl px-3.5 py-1.5 shadow-sm ${group.isOwn
                      ? 'bg-sage text-white ml-auto'
                      : 'bg-stone-off text-slate-900'
                      }`}
                  >
                    <p className="text-base leading-snug whitespace-pre-wrap break-words">
                      {renderContentWithEmoji(message.content)}
                    </p>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
