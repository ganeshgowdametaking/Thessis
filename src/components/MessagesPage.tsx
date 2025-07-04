import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreHorizontal, Send, Smile, Circle, MessageSquare, Trash2, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { messageService } from '../services/messageService';
import { profileService } from '../services/profileService';
import { useAuthContext } from '../contexts/AuthContext';
import { useMediaQuery } from 'react-responsive';

interface MessagesPageProps {
  selectedApplicant?: number | null;
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
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
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
      console.log('Opening chat for applicant ID:', selectedApplicant);
      // Create or get conversation with the selected applicant
      const openConversationWithApplicant = async () => {
        try {
          const conversation = await messageService.createOrGetConversation(selectedApplicant.toString());
          setSelectedChat(conversation.id);
          setShowConversationsList(false); // Hide conversations list on mobile when chat is selected
          // Reload conversations to include the new one if it was created
          await loadConversations();
        } catch (error) {
          console.error('Error opening conversation with applicant:', error);
          alert('Failed to open conversation. Please try again.');
        }
      };
      openConversationWithApplicant();
    }
  }, [selectedApplicant, msgNavTs]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.toString());
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
      setConversations(userConversations || []);
      
      // Only auto-select first conversation on desktop (not mobile)
      if (userConversations && userConversations.length > 0 && !selectedChat && !isMobile) {
        setSelectedChat(userConversations[0].id);
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
      const result = await messageService.deleteConversation(selectedChat.toString());
      
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedChat) {
      try {
        await messageService.sendMessage(selectedChat.toString(), newMessage);
        setNewMessage('');
        // Reload messages
        await loadMessages(selectedChat.toString());
      } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
      }
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
      <div className="h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Conversations Sidebar - Mobile responsive */}
      <div className={`${showConversationsList ? 'flex' : 'hidden'} md:flex md:w-1/3 bg-white border-r border-slate-200 flex-col`}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Messages</h1>
          {selectedApplicant && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                💼 Messaging about job application
              </p>
            </div>
          )}
          
          {/* UPDATED: Enhanced search with user suggestions */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people to message..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Search Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-slate-500 mb-2 px-2">People</div>
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleStartConversation(suggestion.id)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
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
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? (
            conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              if (!otherParticipant) return null;

              return (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedChat(conversation.id);
                    setShowConversationsList(false); // Hide conversations list on mobile
                  }}
                  className={`p-4 cursor-pointer transition-colors border-b border-slate-100 hover:bg-slate-50 ${
                    selectedChat === conversation.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={getProfilePicture(otherParticipant)}
                        alt={otherParticipant.full_name}
                        className="w-12 h-12 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProfileClick(otherParticipant.id);
                        }}
                      />
                      {otherParticipant.verified && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 
                          className="font-bold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors text-sm sm:text-base"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProfileClick(otherParticipant.id);
                          }}
                        >
                          {otherParticipant.full_name}
                        </h3>
                        {/* UPDATED: Display relative time */}
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {formatRelativeTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate mb-1 font-medium">
                        {otherParticipant.title || 'Professional'}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {conversation.messages?.[0]?.content || 'Start a conversation...'}
                      </p>
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

      {/* Chat Area - Mobile responsive */}
      <div className={`${!showConversationsList ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white relative h-screen md:h-auto`}>
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Back button for mobile */}
                  <button
                    onClick={handleBackToConversations}
                    className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  <div className="relative">
                    {(() => {
                      const otherParticipant = getOtherParticipant(currentConversation);
                      return (
                        <img
                          src={getProfilePicture(otherParticipant)}
                          alt={otherParticipant?.full_name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => otherParticipant && handleProfileClick(otherParticipant.id)}
                        />
                      );
                    })()}
                  </div>
                  <div>
                    {(() => {
                      const otherParticipant = getOtherParticipant(currentConversation);
                      return (
                        <>
                          <h2 
                            className="font-bold text-slate-900 text-base sm:text-lg cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => otherParticipant && handleProfileClick(otherParticipant.id)}
                          >
                            {otherParticipant?.full_name || 'User'}
                          </h2>
                          <p className="text-sm text-slate-600 font-medium">
                            {otherParticipant?.title || 'Professional'}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            <Circle className="h-2 w-2 text-green-500 fill-current" />
                            <span className="text-xs text-green-600 font-medium">Online now</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* ENHANCED: 3-dot menu with loading state */}
                <div className="relative" ref={actionsMenuRef}>
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    disabled={deleteLoading}
                    className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  
                  {/* Actions Menu */}
                  {showActionsMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 message-wallpaper pb-28 md:pb-0">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex relative z-10 ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${message.sender_id === user?.id ? 'order-2' : 'order-1'}`}>
                      <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                        message.sender_id === user?.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                      <p className={`text-xs mt-2 ${
                        message.sender_id === user?.id ? 'text-slate-500 text-right' : 'text-slate-500'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Start a conversation</h3>
                    <p className="text-slate-600">
                      Send a message to begin chatting with {getOtherParticipant(currentConversation)?.full_name}
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="md:static fixed bottom-0 left-0 right-0 z-40 w-full bg-white p-4 sm:p-6 border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    inputMode="text"
                    style={{ fontSize: '16px' }}
                  />
                  {/* Emoji button and picker: Only show on desktop */}
                  {!isMobile && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                      {/* Emoji Picker */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-xl p-0 z-50 min-w-[320px] max-w-[360px] w-full">
                          {/* Search bar */}
                          <div className="p-2 border-b border-slate-100 flex items-center">
                            <input
                              type="text"
                              value={emojiSearch}
                              onChange={e => setEmojiSearch(e.target.value)}
                              placeholder="Search emojis..."
                              className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none text-sm"
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
                          <div className="flex overflow-x-auto no-scrollbar px-2 py-1 space-x-2 border-b border-slate-100 bg-slate-50">
                            {emojiCategories.map(cat => (
                              <button
                                key={cat.key}
                                className={`text-xl px-2 py-1 rounded-full transition-colors ${activeCategory === cat.key ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
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
                                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-xl hover:bg-slate-100 rounded transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-slate-900 text-white p-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Select a conversation</h3>
              <p className="text-slate-600">Choose a conversation to start messaging</p>
              <button
                onClick={() => setShowConversationsList(true)}
                className="mt-4 md:hidden bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Conversations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;