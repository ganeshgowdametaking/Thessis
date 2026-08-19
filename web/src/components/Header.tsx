import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import profileIcon from '../assets/profile-icon.png';


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
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        notificationService.getUnreadNotificationsCount(),
      ]);
      setUnreadNotifications(notifCount);
    } catch (e) {
      // Silent fail
    }
  };

  useEffect(() => {
    const safeFetch = async () => {
      await fetchCounts();
    };
    safeFetch();
    const interval = setInterval(safeFetch, 120000); // Poll every 2 minutes
    // Expose global refresh for other components
    window.refreshUnreadCounts = fetchCounts;
    return () => { clearInterval(interval); window.refreshUnreadCounts = undefined; };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setShowSettingsDropdown(false);
  }, [location.pathname]);

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
      <header className="sticky top-[-1px] z-50 w-full pt-3 sm:pt-4 px-3 sm:px-6 lg:px-10">
        <div
          className={`mx-auto max-w-7xl rounded-full transition-colors duration-300 ${
            isScrolled ? 'bg-[#F3F4F6]' : 'bg-parchment'
          }`}
        >
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <Link to="/" className="block">
                <img
                  src="/logo2.png?v=2"
                  alt="Thessis Logo"
                  className="h-8 w-8 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-8"></nav>
            <div className="flex items-center gap-3">
              <button onClick={onSignIn} className="hidden sm:flex h-9 items-center justify-center rounded-full px-4 text-sm font-bold text-slate-700 hover:bg-black/5 transition-colors">
                Login
              </button>
              <button onClick={onJoinNow} className="flex h-9 items-center justify-center rounded-full bg-sage px-4 text-sm font-bold text-white hover:bg-sage-dark transition-all">
                Signup
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const primaryMobileRoutes = ['/jobs', '/messages', '/notifications', '/profile'];
  const shouldShowBackButton = location.pathname !== '/' && !primaryMobileRoutes.includes(location.pathname);

  const handleMobileLeadingAction = () => {
    if (shouldShowBackButton) {
      navigate(-1);
      return;
    }
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <header
      className={`border-b border-hairline shrink-0 z-40 sticky top-[-1px] transition-colors duration-300 ${
        isScrolled ? 'bg-[#F3F4F6]' : 'bg-parchment'
      }`}
    >
      <div className="md:hidden h-16 px-2 grid grid-cols-[88px_1fr_88px] items-center">
        <div className="flex items-center justify-start">
          <button
            onClick={handleMobileLeadingAction}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-[#1A1A2E] hover:bg-stone-100 transition-colors"
            aria-label={shouldShowBackButton ? 'Go back' : (isMenuOpen ? 'Close menu' : 'Open menu')}
          >
            {shouldShowBackButton ? (
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            ) : (
              <span className="material-symbols-outlined text-[22px]">{isMenuOpen ? 'close' : 'menu'}</span>
            )}
          </button>
        </div>

        <Link to="/jobs" className="flex items-center justify-self-center min-w-0">
          <img
            src="/logo2.png?v=2"
            alt="Thessis Logo"
            className="h-8 w-8 object-contain"
          />
        </Link>

        <div className="flex items-center justify-end gap-1">
          <Link to="/profile" className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors outline-none focus:outline-none focus-visible:outline-none" aria-label="Profile">
            <img
              src={profile?.avatar_url || profileIcon}
              alt={profile?.full_name || 'Profile'}
              className="h-8 w-8 object-cover rounded-full"
            />
          </Link>
        </div>
      </div>

      <div className="hidden md:flex h-20 items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-6 xl:gap-10 w-full lg:w-auto">
          <div className="flex items-center shrink-0">
            <Link to="/jobs" className="block">
              <img
                src="/logo2.png?v=2"
                alt="Thessis Logo"
                className="h-8 w-8 object-contain cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>

          <div className="hidden lg:flex items-center bg-parchment-sunken rounded-full px-5 py-2.5 w-[540px] border border-hairline-strong transition-colors focus-within:border-primary/50 focus-within:bg-parchment-sunken shadow-sm">
            <span className="material-symbols-outlined text-slate-500 text-[22px]">search</span>
            <form onSubmit={handleSearch} className="flex-1">
              <input
                className="bg-transparent border-none p-0 ml-3 w-full text-slate-700 placeholder:text-slate-500 focus:ring-0 text-[15px] font-medium"
                placeholder="Search people or companies..."
                aria-label="Search people or companies"
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onKeyDown={handleInputKeyDown}
                onKeyPress={handleSearchKeyPress}
              />
            </form>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Jobs Nav Link */}
            <Link
              to="/jobs"
              className={`flex items-center h-11 px-3 text-base font-semibold transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none ${location.pathname === '/jobs' ? 'text-accent' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Jobs
            </Link>

            {/* Messages Nav Link */}
            <Link
              to="/messages"
              className={`flex items-center h-11 px-3 text-base font-semibold transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none ${location.pathname === '/messages' ? 'text-accent' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Messages
            </Link>

            {/* Notifications Nav Link */}
            <Link
              to="/notifications"
              className={`relative flex items-center h-11 px-3 text-base font-semibold transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none ${location.pathname === '/notifications' ? 'text-accent' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Notifications
              {unreadNotifications > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>

            {/* Profile Icon Container */}
            <Link
              to="/profile"
              title="Profile" aria-label="Profile"
              className="group flex items-center justify-center h-11 w-11 rounded-lg transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none"
            >
              <img
                src={profile?.avatar_url || profileIcon}
                alt={profile?.full_name || "Profile"}
                className="h-8 w-8 object-cover rounded-full"
              />
            </Link>

            {/* Settings Icon Container */}
            <div className="relative" ref={settingsDropdownRef}>
              <button
                title="Settings"
                aria-label="Settings"
                className={`flex items-center justify-center h-11 w-11 rounded-lg transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none ${location.pathname === '/settings' ? 'text-accent' : 'text-slate-500 hover:text-slate-900'}`}
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              >
                <Settings className="h-[22px] w-[22px]" />
              </button>

              {showSettingsDropdown && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg bg-white border border-slate-200 shadow-lg py-1">
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-parchment-sunken"
                    onClick={() => setShowSettingsDropdown(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setShowSettingsDropdown(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-parchment-sunken"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-parchment border-b border-hairline md:hidden shadow-sm">
          <div className="px-4 py-3 space-y-1.5">
            <Link
              to="/jobs"
              className="block text-[#1A1A2E] font-semibold text-[15px] hover:text-primary transition-colors py-2.5"
              onClick={() => setIsMenuOpen(false)}
            >
              Referrals
            </Link>
            <Link
              to="/messages"
              className="block text-[#1A1A2E] font-semibold text-[15px] hover:text-primary transition-colors py-2.5"
              onClick={() => setIsMenuOpen(false)}
            >
              Messages
            </Link>
            <Link
              to="/notifications"
              className="block text-[#1A1A2E] font-semibold text-[15px] hover:text-primary transition-colors py-2.5"
              onClick={() => setIsMenuOpen(false)}
            >
              Notifications
            </Link>
            <Link
              to="/profile"
              className="block text-[#1A1A2E] font-semibold text-[15px] hover:text-primary transition-colors py-2.5"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            <Link
              to="/settings"
              className="block text-[#1A1A2E] font-semibold text-[15px] hover:text-primary transition-colors py-2.5"
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>

            <button
              onClick={() => { setIsMenuOpen(false); signOut(); }}
              className="block w-full text-left text-red-600 font-semibold text-[15px] py-2.5"
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
          className="hidden md:block absolute top-full left-6 right-6 lg:left-[200px] lg:right-auto lg:w-[540px] bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto z-50"
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
