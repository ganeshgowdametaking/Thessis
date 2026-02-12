import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { Menu, X, Briefcase, MessageSquare, Bell, User, Settings, Search, LogOut } from 'lucide-react'; // Removing unused import entirely
import { useAuthContext } from '../contexts/AuthContext';
// import { searchService } from '../services/searchService'; // Removing unused import entirely
// import { messageService } from '../services/messageService'; // Removing unused import entirely
import { notificationService } from '../services/notificationService';

// Add global type for refreshUnreadCounts
declare global {
  interface Window {
    refreshUnreadCounts?: () => void;
  }
}

interface HeaderProps {
  onSignIn?: () => void;
  onJoinNow?: () => void;
}


const Header: React.FC<HeaderProps> = ({ onSignIn, onJoinNow }) => {
  const { user, signOut, profile } = useAuthContext();
  // const location = useLocation(); // Unused
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // const [searchLoading, setSearchLoading] = useState(false); // Unused
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // const [unreadMessages, setUnreadMessages] = useState(0); // Unused
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close suggestions on outside click or escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Also reset highlightedIndex when searchQuery is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedIndex(-1);
    }
  }, [searchQuery]);

  // Fetch unread counts
  const fetchCounts = async () => {
    try {
      const [notifCount] = await Promise.all([
        // messageService.getUnreadMessagesCount(),
        notificationService.getUnreadNotificationsCount(),
      ]);
      // setUnreadMessages(msgCount);
      setUnreadNotifications(notifCount);
    } catch (e) {
      // Silent fail
    }
  };

  useEffect(() => {
    // let isMounted = true; // Unused
    const safeFetch = async () => {
      await fetchCounts();
    };
    safeFetch();
    const interval = setInterval(safeFetch, 120000); // Poll every 2 minutes
    // Expose global refresh for other components
    window.refreshUnreadCounts = fetchCounts;
    return () => { /* isMounted = false; */ clearInterval(interval); window.refreshUnreadCounts = undefined; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        setShowSuggestions(false);
        navigate(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
      }
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setShowSuggestions(false);
    setSearchQuery('');
    if (suggestion.type === 'profile') {
      const profileId = suggestion.userId || suggestion.id;
      if (profileId) {
        navigate(`/profile/${profileId}`);
      }
    } else if (suggestion.type === 'company') {
      navigate(`/search-results?q=${encodeURIComponent(suggestion.company)}`);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      e.preventDefault();
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      handleSuggestionClick(suggestions[highlightedIndex]);
      e.preventDefault();
    }
  };


  // Common suggestion item component to avoid duplication
  const SuggestionItem = ({ suggestion, index }: { suggestion: any; index: number }) => (
    <div
      key={suggestion.type + '-' + (suggestion.userId || suggestion.company)}
      className={`flex items-center px-4 py-2 cursor-pointer hover:bg-blue-50 ${index === highlightedIndex ? 'bg-blue-100' : ''}`}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        setShowSuggestions(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        if (suggestion.type === 'profile') {
          const profileId = suggestion.userId || suggestion.id;
          if (profileId) {
            navigate(`/profile/${profileId}`);
          }
        } else if (suggestion.type === 'company') {
          navigate(`/search-results?q=${encodeURIComponent(suggestion.company)}`);
        }
      }}
      onMouseEnter={() => setHighlightedIndex(index)}
    >
      {suggestion.image ? (
        <img src={suggestion.image} alt="avatar" className="w-7 h-7 rounded-full mr-3" />
      ) : (
        <span className="mr-3 text-xl">{suggestion.icon}</span>
      )}
      <div className="flex flex-col">
        <span className="font-medium truncate max-w-xs">{suggestion.text}</span>
        {suggestion.type === 'profile' && suggestion.company && (
          <span className="text-xs text-slate-500 truncate">{suggestion.company}</span>
        )}
      </div>
    </div>
  );

  if (!user) {
    return (
      <header className="w-full border-b border-slate-200/60 bg-stone/90 backdrop-blur-md sticky top-0 z-50 h-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="block">
                <img
                  src="/logo2.png"
                  alt="TankTide Logo"
                  className="h-12 w-12 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-8"></nav>
            <div className="flex items-center gap-3">
              <button onClick={onSignIn} className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 text-sm font-bold text-slate-700 hover:bg-black/5 transition-colors">
                Login
              </button>
              <button onClick={onJoinNow} className="flex h-9 items-center justify-center rounded-lg bg-sage px-4 text-sm font-bold text-white shadow-sm hover:bg-sage-dark transition-all">
                Signup
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }


  return (
    <header className="bg-white border-b border-stone-200 h-20 shrink-0 flex items-center justify-between px-6 lg:px-10 z-40 relative">
      <div className="flex items-center gap-6 xl:gap-10 w-full lg:w-auto">
        <div className="flex items-center shrink-0">
          <Link to="/jobs" className="block">
            <img
              src="/logo2.png"
              alt="TankTide Logo"
              className="h-16 w-16 object-contain rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>

        <div className="hidden lg:flex items-center bg-[#f2f1ec] rounded-full px-5 py-2.5 w-[540px] border border-[#e6e5e0] transition-colors focus-within:border-primary/50 focus-within:bg-[#efeee9] shadow-sm">
          <span className="material-symbols-outlined text-slate-500 text-[22px]">search</span>
          <form onSubmit={handleSearch} className="flex-1">
            <input
              className="bg-transparent border-none p-0 ml-3 w-full text-slate-700 placeholder:text-slate-500 focus:ring-0 text-[15px] font-medium"
              placeholder="Search..."
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onKeyDown={handleInputKeyDown}
              onKeyPress={handleSearchKeyPress}
            />
          </form>
        </div>
      </div>

      <div className="flex items-center gap-8 xl:gap-12 shrink-0">
        <nav className="hidden xl:flex items-center gap-10">
          {(profile?.role === 'admin' || profile?.role?.toLowerCase() === 'founder' || profile?.role?.toLowerCase() === 'co_founder') && (
            <Link className="text-[#354038] font-semibold text-[17px] hover:text-primary transition-colors flex items-center h-10" to="/analytics">
              Dashboard
            </Link>
          )}
          <Link className="text-[#354038] font-semibold text-[17px] hover:text-primary transition-colors flex items-center h-10" to="/jobs">
            Referrals
          </Link>
          <Link className="text-[#354038] font-semibold text-[17px] hover:text-primary transition-colors flex items-center h-10" to="/messages">
            Messages
          </Link>
        </nav>

        <div className="flex items-center gap-6">
          <Link to="/notifications" className="relative text-[#354038] hover:text-primary transition-colors p-1 group flex items-center justify-center h-10 w-10">
            <span className="material-symbols-outlined text-[28px] filled group-hover:opacity-80 transition-opacity">notifications</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-[#ef4444] rounded-full border-2 border-white"></span>
            )}
          </Link>

          <Link className="block relative group" to="/profile">
            <div className="h-10 w-10 rounded-full bg-cover bg-center border-[1.5px] border-[#e2e8f0] shadow-sm group-hover:border-primary/50 transition-colors">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Profile'}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#5f7261] flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
          </Link>

          <div className="relative" ref={settingsDropdownRef}>
            <button
              className="text-[#354038] hover:text-primary transition-colors p-1 group flex items-center justify-center h-10 w-10"
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            >
              <span className="material-symbols-outlined text-[28px] filled group-hover:opacity-80 transition-opacity">settings</span>
            </button>

            {showSettingsDropdown && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-md bg-white border border-slate-200 shadow-lg py-1">
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#f2f1ec]"
                  onClick={() => setShowSettingsDropdown(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setShowSettingsDropdown(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-[#f2f1ec]"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="xl:hidden">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 text-[#354038]">
          <div className="flex h-6 w-6 items-center justify-center">
            {isMenuOpen ? (
              <span className="material-symbols-outlined text-[24px]">close</span>
            ) : (
              <span className="material-symbols-outlined text-[24px]">menu</span>
            )}
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-stone-200 xl:hidden">
          <div className="px-6 py-4 space-y-3">
            <Link
              to="/jobs"
              className="block text-[#354038] font-semibold text-[16px] hover:text-primary transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/jobs"
              className="block text-[#354038] font-semibold text-[16px] hover:text-primary transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Referrals
            </Link>
            <Link
              to="/messages"
              className="block text-[#354038] font-semibold text-[16px] hover:text-primary transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Messages
            </Link>
            <Link
              to="/settings"
              className="block text-[#354038] font-semibold text-[16px] hover:text-primary transition-colors py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
            <button
              onClick={() => { setIsMenuOpen(false); signOut(); }}
              className="block w-full text-left text-red-600 font-semibold text-[16px] py-2"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-6 right-6 lg:left-[200px] lg:right-auto lg:w-[540px] bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto z-50"
        >
          {suggestions.map((suggestion, index) => (
            <SuggestionItem key={index} suggestion={suggestion} index={index} />
          ))}
        </div>
      )}
    </header>
  );
};
export default Header;
