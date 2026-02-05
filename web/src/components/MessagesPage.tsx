import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Smile, MessageSquare, Trash2, X, Image, MoreVertical, PlusCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { messageService } from '../services/messageService';
import { profileService } from '../services/profileService';
import { blockingService } from '../services/blockingService';
import { useAuthContext } from '../contexts/AuthContext';
import { useMediaQuery } from 'react-responsive';
import LoadingSpinner from './LoadingSpinner';

interface MessagesPageProps {
  selectedApplicant?: string | null;
  onViewProfile?: (userId: string) => void;
}

// Add emoji categories and a larger emoji set
const emojiCategories = [
  { key: 'smileys', label: '😊', name: 'Smileys' },
  { key: 'animals', label: '🐻', name: 'Animals' },
  { key: 'food', label: '🍔', name: 'Food' },
  { key: 'activities', label: '⚽', name: 'Activities' },
  { key: 'travel', label: '🚗', name: 'Travel' },
  { key: 'objects', label: '💡', name: 'Objects' },
  { key: 'symbols', label: '💯', name: 'Symbols' },
  { key: 'flags', label: '🏳️', name: 'Flags' },
];

const emojiData: { [key: string]: string[] } = {
  smileys: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😜','😝','😛','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
  animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦥','🦦','🦨','🦡','🐁','🐀','🐇','🐿️','🦔'],
  food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','��','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🥄','🍴','🍽️','🥣','🥡','🥢'],
  activities: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🥅','🏒','🏑','🏏','🥍','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️‍♂️','🏋️‍♀️','🤼‍♂️','🤼‍♀️','🤸‍♂️','🤸‍♀️','⛹️‍♂️','⛹️‍♀️','🤺','🤾‍♂️','🤾‍♀️','🏌️‍♂️','🏌️‍♀️','🏇','🧘‍♂️','🧘‍♀️','🏄‍♂️','🏄‍♀️','🏊‍♂️','🏊‍♀️','🤽‍♂️','🤽‍♀️','🚣‍♂️','🚣‍♀️','🧗‍♂️','🧗‍♀️','🚵‍♂️','🚵‍♀️','🚴‍♂️','🚴‍♀️','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹‍♂️','🤹‍♀️','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰'],
  travel: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🛑','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🛕','🕍','🕋','⛩️','🛤️','🛣️','🗾','🎑','🏞️','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃','🌉','🌌','🌁','🌫️','🌬️','🌀','🌈','🌂','☂️','☔','⛱️','⚡','❄️','☃️','⛄','☄️','🔥','💧','🌊','🎃','🎄','🎆','🎇','🧨','✨','🎈','🎉','🎊','🎋','🎍','🎎','🎏','🎐','🎑','🧧','🎀','🎁','🎗️','🎟️','🎫','🔮','🧿','🧸','🪅','🪆','🧩','🧸','🪅','🪆','🧩'],
  objects: ['💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','🧾','💎','⚖️','🔧','🔨','⚒️','🛠️','⛏️','🔩','⚙️','🗜️','⚗️','🧪','🧫','🧬','🔬','🔭','📡','💻','🖥️','🖨️','⌨️','🖱️','🖲️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','��','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','🧾','💎','⚖️','🔧','🔨','⚒️','🛠️','⛏️','🔩','⚙️','🗜️','⚗️','🧪','🧫','🧬','🔬','🔭','📡'],
  symbols: ['💯','🔢','🔣','🔤','🔠','🔡','🔇','🔈','🔉','🔊','🔔','🔕','🎼','🎵','🎶','💤','💢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛','🕜','🕝','🕞','🕟','🕠','🕡','🕢','🕣','🕤','🕥','🕦','🕧','🚸','🔱','🔰','🔯','✅','✔️','✖️','❌','❎','➕','➖','➗','➰','➿','〽️','✳️','✴️','❇️','‼️','⁉️','❓','❔','❕','❗','〰️','©️','®️','™️','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓','🆔','🆕','🆖','🆗','🆘','🆙','🆚','🈁','🈂️','🈷️','🈶','🈯','🉐','🉑','🈹','🈚','🈲','🅰️','🅱️','🆎','🆑','🆒','🆓','🆕','🆖','🆗','🆘','🆙','🆚','🈁','🈂️','🈷️','🈶','🈯','🉐','🉑','🈹','🈚','🈲'],
  flags: ['🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇦🇫','🇦🇽','🇦🇱','🇩🇿','🇦🇸','🇦🇩','🇦🇴','🇦🇮','🇦🇶','🇦🇬','🇦🇷','🇦🇲','🇦🇼','🇦🇺','🇦🇹','🇦🇿','🇧🇸','🇧🇭','🇧🇩','🇧🇧','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇲','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇮🇴','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇳','🇨🇽','🇨🇨','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇷','🇭🇷','🇨🇺','🇨🇼','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇲','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇸🇿','🇪🇹','🇪🇺','🇫🇰','🇫🇴','🇫🇯','🇫🇮','🇫🇷','🇬🇫','🇵🇫','🇹🇫','🇬🇦','🇬🇲','🇬🇪','🇩🇪','🇬🇭','🇬🇮','🇬🇷','🇬🇱','🇬🇩','🇬🇵','🇬🇺','🇬🇹','🇬🇬','🇬🇳','🇬🇼','🇬🇾','🇭🇹','🇭🇳','🇭🇰','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇨🇮','🇯🇲','🇯🇵','🎌','🇯🇪','🇯🇴','🇰🇿','🇰🇪','🇰🇮','🇽🇰','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾','🇱🇮','🇱🇹','🇱🇺','🇲🇴','🇲🇰','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇭','🇲🇶','🇲🇷','🇲🇺','🇾🇹','🇲🇽','🇫🇲','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇸','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇷','🇳🇵','🇳🇱','🇳🇨','🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇳🇺','🇳🇫','🇰🇵','🇲🇵','🇳🇴','🇴🇲','🇵🇰','🇵🇼','🇵🇸','🇵🇦','🇵🇬','🇵🇾','🇵🇪','🇵🇭','🇵🇳','🇵🇱','🇵🇹','🇵🇷','🇶🇦','🇷🇴','🇷🇺','🇷🇼','🇷🇪','🇼🇸','🇸🇲','🇸🇹','🇸🇦','🇸🇳','🇷🇸','🇸🇨','🇸🇱','🇸🇬','🇸🇽','🇸🇰','🇸🇮','🇸🇧','🇸🇴','🇿🇦','🇬🇸','🇰🇷','🇸🇸','🇪🇸','🇱🇰','🇸🇩','🇸🇷','🇸🇯','🇸🇪','🇨🇭','🇸🇾','🇹🇼','🇹🇯','🇹🇿','🇹🇭','🇹🇱','🇹🇬','🇹🇰','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇹🇨','🇹🇻','🇺🇬','🇺🇦','🇦🇪','🇬🇧','🇺🇸','🇺🇾','🇺🇿','🇻🇺','🇻🇦','🇻🇪','🇻🇳','🇻🇬','🇻🇮','🇼🇫','🇪🇭','🇾🇪','🇿🇲','🇿🇼'],
};

