import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MessageSquare, Trash2, X, MoreVertical } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { messageService } from '../services/messageService';
import { profileService } from '../services/profileService';

import { useAuthContext } from '../contexts/AuthContext';
import { useMediaQuery } from 'react-responsive';
import LoadingSpinner from './LoadingSpinner';

import { MessageInput } from './MessageInput';
import { ConversationItem } from './ConversationItem';
import { Avatar } from './Avatar';


interface MessagesPageProps {
  selectedApplicant?: string | null; // Optional prop to pre-select a user to chat with
  onViewProfile?: (userId: string) => void;
}

const MessagesPage: React.FC<MessagesPageProps> = ({ selectedApplicant, onViewProfile }) => {
  const { user } = useAuthContext();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [pendingChatUserId, setPendingChatUserId] = useState<string | null>(null); // New state for pending chats
  const [isSettingUpPendingChat, setIsSettingUpPendingChat] = useState(false); // Flag to prevent auto-selection
  // newMessage state removed - moved to MessageInput
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  // showEmojiPicker state removed - moved to MessageInput
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConversationsList, setShowConversationsList] = useState(true);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // emojiSearch & activeCategory state removed
  const navigate = useNavigate();
  const location = useLocation();

  // Add a ref to track if we've already handled the navigation state
  const stateHandledRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);




  // Real-time & Typing State
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pending User Info (for header when chat is pending)
  const [pendingUserInfo, setPendingUserInfo] = useState<any>(null);

  useEffect(() => {
    // Global Subscription for New Messages
    let channel: any;

    // Add a tiny delay to allow component to settle
    const stabilityTimer = setTimeout(() => {
      channel = supabase.channel('global-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const newMessage = payload.new as any;
            console.log('🔔 Real-time message received:', newMessage);

            // 1. If currently viewing this conversation, append message
            if (selectedChat === newMessage.conversation_id) {
              // Fetch sender profile to enrich the message
              try {
                const fullMsg = await messageService.getConversationMessages(newMessage.conversation_id, 1);
                if (fullMsg && fullMsg.length > 0 && fullMsg[0].id === newMessage.id) {
                  setMessages(prev => [...prev, fullMsg[0]]);
                }
              } catch (err) {
                console.error('Error fetching new real-time message details', err);
              }
            }

            // 2. Update conversation list preview & unread counts
            loadConversations();

            // 3. Handle "First Message Received" for Pending Chat
            if (pendingChatUserId && newMessage.sender_id === pendingChatUserId) {
              console.log('✨ First message received from pending user! Switching to real chat.');
              const newConvId = newMessage.conversation_id;
              setSelectedChat(newConvId);
              setPendingChatUserId(null);
            }
          }
        ).subscribe();
    }, 100);

    return () => {
      clearTimeout(stabilityTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedChat, pendingChatUserId]);

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

    // Add a tiny delay to let the component stabilize before connecting
    // This prevents "WebSocket closed" errors during React Strict Mode's unmount/remount cycle
    const timer = setTimeout(() => {
      const channel = supabase.channel(`typing:${selectedChat}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          // Check if anyone else is typing
          const othersTyping = Object.values(state).flat().some((p: any) => p.user !== user?.id && p.isTyping);
          setOtherUserTyping(othersTyping);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track presence
            await channel.track({ user: user?.id, isTyping: false });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }, 100);

    return () => {
      clearTimeout(timer);
      supabase.removeAllChannels(); // Cleanup all if unmounting
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


  // Add a ref to track if we've already handled the current processing state
  const isProcessingState = useRef<number | null>(null);

  // Handle "Message" click from other pages
  useEffect(() => {
    // Determine the target applicant from props OR location state
    const targetApplicant = selectedApplicant || location.state?.selectedApplicant;

    // Use a ref to prevent this logic from re-running if we've already 
    // processed this specific navigation timestamp
    if (!targetApplicant || isProcessingState.current === location.state?.msgNavTs) return;

    if (location.state?.msgNavTs) {
      isProcessingState.current = location.state.msgNavTs;
    }

    const syncConversation = async () => {
      console.log('🔍 Opening chat for applicant ID:', targetApplicant);

      setIsSettingUpPendingChat(true);

      // 1. Check local state (fastest)
      const existingConv = (conversations || []).find(
        (conv: any) => conv.participant_1 === targetApplicant || conv.participant_2 === targetApplicant
      );

      if (existingConv) {
        console.log('🔍 Found existing conversation (local):', existingConv.id);
        setSelectedChat(existingConv.id);
        loadMessages(existingConv.id);
        setPendingChatUserId(null);
      } else {
        // 2. SEARCH DATABASE DIRECTLY (Don't wait for sidebar load)
        // This stops the 30-second "pending" wait if the generic list is slow
        try {
          const { data: dbConv } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant_1.eq.${user?.id},participant_2.eq.${targetApplicant}),and(participant_1.eq.${targetApplicant},participant_2.eq.${user?.id})`)
            .maybeSingle();

          if (dbConv) {
            console.log('🔍 Found existing conversation (DB):', dbConv.id);
            setSelectedChat(dbConv.id);
            loadMessages(dbConv.id);
            setPendingChatUserId(null);
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

      // Also mark stateHandledRef for double safety (historic ref)
      if (location.state?.msgNavTs) {
        stateHandledRef.current = location.state.msgNavTs;
      }

      // Clear the flag after a short delay
      setTimeout(() => {
        setIsSettingUpPendingChat(false);
      }, 500);
    };

    syncConversation();
  }, [selectedApplicant, location.state, conversations]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping]); // Scroll when typing indicator appears too

  // UPDATED: Search functionality with user suggestions
  useEffect(() => {
    if (searchQuery.trim()) {
      performUserSearch();
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery]);

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

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const performUserSearch = async () => {
    try {

      const results = await profileService.searchProfiles(searchQuery);
      setSearchSuggestions(results.slice(0, 5)); // Limit to 5 suggestions
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchSuggestions([]);
    } finally {

    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userConversations = await messageService.getConversations();

      // Ensure we have an array
      const allConversations = userConversations || [];

      // TODO: Re-implement conversation filtering with proper field mapping
      // For now, disable filtering to restore message functionality
      // const filteredConversations = await blockingService.filterBlockedUsers(allConversations);
      setConversations(allConversations);

      // If we have a selectedApplicant or pendingChatUserId, check if it now exists in the conversation list
      const targetUserId = selectedApplicant || pendingChatUserId;
      if (targetUserId) {
        const matchingConv = allConversations.find(
          (conv: any) => conv.participant_1 === targetUserId || conv.participant_2 === targetUserId
        );
        if (matchingConv) {
          console.log('🔍 Sync: Found matching conversation after load:', matchingConv.id);
          setSelectedChat(matchingConv.id);
          setPendingChatUserId(null);
          return; // STOP HERE - don't proceed to auto-selection logic
        }
      }

      // Only auto-select first conversation on desktop (not mobile) and only if no pending chat or selectedApplicant
      console.log('🔍 Auto-selection check:', {
        hasConversations: allConversations.length > 0,
        selectedChat,
        isMobile,
        pendingChatUserId,
        selectedApplicant,
        isSettingUpPendingChat,
        shouldAutoSelect: allConversations.length > 0 && !selectedChat && !isMobile && !pendingChatUserId && !selectedApplicant && !isSettingUpPendingChat
      });

      if (allConversations.length > 0 && !selectedChat && !isMobile && !pendingChatUserId && !selectedApplicant && !isSettingUpPendingChat) {
        console.log('🔍 Auto-selecting first conversation:', allConversations[0].id);
        setSelectedChat(allConversations[0].id);
        setShowConversationsList(false); // Auto-hide on desktop when conversation is loaded
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const loadMessages = async (conversationId: string) => {
    try {
      // Mark messages as read before loading
      await messageService.markMessagesAsRead(conversationId);
      if (window.refreshUnreadCounts) window.refreshUnreadCounts();

      // Fetch latest 50 messages
      const conversationMessages = await messageService.getConversationMessages(conversationId, 50);
      setMessages(conversationMessages || []);

      // If we got exactly 50, assume there might be more
      setHasMoreMessages((conversationMessages?.length || 0) >= 50);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
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

    // Create a variable for scroll position preservation
    const container = messagesContainerRef.current;

    try {
      const oldestMessage = messages[0];
      const olderMessages = await messageService.getConversationMessages(
        selectedChat,
        50,
        oldestMessage.created_at
      );

      if (olderMessages && olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
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

  const handleSendMessage = useCallback(async (e?: React.FormEvent, text?: string) => {
    if (e) e.preventDefault();
    const contentToSend = text || '';
    if (!contentToSend.trim()) return;

    try {
      let conversationId = selectedChat;

      // If we have a pending chat (no existing conversation), create it now
      if (pendingChatUserId && !selectedChat) {
        console.log('Creating conversation for pending chat with user:', pendingChatUserId);
        const conversation = await messageService.createOrGetConversation(pendingChatUserId);
        conversationId = conversation.id;
        setSelectedChat(conversationId);
        setPendingChatUserId(null); // Clear pending state
        // Reload conversations to include the new one
        await loadConversations();
      }

      if (conversationId) {
        // Optimistic UI: Add temporary message immediately
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
          id: tempId,
          content: contentToSend,
          sender_id: user?.id,
          created_at: new Date().toISOString(),
          conversation_id: conversationId,
          status: 'sending'
        };

        setMessages(prev => [...prev, optimisticMessage]);

        await messageService.sendMessage(conversationId, contentToSend);

        // Reload messages to confirm sync
        await loadMessages(conversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }, [selectedChat, pendingChatUserId, user?.id]);

  const handleProfileClick = (userId: string) => {
    if (onViewProfile) {
      onViewProfile(userId);
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const handleBackToConversations = () => {
    setShowConversationsList(true);
    setSelectedChat(null);
    setPendingChatUserId(null); // Clear pending chat
    setPendingUserInfo(null); // Clear pending user info
  };

  // Helper function to get profile picture with fallback

  const getOtherParticipant = (conversation: any) => {
    if (!user) return null;

    if (conversation.participant_1 === user.id) {
      return conversation.participant_2_profile;
    } else {
      return conversation.participant_1_profile;
    }
  };




  if (loading) {
    return (
      <div className="bg-stone text-slate-900 font-display w-full flex items-center justify-center overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
        <LoadingSpinner text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="bg-stone text-slate-900 font-display w-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
      <div className="flex flex-1 min-h-0 w-full relative">{/* Sidebar */}
        <div className={`${showConversationsList ? 'flex' : 'hidden'} md:flex w-80 md:w-96 flex-shrink-0 flex-col bg-stone-off border-r border-stone-border z-10`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-stone-border">
            <h2 className="text-2xl font-bold mb-4 px-2 text-slate-900">Messages</h2>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="text-[20px]" />
              </div>
              <input
                className="block w-full rounded-lg border-none bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-sage shadow-sm"
                placeholder="Search messages..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Search Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-stone-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-slate-500 mb-2 px-2">People</div>
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleStartConversation(suggestion.id)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-stone-off transition-colors text-left"
                    >
                      <Avatar profile={suggestion} size="sm" className="rounded-full" />
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
        <main className={`${!showConversationsList ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white min-h-0 relative max-h-full`}>
          {currentConversation || pendingUserInfo || pendingChatUserId ? (
            <>
              {/* Chat Header */}
              <header className="h-20 shrink-0 border-b border-stone-border flex items-center justify-between px-6 bg-white z-10">
                <div className="flex items-center gap-4">
                  {/* Back button for mobile */}
                  <button
                    onClick={handleBackToConversations}
                    className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-stone-off rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="relative">
                    {(() => {
                      const otherParticipant = currentConversation ? getOtherParticipant(currentConversation) : pendingUserInfo;
                      return (
                        <div
                          className="cursor-pointer"
                          onClick={() => otherParticipant && handleProfileClick(otherParticipant.id)}
                        >
                          <Avatar profile={otherParticipant} size="md" />
                        </div>
                      );
                    })()}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></span>
                  </div>
                  <div>
                    {(() => {
                      const otherParticipant = currentConversation ? getOtherParticipant(currentConversation) : pendingUserInfo;
                      return (
                        <>
                          <h3
                            className="text-lg font-bold text-slate-900 leading-tight cursor-pointer hover:text-sage transition-colors"
                            onClick={() => otherParticipant && handleProfileClick(otherParticipant.id)}
                          >
                            {otherParticipant?.full_name || 'User'}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {otherParticipant?.title || 'Professional'}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative" ref={actionsMenuRef}>
                    <button
                      className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-stone-off transition-colors"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      disabled={deleteLoading}
                    >
                      <MoreVertical className="text-[24px]" />
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
                className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 flex flex-col bg-white"
              >
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

                {/* Date Separator */}
                <div className="flex justify-center">
                  <span className="text-xs font-medium text-slate-500 bg-stone-off px-3 py-1 rounded-full">Today</span>
                </div>

                {messages.length > 0 ? (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const otherParticipant = getOtherParticipant(currentConversation);

                    return (
                      <div key={message.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        {!isOwnMessage && (
                          <Avatar profile={otherParticipant} size="sm" />
                        )}
                        <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-baseline gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                            {!isOwnMessage && (
                              <span className="text-sm font-semibold text-slate-900">{otherParticipant?.full_name}</span>
                            )}
                            <span className="text-xs text-slate-500">
                              {new Date(message.created_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                          <div className={`p-3 rounded-2xl text-sm leading-relaxed ${isOwnMessage
                            ? 'bg-sage rounded-tr-none shadow-sm text-white'
                            : 'bg-stone-off rounded-tl-none text-slate-900'
                            }`}>
                            <p>{message.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Start a conversation</h3>
                      <p className="text-slate-600">
                        Send a message to begin chatting with {currentConversation ? getOtherParticipant(currentConversation)?.full_name : pendingUserInfo?.full_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Typing Indicator */}
                {otherUserTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-off flex items-center justify-center">
                      <span className="typing-dot animate-bounce">.</span>
                      <span className="typing-dot animate-bounce delay-100">.</span>
                      <span className="typing-dot animate-bounce delay-200">.</span>
                    </div>
                    <div className="text-xs text-slate-400 self-center">Typing...</div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <MessageInput
                onSendMessage={(text) => handleSendMessage(undefined, text)}
                onTyping={handleTyping}
                disabled={!selectedChat && !pendingChatUserId}
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