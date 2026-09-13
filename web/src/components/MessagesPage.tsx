import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MessageSquare, Trash2 } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { messageService } from '../services/messageService';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';

import { useAuthContext } from '../contexts/AuthContext';
import { useMediaQuery } from 'react-responsive';
import LoadingSpinner from './LoadingSpinner';

import { MessageInput } from './MessageInput';
import { ConversationItem } from './ConversationItem';
import { MessageAvatar } from './MessageAvatar';
import { MessageGroup } from './MessageGroup';
import { buildMessageGroups } from '../utils/messageGrouping';


interface MessagesPageProps {
  selectedApplicant?: string | null; // Optional prop to pre-select a user to chat with
  onViewProfile?: (userId: string) => void;
}

// Boundary for the "New Message" divider: the first incoming (not-own), unread
// message in an already-loaded list. Computed once per conversation load — not
// recomputed reactively — so it doesn't jump around as messages get marked read
// or new ones stream in while the chat is open.
const computeFirstUnreadId = (items: any[], currentUserId?: string): string | null => {
  const firstUnread = items.find((m) => m.sender_id !== currentUserId && m.read === false);
  return firstUnread?.id ?? null;
};

const MessagesPage: React.FC<MessagesPageProps> = ({ selectedApplicant, onViewProfile }) => {
  const { user, profile } = useAuthContext();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [pendingChatUserId, setPendingChatUserId] = useState<string | null>(null); // New state for pending chats
  const [isSettingUpPendingChat, setIsSettingUpPendingChat] = useState(false); // Flag to prevent auto-selection
  // newMessage state removed - moved to MessageInput
  // Track selection in a ref to avoid closure staleness issues in real-time callbacks
  const selectionRef = useRef<string | null>(null);
  const pendingChatRef = useRef<string | null>(null);

  // Sync state to refs
  useEffect(() => { selectionRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { pendingChatRef.current = pendingChatUserId; }, [pendingChatUserId]);

  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  // showEmojiPicker state removed - moved to MessageInput
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [connectedProfiles, setConnectedProfiles] = useState<any[]>([]);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConversationsList, setShowConversationsList] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // emojiSearch & activeCategory state removed
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isInitialMount = useRef(true);




  // Real-time & Typing State
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Mobile no longer renders the global header on this route, so the chat
  // view can use the full viewport height.
  const viewportHeight = isMobile ? '100dvh' : 'calc(100vh - 5rem)';

  // Pending User Info (for header when chat is pending)
  const [pendingUserInfo, setPendingUserInfo] = useState<any>(null);
  const latestMessageLoadRef = useRef(0);
  const messagesCacheRef = useRef<Record<string, { items: any[]; hasMore: boolean }>>({});
  const conversationReloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMoreMessagesRef = useRef(true);
  // Tracks which conversation we last auto-scrolled for, so opening/switching
  // a chat jumps straight to the bottom instead of animating there.
  const lastScrolledChatRef = useRef<string | null>(null);

  useEffect(() => {
    hasMoreMessagesRef.current = hasMoreMessages;
  }, [hasMoreMessages]);

  // Optimized Real-time Subscriptions
  useEffect(() => {
    if (!user?.id) return;

    let convChannelP1: any;
    let convChannelP2: any;
    let messageChannel: any;

    // 1. Subscribe to updates on conversations the user is part of (Sidebar sync)
    // We listen for both INSERT (new chats) and UPDATE (new messages in existing chats)
    const scheduleConversationReload = () => {
      if (conversationReloadTimerRef.current) {
        clearTimeout(conversationReloadTimerRef.current);
      }

      conversationReloadTimerRef.current = setTimeout(() => {
        void loadConversations();
      }, 120);
    };

    convChannelP1 = supabase.channel(`user-convs-p1:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `participant_1=eq.${user.id}` },
        () => {
          console.log('🔄 Conversation (P1) changed, reloading list...');
          scheduleConversationReload();
        }
      ).subscribe();

    convChannelP2 = supabase.channel(`user-convs-p2:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `participant_2=eq.${user.id}` },
        () => {
          console.log('🔄 Conversation (P2) changed, reloading list...');
          scheduleConversationReload();
        }
      ).subscribe();

    // 2. Focused subscription for the ACTIVE conversation messages
    if (selectedChat) {
      messageChannel = supabase.channel(`active-chat:${selectedChat}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedChat}` },
          async (payload) => {
            const newMessage = payload.new as any;
            if (newMessage.sender_id === user.id) return; // Already handled by optimistic UI or sender logic

            console.log('🔔 New message in current chat:', newMessage);

            // Enrich message with sender details if needed, or just append
            try {
              // We use a small delay or check to avoid duplicates if the fetch is slow
              setMessages(prev => {
                const exists = prev.some(m => m.id === newMessage.id);
                if (exists) return prev;
                const next = [...prev, newMessage];
                messagesCacheRef.current[selectedChat] = {
                  items: next,
                  hasMore: hasMoreMessagesRef.current,
                };
                return next;
              });

              // Mark as read since user is viewing this chat
              void messageService.markMessagesAsRead(selectedChat)
                .then(() => {
                  if (window.refreshUnreadCounts) window.refreshUnreadCounts();
                })
                .catch((err) => {
                  console.warn('Background mark-as-read failed:', err);
                });
            } catch (err) {
              console.error('Error handling real-time message', err);
            }
          }
        ).subscribe();
    }

    // 3. Handle pending chat first-message logic
    // we still need a way to know if a message arrived from pendingChatUserId
    // Since we now have convChannelP1/P2, if a new conversation is inserted, 
    // loadConversations() will find it and sync.

    return () => {
      if (conversationReloadTimerRef.current) {
        clearTimeout(conversationReloadTimerRef.current);
      }
      if (convChannelP1) supabase.removeChannel(convChannelP1);
      if (convChannelP2) supabase.removeChannel(convChannelP2);
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, [user?.id, selectedChat, pendingChatUserId]);

  // FIX: Fetch Pending User Info when pendingChatUserId changes
  useEffect(() => {
    const loadPendingUser = async () => {
      if (pendingChatUserId) {
        try {
          const profile = await profileService.getProfile(pendingChatUserId);
          setPendingUserInfo(profile);
        } catch (error) {
          console.error("Error loading pending user profile", error);
        }
      } else {
        setPendingUserInfo(null);
      }
    };
    loadPendingUser();
  }, [pendingChatUserId]);

  // Typing Indicators Subscription (Scoped to Selected Chat)
  useEffect(() => {
    if (!selectedChat) return;

    let typingChannel: any = null;

    // Add a tiny delay to let the component stabilize before connecting
    // This prevents "WebSocket closed" errors during React Strict Mode's unmount/remount cycle
    const timer = setTimeout(() => {
      typingChannel = supabase.channel(`typing:${selectedChat}`)
        .on('presence', { event: 'sync' }, () => {
          const state = typingChannel.presenceState();
          // Check if anyone else is typing
          const othersTyping = Object.values(state).flat().some((p: any) => p.user !== user?.id && p.isTyping);
          setOtherUserTyping(othersTyping);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track presence
            await typingChannel.track({ user: user?.id, isTyping: false });
          }
        });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (typingChannel) {
        supabase.removeChannel(typingChannel);
      }
    };
  }, [selectedChat, user?.id]);

  // Broadcast Typing Status
  const handleTyping = async () => {
    if (!selectedChat) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // If not already typing, set status
    if (!isTyping) {
      setIsTyping(true);
      const channel = supabase.getChannels().find(c => c.topic === `typing:${selectedChat}`);
      if (channel) await channel.track({ user: user?.id, isTyping: true });
    }

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      const channel = supabase.getChannels().find(c => c.topic === `typing:${selectedChat}`);
      if (channel) await channel.track({ user: user?.id, isTyping: false });
    }, 2000);
  };

  // Initial load of conversations
  useEffect(() => {
    if (isInitialMount.current) {
      loadConversations();
      isInitialMount.current = false;
    }
  }, []);


  // Track last processed target + navigation timestamp to avoid duplicate work.
  const processedMessageNav = useRef<string | null>(null);

  // Handle "Message" click from other pages
  useEffect(() => {
    // Determine the target applicant from props, location state, or a
    // ?userId= query param — the latter is what email links use (e.g. the
    // "you got referred" email), since a plain URL can't carry router state.
    const targetApplicant = selectedApplicant || location.state?.selectedApplicant || searchParams.get('userId');
    const navTs = location.state?.msgNavTs;

    // Wait until auth is available so DB query uses a real user id.
    if (!targetApplicant || !user?.id) return;

    const navKey = `${targetApplicant}:${navTs ?? 'no-ts'}`;
    if (processedMessageNav.current === navKey) return;
    processedMessageNav.current = navKey;

    const syncConversation = async () => {
      console.log('🔍 Opening chat for applicant ID:', targetApplicant);

      setIsSettingUpPendingChat(true);
      // Keep target user context so chat panel can render even if conversation list
      // is empty/hidden by filters during initial load.
      setPendingChatUserId(targetApplicant);

      // 1. Check local state (fastest)
      const existingConv = (conversations || []).find(
        (conv: any) => conv.participant_1 === targetApplicant || conv.participant_2 === targetApplicant
      );

      if (existingConv) {
        console.log('🔍 Found existing conversation (local):', existingConv.id);
        setSelectedChat(existingConv.id);
      } else {
        // 2. SEARCH DATABASE DIRECTLY (Don't wait for sidebar load)
        // This stops the 30-second "pending" wait if the generic list is slow
        try {
          const { data: dbConv } = await supabase
            .from('conversations')
            .select('id, participant_1, participant_2, deleted_by_p1, deleted_by_p2')
            .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetApplicant}),and(participant_1.eq.${targetApplicant},participant_2.eq.${user.id})`)
            .maybeSingle();

          if (dbConv) {
            const isCurrentUserP1 = (dbConv as any).participant_1 === user.id;
            const hiddenForCurrentUser = isCurrentUserP1 ? (dbConv as any).deleted_by_p1 === true : (dbConv as any).deleted_by_p2 === true;

            if (hiddenForCurrentUser) {
              console.log('🔍 Conversation exists but is hidden for current user, starting pending chat:', dbConv.id);
              setPendingChatUserId(targetApplicant);
              setSelectedChat(null);
              setMessages([]);
            } else {
              console.log('🔍 Found existing conversation (DB):', dbConv.id);
              setSelectedChat(dbConv.id);
            }
          } else {
            console.log('🔍 No existing conversation found in DB, setting pendingChatUserId to:', targetApplicant);
            setPendingChatUserId(targetApplicant);
            setSelectedChat(null);
            setMessages([]);
          }
        } catch (e) {
          // Fallback safe
          setPendingChatUserId(targetApplicant);
        }
      }

      setShowConversationsList(false); // Hide conversations list on mobile when chat is selected

      // Clear the flag after a short delay
      setTimeout(() => {
        setIsSettingUpPendingChat(false);
      }, 500);
    };

    syncConversation();
  }, [selectedApplicant, location.state?.selectedApplicant, location.state?.msgNavTs, searchParams, user?.id]);

  // Auto-scroll to bottom: instantly when a conversation is first opened or
  // switched to, smoothly for new messages/typing while already viewing it.
  useEffect(() => {
    const isConversationSwitch = lastScrolledChatRef.current !== selectedChat;
    scrollToBottom(isConversationSwitch ? 'auto' : 'smooth');
    lastScrolledChatRef.current = selectedChat;
  }, [messages, otherUserTyping, selectedChat]);

  // UPDATED: Search functionality with user suggestions
  useEffect(() => {
    if (searchQuery.trim()) {
      performUserSearch();
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery, connectedProfiles]);

  // Load accepted connections once and use them as the only suggestion source.
  useEffect(() => {
    const loadConnectedProfiles = async () => {
      if (!user?.id) {
        setConnectedProfiles([]);
        return;
      }

      try {
        const connections = await connectionService.getConnectionsForUser(user.id);
        const mappedProfiles = (connections || [])
          .map((conn: any) => {
            const isRequester = conn.requester_id === user.id;
            return isRequester ? conn.addressee : conn.requester;
          })
          .filter((profile: any) => profile?.id && profile.id !== user.id);

        const uniqueProfiles = Array.from(
          new Map(mappedProfiles.map((profile: any) => [profile.id, profile])).values()
        );
        setConnectedProfiles(uniqueProfiles);
      } catch (error) {
        console.error('Error loading connected profiles for message suggestions:', error);
        setConnectedProfiles([]);
      }
    };

    void loadConnectedProfiles();
  }, [user?.id]);

  // Click outside handler to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  const performUserSearch = async () => {
    try {
      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        setSearchSuggestions([]);
        return;
      }

      const results = connectedProfiles.filter((profile: any) =>
        profile.full_name?.toLowerCase().includes(query) ||
        profile.title?.toLowerCase().includes(query) ||
        profile.company?.toLowerCase().includes(query)
      );

      setSearchSuggestions(results.slice(0, 5)); // Limit to 5 suggestions
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchSuggestions([]);
    }
  };

  const loadConversations = async () => {
    try {
      // Only show full loading spinner on initial load, not on refreshes/background updates
      if (conversations.length === 0) {
        setLoading(true);
      }

      const userConversations = await messageService.getConversations();

      // Ensure we have an array
      const allConversations = userConversations || [];

      // TODO: Re-implement conversation filtering with proper field mapping
      // For now, disable filtering to restore message functionality
      // const filteredConversations = await blockingService.filterBlockedUsers(allConversations);
      setConversations(allConversations);

      // SYNC: If we are looking for a specific user (pending or active), ensure they are selected.
      // We check BOTH the state and the ref to survive closure staleness.
      const targetUserId = selectedApplicant || pendingChatUserId || pendingChatRef.current;
      if (targetUserId) {
        const matchingConv = allConversations.find(
          (conv: any) => conv.participant_1 === targetUserId || conv.participant_2 === targetUserId
        );
        if (matchingConv) {
          console.log('🔍 Sync: Found matching conversation after load:', matchingConv.id);
          setSelectedChat(matchingConv.id);
          setPendingChatUserId(null);
          return;
        }
      }

      // AUTO-SELECTION: Only if nothing is selected (state AND ref) and we aren't mid-setup.
      const currentSelection = selectedChat || selectionRef.current;
      const isTransitioning = isSettingUpPendingChat || !!targetUserId;

      if (allConversations.length > 0 && !currentSelection && !isMobile && !isTransitioning) {
        console.log('🔍 Auto-selecting first conversation:', allConversations[0].id);
        setSelectedChat(allConversations[0].id);
        setShowConversationsList(false);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const requestId = ++latestMessageLoadRef.current;

    const cached = messagesCacheRef.current[conversationId];
    if (cached?.items?.length) {
      setMessages(cached.items);
      setHasMoreMessages(cached.hasMore);
      setFirstUnreadMessageId(computeFirstUnreadId(cached.items, user?.id));
    }

    try {
      // Fetch latest messages first so chat opens immediately.
      const conversationMessages = await messageService.getConversationMessages(conversationId, 50);

      if (requestId !== latestMessageLoadRef.current || selectionRef.current !== conversationId) {
        return;
      }

      setMessages(conversationMessages || []);
      const nextHasMore = (conversationMessages?.length || 0) >= 50;
      setHasMoreMessages(nextHasMore);
      setFirstUnreadMessageId(computeFirstUnreadId(conversationMessages || [], user?.id));
      messagesCacheRef.current[conversationId] = {
        items: conversationMessages || [],
        hasMore: nextHasMore,
      };

      // Mark as read in the background; do not block render.
      void messageService.markMessagesAsRead(conversationId)
        .then(() => {
          if (window.refreshUnreadCounts) window.refreshUnreadCounts();

          // Patch local state + cache so a revisit later in this session doesn't
          // re-serve stale read:false messages and reopen the divider.
          const markRead = (items: any[]) =>
            items.map((m) => (m.sender_id !== user?.id && !m.read ? { ...m, read: true } : m));

          setMessages((prev) => markRead(prev));
          const cacheEntry = messagesCacheRef.current[conversationId];
          if (cacheEntry) {
            messagesCacheRef.current[conversationId] = {
              ...cacheEntry,
              items: markRead(cacheEntry.items),
            };
          }
        })
        .catch((err) => {
          console.warn('Background mark-as-read failed:', err);
        });
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!cached) {
        setMessages([]);
      }
    }
  };

  // Trigger loadMessages when selectedChat changes
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
    }
  }, [selectedChat]);

  const handleLoadMore = async () => {
    if (!selectedChat || messages.length === 0) return;

    // Preserve scroll position
    const container = messagesContainerRef.current;
    const scrollHeight = container?.scrollHeight || 0;

    try {
      const oldestMessage = messages[0];
      const olderMessages = await messageService.getConversationMessages(
        selectedChat,
        50,
        oldestMessage.created_at
      );

      if (olderMessages && olderMessages.length > 0) {
        setMessages(prev => {
          const next = [...olderMessages, ...prev];
          messagesCacheRef.current[selectedChat] = {
            items: next,
            hasMore: olderMessages.length >= 50,
          };
          return next;
        });
        setHasMoreMessages(olderMessages.length >= 50);

        // Restore scroll position logic would go here ideally
        // React layout effect is better for this, but for now standard update 
        // relying on the user scrolling up naturally
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    }
  };

  // COMPLETELY FIXED: Delete conversation with proper error handling and user feedback
  const handleDeleteConversation = async () => {
    if (!selectedChat || deleteLoading) return;

    try {
      setDeleteLoading(true);
      console.log('🗑️ Delete clicked (no confirm), starting process...');

      // Call the messageService delete function
      const result = await messageService.deleteConversation(selectedChat);

      console.log('✅ Delete result:', result);

      if (result && result.success) {
        console.log('✅ Conversation deleted successfully, updating UI...');

        // Update local state on success
        const updatedConversations = conversations.filter(conv => conv.id !== selectedChat);
        setConversations(updatedConversations);
        setSelectedChat(null);
        setMessages([]);
        setShowActionsMenu(false);
        setShowConversationsList(true); // Show conversations list after deletion

        // Select next conversation if available (only on desktop)
        if (updatedConversations.length > 0 && !isMobile) {
          setSelectedChat(updatedConversations[0].id);
          setShowConversationsList(false);
        }

        console.log('✅ UI updated successfully');
      } else {
        console.error('❌ Delete operation returned failure:', result);
        alert('Failed to delete conversation. The operation was not successful.');
      }
    } catch (error: any) {
      console.error('❌ Error deleting conversation:', error);

      // Show specific error message to user
      const errorMessage = error.message || 'Failed to delete conversation. Please try again.';
      alert(errorMessage);

      // Reload conversations to ensure UI is in sync with database
      console.log('🔄 Reloading conversations to sync with database...');
      try {
        await loadConversations();
      } catch (reloadError) {
        console.error('❌ Error reloading conversations:', reloadError);
      }
    } finally {
      setDeleteLoading(false);
    }
  };



  // UPDATED: Start conversation with suggested user (Pending State)
  const handleStartConversation = async (userId: string) => {
    try {
      // Check if we already have a conversation with this user
      const existingConv = conversations.find(
        (conv: any) => conv.participant_1 === userId || conv.participant_2 === userId
      );

      if (existingConv) {
        // If exists, just open it
        setSelectedChat(existingConv.id);
        setPendingChatUserId(null);
      } else {
        // If NOT exists, set "Pending" state (do not create in DB yet)
        console.log('Starting pending conversation with:', userId);
        setPendingChatUserId(userId);
        setSelectedChat(null);
        setMessages([]); // Clear messages for new view
      }

      setSearchQuery('');
      setSearchSuggestions([]);
      setShowConversationsList(false); // Hide sidebar
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const currentConversation = conversations.find(conv => conv.id === selectedChat);

  const handleSendMessage = useCallback(async (text?: string, file?: File) => {
    const contentToSend = text || '';
    if (!contentToSend.trim() && !file) return false;

    try {
      let conversationId = selectedChat;

      // If we have a pending chat (no existing conversation), create it now
      if (pendingChatUserId && !selectedChat) {
        console.log('Creating conversation for pending chat with user:', pendingChatUserId);
        const conversation = await messageService.createOrGetConversation(pendingChatUserId);
        conversationId = conversation.id;
        setSelectedChat(conversationId);
        // Keep pending state until the conversation is visible in list;
        // prevents chat panel from disappearing when sending first message.
        // Reload conversations to include the new one
        await loadConversations();
      }

      if (conversationId) {
        // Optimistic UI: Add temporary message immediately
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: any = {
          id: tempId,
          content: contentToSend,
          sender_id: user?.id,
          created_at: new Date().toISOString(),
          conversation_id: conversationId,
          status: 'sending'
        };

        if (file) {
          optimisticMessage.attachment_name = file.name;
          optimisticMessage.attachment_type = file.type;
          if (file.type.startsWith('image/')) {
            optimisticMessage.attachment_url = URL.createObjectURL(file);
          }
        }

        setMessages(prev => [...prev, optimisticMessage]);

        let attachment = undefined;
        if (file) {
          attachment = await messageService.uploadAttachment(file);
        }

        const sentMessage = await messageService.sendMessage(conversationId, contentToSend, attachment);

        // Update optimistic message with real message from server
        if (sentMessage) {
          setMessages(prev => prev.map(m => m.id === tempId ? sentMessage : m));
        }

        // Silent Reload: Ensure the sidebar reflects the new 'last_message_at' immediately.
        // The 'silent' version of loadConversations prevents the UI blink.
        await loadConversations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      return false;
    }
  }, [selectedChat, pendingChatUserId, user?.id]);

  const handleProfileClick = (userId: string) => {
    if (onViewProfile) {
      onViewProfile(userId);
    } else {
      navigate(`/user/${userId}`);
    }
  };

  // Mobile has no in-app back button in the conversation header anymore —
  // the device's own back gesture is meant to close it. Opening a
  // conversation is just local state (no route/URL change), so without
  // this the OS back button would leave the Messages page entirely instead
  // of returning to the conversation list. This pushes a history entry
  // when a conversation opens on mobile, and pops back to the list on the
  // native back gesture — same pattern used for the mobile job details view.
  useEffect(() => {
    if (!(isMobile && !showConversationsList)) return;
    window.history.pushState({ conversationOpen: true }, '');
    const handlePopState = () => {
      setShowConversationsList(true);
      setSelectedChat(null);
      setPendingChatUserId(null);
      setPendingUserInfo(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, showConversationsList]);

  // Helper function to get profile picture with fallback

  const getOtherParticipant = (conversation: any) => {
    if (!user || !conversation) return null;

    if (conversation.participant_1 === user.id) {
      return conversation.participant_2_profile;
    } else {
      return conversation.participant_1_profile;
    }
  };

  const activeOtherParticipant = currentConversation
    ? getOtherParticipant(currentConversation)
    : pendingUserInfo;
  const shouldShowSuggestions = searchQuery.trim().length > 0;

  const messageGroups = React.useMemo(
    () => buildMessageGroups(messages, user?.id || '', firstUnreadMessageId),
    [messages, user?.id, firstUnreadMessageId]
  );




  if (loading) {
    return (
      <div className="bg-stone-bg text-slate-900 font-display w-full flex items-center justify-center overflow-hidden" style={{ height: viewportHeight }}>
        <LoadingSpinner text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="bg-stone-bg text-slate-900 font-display w-full flex flex-col overflow-hidden" style={{ height: viewportHeight }}>
      <div className="flex flex-1 min-h-0 w-full relative">{/* Sidebar */}
        <div className={`${showConversationsList ? 'flex' : 'hidden'} md:flex w-full md:w-96 flex-shrink-0 flex-col bg-stone-off border-r border-stone-border z-10`}>
          {/* Sidebar Header */}
          <div className="relative p-4 border-b border-stone-border">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="text-[20px]" />
              </div>
              <input
                className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:border-sage focus:outline-none shadow-sm"
                placeholder="Search messages..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Search Suggestions Dropdown */}
            {shouldShowSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-stone-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-slate-500 mb-2 px-2">Connected people</div>
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleStartConversation(suggestion.id)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-stone-off transition-colors text-left"
                    >
                      <MessageAvatar profile={suggestion} size="sm" className="rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 text-sm truncate">{suggestion.full_name}</div>
                        <div className="text-xs text-slate-500 truncate">{suggestion.title || 'Professional'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div className="flex-1 min-h-0 overflow-y-auto">{conversations.length > 0 ? (
            conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              if (!otherParticipant) return null;

              return (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedChat === conversation.id}
                  onClick={(id) => {
                    setSelectedChat(id);
                    setPendingChatUserId(null);
                    setPendingUserInfo(null);
                    setShowConversationsList(false);
                  }}
                  profile={otherParticipant}
                  isTyping={selectedChat === conversation.id && otherUserTyping}
                />
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No conversations yet</h3>
                <p className="text-slate-600 text-sm">
                  Start networking and connecting with professionals to begin conversations.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Main Chat Area */}
        <main className={`${!showConversationsList ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white min-h-0 min-w-0 relative max-h-full`}>
          {currentConversation || pendingUserInfo || pendingChatUserId ? (
            <>
              {/* Chat Header */}
              <header className="h-16 md:h-20 shrink-0 border-b border-stone-border flex items-center justify-between px-4 md:px-6 bg-white z-10">
                <div className="flex items-center gap-4">

                  <div className="relative">
                    <div
                      className="cursor-pointer"
                      onClick={() => activeOtherParticipant && handleProfileClick(activeOtherParticipant.id)}
                    >
                      <MessageAvatar profile={activeOtherParticipant} size="md" />
                    </div>
                  </div>
                  <div>
                    <>
                      <h3
                        className="text-lg font-bold text-slate-900 leading-tight cursor-pointer hover:text-sage transition-colors"
                        onClick={() => activeOtherParticipant && handleProfileClick(activeOtherParticipant.id)}
                      >
                        {activeOtherParticipant?.full_name || 'User'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {activeOtherParticipant?.title || 'Professional'}
                      </p>
                    </>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative" ref={actionsMenuRef}>
                    <button
                      className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-stone-off transition-colors"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      disabled={deleteLoading}
                    >
                      <span className="material-symbols-outlined text-[24px]">more_vert</span>
                    </button>

                    {/* Actions Menu */}
                    {showActionsMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-stone-border rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="py-2">
                          <button
                            onClick={handleDeleteConversation}
                            disabled={deleteLoading}
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>{deleteLoading ? 'Deleting...' : 'Delete Conversation'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* Messages Area */}
              <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 bg-white"
                style={isMobile ? { paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' } : undefined}
              >
                <div className="min-h-full flex flex-col justify-end space-y-5 md:space-y-8">
                  {/* Load More Button */}
                  {hasMoreMessages && messages.length > 0 && (
                    <div className="flex justify-center mb-4">
                      <button
                        onClick={handleLoadMore}
                        className="text-xs text-slate-500 hover:text-sage transition-colors bg-stone-off px-3 py-1.5 rounded-full"
                      >
                        Load older messages
                      </button>
                    </div>
                  )}

                  {messages.length > 0 ? (
                    messageGroups.map((group) => (
                      <MessageGroup
                        key={group.id}
                        group={group}
                        otherParticipant={activeOtherParticipant}
                        ownProfile={profile}
                      />
                    ))
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Start a conversation</h3>
                        <p className="text-slate-600">
                          Send a message to begin chatting with {activeOtherParticipant?.full_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="flex w-full gap-3">
                      <MessageAvatar profile={activeOtherParticipant} size="sm" />
                      <div className="rounded-2xl bg-stone-off px-4 py-3.5 flex items-center gap-1.5 w-fit">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <MessageInput
                onSendMessage={(text, file) => handleSendMessage(text, file)}
                onTyping={handleTyping}
                disabled={!selectedChat && !pendingChatUserId}
                mobileFixed={isMobile}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="w-16 h-16 bg-stone-off rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Select a conversation</h3>
                <p className="text-slate-600">Choose a conversation to start messaging</p>
                <button
                  onClick={() => setShowConversationsList(true)}
                  className="mt-4 md:hidden bg-sage text-white px-6 py-2 rounded-lg hover:bg-sage-dark transition-colors"
                >
                  View Conversations
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div >
  );
};

export default MessagesPage;