const MessagesPage: React.FC<MessagesPageProps> = ({ selectedApplicant, onViewProfile }) => {
  const { user } = useAuthContext();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [pendingChatUserId, setPendingChatUserId] = useState<string | null>(null); // New state for pending chats
  const [isSettingUpPendingChat, setIsSettingUpPendingChat] = useState(false); // Flag to prevent auto-selection
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConversationsList, setShowConversationsList] = useState(true);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const navigate = useNavigate();
  const location = useLocation();
  const msgNavTs = location.state?.msgNavTs;

  // Common emojis for the emoji picker
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '🎉', '🔥', '💯', '👏', '🙏', '💪', '✨', '🚀'];

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedApplicant) {
      console.log('🔍 Opening chat for applicant ID:', selectedApplicant);
      console.log('🔍 Setting pendingChatUserId to:', selectedApplicant);
      console.log('🔍 Current showConversationsList:', showConversationsList);
      console.log('🔍 Current selectedChat (will be cleared):', selectedChat);
      
      // Set flag to prevent auto-selection
      setIsSettingUpPendingChat(true);
      
      // Instead of creating conversation immediately, set up pending chat
      setPendingChatUserId(selectedApplicant);
      setSelectedChat(null); // Clear any existing chat - this is important!
      setMessages([]); // Clear messages
      setShowConversationsList(false); // Hide conversations list on mobile when chat is selected
      console.log('🔍 Set showConversationsList to false and cleared selectedChat');
      
      // Clear the flag after a short delay to allow the pending chat to be set up
      setTimeout(() => {
        setIsSettingUpPendingChat(false);
      }, 500);
    } else {
      console.log('🔍 No selectedApplicant provided');
    }
  }, [selectedApplicant, msgNavTs]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat);
    }
  }, [selectedChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const performUserSearch = async () => {
    try {
      setSearchLoading(true);
      const results = await profileService.searchProfiles(searchQuery);
      setSearchSuggestions(results.slice(0, 5)); // Limit to 5 suggestions
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userConversations = await messageService.getConversations();
      
      // Filter out conversations that have no messages
      const conversationsWithMessages = (userConversations || []).filter(conversation => 
        conversation.messages && conversation.messages.length > 0
      );
      
      // TODO: Re-implement conversation filtering with proper field mapping
      // For now, disable filtering to restore message functionality
      // const filteredConversations = await blockingService.filterBlockedUsers(conversationsWithMessages);
      setConversations(conversationsWithMessages);
      
      // Only auto-select first conversation on desktop (not mobile) and only if no pending chat or selectedApplicant
      console.log('🔍 Auto-selection check:', {
        hasConversations: conversationsWithMessages && conversationsWithMessages.length > 0,
        selectedChat,
        isMobile,
        pendingChatUserId,
        selectedApplicant,
        isSettingUpPendingChat,
        shouldAutoSelect: conversationsWithMessages && conversationsWithMessages.length > 0 && !selectedChat && !isMobile && !pendingChatUserId && !selectedApplicant && !isSettingUpPendingChat
      });
      
      if (conversationsWithMessages && conversationsWithMessages.length > 0 && !selectedChat && !isMobile && !pendingChatUserId && !selectedApplicant && !isSettingUpPendingChat) {
        console.log('🔍 Auto-selecting first conversation:', conversationsWithMessages[0].id);
        setSelectedChat(conversationsWithMessages[0].id);
        setShowConversationsList(false); // Auto-hide on desktop when conversation is loaded
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // Mark messages as read before loading
      await messageService.markMessagesAsRead(conversationId);
      if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      const conversationMessages = await messageService.getConversationMessages(conversationId);
      setMessages(conversationMessages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  // COMPLETELY FIXED: Delete conversation with proper error handling and user feedback
  const handleDeleteConversation = async () => {
    if (!selectedChat || deleteLoading) return;
    
    // Add confirmation dialog
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleteLoading(true);
      console.log('🗑️ User confirmed deletion, starting process...');
      
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

  // UPDATED: Add emoji to message
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // UPDATED: Start conversation with suggested user
  const handleStartConversation = async (userId: string) => {
    try {
      const conversation = await messageService.createOrGetConversation(userId);
      setSelectedChat(conversation.id);
      setPendingChatUserId(null); // Clear pending chat when creating new conversation
      setPendingUserInfo(null); // Clear pending user info
      setSearchQuery('');
      setSearchSuggestions([]);
      setShowConversationsList(false); // Hide conversations list when new chat starts (both mobile and desktop)
      // Reload conversations to include the new one
      await loadConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const currentConversation = conversations.find(conv => conv.id === selectedChat);
  
  // For pending chats, we need to get user info
  const [pendingUserInfo, setPendingUserInfo] = useState<any>(null);
  
  useEffect(() => {
    const fetchPendingUserInfo = async () => {
      console.log('🔍 fetchPendingUserInfo check:', {
        pendingChatUserId,
        selectedChat,
        shouldFetch: pendingChatUserId && !selectedChat
      });
      
      if (pendingChatUserId && !selectedChat) {
        console.log('🔍 Fetching pending user info for:', pendingChatUserId);
        try {
          // Fetch user profile for pending chat
          const userProfile = await profileService.getProfile(pendingChatUserId);
          console.log('✅ Pending user profile fetched:', userProfile);
          setPendingUserInfo(userProfile);
        } catch (error) {
          console.error('❌ Error fetching pending user info:', error);
          setPendingUserInfo(null);
        }
      } else {
        console.log('🔍 Clearing pending user info. pendingChatUserId:', pendingChatUserId, 'selectedChat:', selectedChat);
        setPendingUserInfo(null);
      }
    };
    
    fetchPendingUserInfo();
  }, [pendingChatUserId, selectedChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

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
        await messageService.sendMessage(conversationId, newMessage);
        setNewMessage('');
        // Reload messages
        await loadMessages(conversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

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

  const getOtherParticipant = (conversation: any) => {
    if (!user) return null;
    
    if (conversation.participant_1 === user.id) {
      return conversation.participant_2_profile;
    } else {
      return conversation.participant_1_profile;
    }
  };

  // UPDATED: Format relative time for conversation list
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  if (loading) {
    return (
      <div className="bg-stone text-slate-900 font-display w-full flex items-center justify-center overflow-hidden" style={{height: 'calc(100vh - 5rem)'}}>
        <LoadingSpinner text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="bg-stone text-slate-900 font-display w-full flex flex-col overflow-hidden" style={{height: 'calc(100vh - 5rem)'}}>
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
                      <img
                        src={getProfilePicture(suggestion)}
                        alt={suggestion.full_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
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

                const isSelected = selectedChat === conversation.id;
                const hasUnreadMessages = conversation.unread_count > 0;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedChat(conversation.id);
                      setPendingChatUserId(null); // Clear pending chat when selecting real conversation
                      setPendingUserInfo(null); // Clear pending user info
                      setShowConversationsList(false);
                    }}
                    className={`cursor-pointer p-4 hover:bg-stone-border/50 transition-colors border-l-4 ${
                      isSelected 
                        ? 'bg-white border-sage' 
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div 
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12 w-12 object-cover"
                            style={{backgroundImage: `url("${getProfilePicture(otherParticipant)}")`}}
                          ></div>
                          {otherParticipant.verified && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <p className={`text-sm truncate ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-900 font-medium'}`}>
                            {otherParticipant.full_name}
                          </p>
                          <p className={`text-xs truncate text-slate-500 ${hasUnreadMessages ? 'font-medium' : ''}`}>
                            {conversation.messages?.[0]?.content || 'Start a conversation...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        <span className="text-slate-500 text-xs whitespace-nowrap">
                          {formatRelativeTime(conversation.last_message_at)}
                        </span>
                        {hasUnreadMessages && (
                          <span className="h-2 w-2 rounded-full bg-sage"></span>
                        )}
                      </div>
                    </div>
                  </div>
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
                          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-10 w-10 object-cover cursor-pointer bg-slate-200 flex items-center justify-center"
                          style={{backgroundImage: otherParticipant ? `url("${getProfilePicture(otherParticipant)}")` : 'none'}}
                          onClick={() => otherParticipant && handleProfileClick(otherParticipant.id)}
                        >
                          {!otherParticipant && (
                            <span className="text-slate-500 font-medium text-sm">
                              {pendingChatUserId ? '?' : 'U'}
                            </span>
                          )}
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
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 flex flex-col bg-white">{/* Date Separator */}
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
                          <div 
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-8 w-8 object-cover mt-1 shrink-0"
                            style={{backgroundImage: `url("${getProfilePicture(otherParticipant)}")`}}
                          ></div>
                        )}
                        <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? 'items-end' : ''}`}>
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
                          <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                            isOwnMessage 
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

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="shrink-0 p-4 pt-2 pb-4 bg-white border-t border-stone-border">
                <div className="relative flex items-end gap-2 bg-white rounded-lg p-1.5 shadow-sm border border-stone-border focus-within:ring-2 focus-within:ring-sage focus-within:border-transparent transition-all">
                  <button className="p-1.5 text-slate-500 hover:text-sage transition-colors rounded-lg h-8 w-8 flex items-center justify-center shrink-0">
                    <PlusCircle className="text-[20px]" />
                  </button>
                  <textarea 
                    className="block w-full resize-none border-0 bg-transparent py-1.5 px-0 text-slate-900 placeholder:text-slate-500 focus:ring-0 sm:text-sm sm:leading-6 max-h-24" 
                    placeholder="Type a message..." 
                    rows={1}
                    style={{minHeight: '32px'}}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 text-slate-500 hover:text-sage transition-colors rounded-lg h-8 w-8 flex items-center justify-center"
                    >
                      <Smile className="text-[18px]" />
                    </button>
                    <button className="p-1.5 text-slate-500 hover:text-sage transition-colors rounded-lg h-8 w-8 flex items-center justify-center">
                      <Image className="text-[18px]" />
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="ml-1 bg-sage hover:bg-sage-dark text-white p-1.5 rounded-lg h-8 w-8 flex items-center justify-center shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="text-[18px]" />
                    </button>
                  </div>
                </div>
                <div className="text-center mt-1">
                  <p className="text-[10px] text-slate-500">Press Enter to send, Shift + Enter for new line</p>
                </div>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-6 mb-2 bg-white border border-stone-border rounded-lg shadow-xl p-0 z-50 min-w-[320px] max-w-[360px] w-full">
                    {/* Search bar */}
                    <div className="p-2 border-b border-stone-border flex items-center">
                      <input
                        type="text"
                        value={emojiSearch}
                        onChange={e => setEmojiSearch(e.target.value)}
                        placeholder="Search emojis..."
                        className="w-full px-3 py-2 border border-stone-border rounded focus:outline-none text-sm"
                        autoFocus
                      />
                      <button
                        className="ml-2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowEmojiPicker(false)}
                        type="button"
                        aria-label="Close emoji picker"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    {/* Category row */}
                    <div className="flex overflow-x-auto no-scrollbar px-2 py-1 space-x-2 border-b border-stone-border bg-stone-off">
                      {emojiCategories.map(cat => (
                        <button
                          key={cat.key}
                          className={`text-xl px-2 py-1 rounded-full transition-colors ${activeCategory === cat.key ? 'bg-stone-border' : 'hover:bg-stone-border/50'}`}
                          onClick={() => setActiveCategory(cat.key)}
                          type="button"
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    {/* Emoji grid */}
                    <div className="max-h-64 overflow-y-auto p-3">
                      <div className="grid grid-cols-8 gap-2">
                        {(emojiSearch
                          ? Object.values(emojiData).flat().filter((e: string) => e.includes(emojiSearch))
                          : emojiData[activeCategory]
                        ).slice(0, 80).map((emoji: string, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleEmojiSelect(emoji)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-xl hover:bg-stone-off rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
    </div>
  );
};

export default MessagesPage;