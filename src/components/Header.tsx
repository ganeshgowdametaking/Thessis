import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Briefcase, MessageSquare, Bell, User, Settings, Search, LogOut } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { searchService } from '../services/searchService';
import { messageService } from '../services/messageService';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
      const [msgCount, notifCount] = await Promise.all([
        messageService.getUnreadMessagesCount(),
        notificationService.getUnreadNotificationsCount(),
      ]);
      setUnreadMessages(msgCount);
      setUnreadNotifications(notifCount);
    } catch (e) {
      // Silent fail
    }
  };

  useEffect(() => {
    let isMounted = true;
    const safeFetch = async () => {
      await fetchCounts();
    };
    safeFetch();
    const interval = setInterval(safeFetch, 30000); // Poll every 30s
    // Expose global refresh for other components
    window.refreshUnreadCounts = fetchCounts;
    return () => { isMounted = false; clearInterval(interval); window.refreshUnreadCounts = undefined; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
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

  // Helper for badge
  const Badge = ({ count }: { count: number }) => (
    count > 0 ? (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white z-10">
        {count > 99 ? '99+' : count}
      </span>
    ) : null
  );

  if (!user) {
    return (
      <header className="sticky top-0 z-40 bg-slate-900 text-white">
        <div className="w-full">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex-shrink-0">
              <Link to="/" className="flex-shrink-0">
                <img className="h-10 w-auto" src="/new-logo.png" alt="TankTide" />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={onSignIn} className="sign-in-btn">
                Sign In
              </button>
              <button onClick={onJoinNow} className="join-now-btn">
                Join Now
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const navLinks = [
    ...(profile?.role === 'admin' ? [{ href: '/analytics', label: 'Analytics', icon: Briefcase }] : []),
    { href: '/jobs', label: 'Jobs', icon: Briefcase },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const isActive = location.pathname === href;
    let badgeCount = 0;
    if (label === 'Messages') badgeCount = unreadMessages;
    if (label === 'Notifications') badgeCount = unreadNotifications;
    return (
      <Link
        to={href}
        className={`flex min-w-[70px] flex-col items-center space-y-1 rounded-lg p-2 transition-colors ${
          isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <div className="relative flex h-5 w-5 items-center justify-center">
          <Icon className="h-5 w-5 stroke-2" />
          <Badge count={badgeCount} />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white">
      <div className="w-full">
        <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo - Absolute left position */}
          <div className="flex-shrink-0">
            <Link to="/jobs" className="flex-shrink-0">
              <img className="h-10 w-auto" src="/new-logo.png" alt="TankTide" />
            </Link>
          </div>

          {/* Search Bar - Always visible on mobile, wide on desktop */}
          <div className="flex-1 mx-4">
            <form onSubmit={handleSearch} className="relative block md:hidden">
              <div className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 transform items-center justify-center">
                <Search className="h-5 w-5 stroke-2 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search people, companies..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onKeyDown={handleInputKeyDown}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </form>
            <div className="mx-8 hidden max-w-2xl flex-1 md:block">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 transform items-center justify-center">
                  <Search className="h-5 w-5 stroke-2 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search people, companies..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onKeyDown={handleInputKeyDown}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Desktop Navigation - Consistent icon sizes */}
          <div className="hidden items-center space-x-2 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
            <div className="relative" ref={settingsDropdownRef}>
              <button
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className={`flex min-w-[70px] flex-col items-center space-y-1 rounded-lg p-2 transition-colors ${
                  location.pathname === '/settings' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  <Settings className="h-5 w-5 stroke-2" />
                </div>
                <span className="text-xs font-medium">Settings</span>
              </button>
              {showSettingsDropdown && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md bg-slate-800 py-1 shadow-lg">
                  <Link to="/settings" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700" onClick={() => setShowSettingsDropdown(false)}>
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setShowSettingsDropdown(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button - FIXED: Now h-5 w-5 */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1">
              <div className="flex h-5 w-5 items-center justify-center">
                {isMenuOpen ? <X className="h-5 w-5 stroke-2" /> : <Menu className="h-5 w-5 stroke-2" />}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {navLinks.map((link) => {
              let badgeCount = 0;
              if (link.label === 'Messages') badgeCount = unreadMessages;
              if (link.label === 'Notifications') badgeCount = unreadNotifications;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center space-x-3 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <link.icon className="h-5 w-5 stroke-2" />
                    <Badge count={badgeCount} />
                  </div>
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <Link
              to="/settings"
              className="flex items-center space-x-3 rounded-md px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <Settings className="h-5 w-5 stroke-2" />
              </div>
              <span>Settings</span>
            </Link>
            <button
              onClick={() => { setIsMenuOpen(false); signOut(); }}
              className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-base font-medium text-red-400 hover:bg-slate-800"
            >
              <div className="flex h-5 w-5 items-center justify-center">
                <LogOut className="h-5 w-5 stroke-2" />
              </div>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;