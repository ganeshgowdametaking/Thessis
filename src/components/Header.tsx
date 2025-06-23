import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Briefcase, MessageSquare, Bell, User, Settings, Search, ChevronDown } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';
import { searchService } from '../services/searchService';
import AuthModal from './AuthModal';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange, onSearch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'verify-email'>('signin');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { user, signOut, loading } = useAuthContext();
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Load unread notification count
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      loadUnreadNotificationCount();
      
      // Set up interval to refresh notification count every 30 seconds
      const interval = setInterval(loadUnreadNotificationCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load recent searches when search is focused
  useEffect(() => {
    if (searchFocus && !searchQuery.trim()) {
      loadRecentSearches();
    }
  }, [searchFocus]);

  // Perform search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchService.performSearch(searchQuery);
          const suggestions = [
            ...results.users,
            ...results.companies
          ];
          setSearchSuggestions(suggestions);
        } catch (error) {
          console.error('Search error:', error);
          setSearchSuggestions([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300); // 300ms debounce
    } else {
      setSearchSuggestions([]);
      setSearchLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // FIXED: Sync currentPage with URL path
  useEffect(() => {
    const path = location.pathname.substring(1); // Remove leading slash
    const page = path || 'home';
    
    // Only update if there's a mismatch and it's not an internal navigation
    if (page !== currentPage && (!location.state || !(location.state as any).internal)) {
      onPageChange(page);
    }
  }, [location.pathname, currentPage, onPageChange, location.state]);

  const loadUnreadNotificationCount = async () => {
    try {
      const notifications = await notificationService.getNotifications();
      const unreadCount = notifications.filter(notif => !notif.read).length;
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error loading notification count:', error);
      setUnreadNotificationCount(0);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const recent = await searchService.getRecentSearches();
      setRecentSearches(recent);
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setRecentSearches([]);
    }
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  const getDisplaySuggestions = () => {
    if (!searchQuery.trim()) {
      // Show recent searches when no query
      return recentSearches.map(item => ({
        type: 'recent',
        text: item,
        icon: '🕒',
        image: null,
        company: 'Recent search'
      }));
    }
    
    return searchSuggestions;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Save to recent searches
      searchService.saveRecentSearch(searchQuery);
      onSearch(searchQuery);
      setSearchFocus(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'recent') {
      setSearchQuery(suggestion.text);
      onSearch(suggestion.text);
    } else {
      setSearchQuery(suggestion.text);
      searchService.saveRecentSearch(suggestion.text);
      onSearch(suggestion.text);
    }
    setSearchFocus(false);
  };

  const handleNavClick = (page: string) => {
    onPageChange(page);
    setIsMenuOpen(false);
    
    // Refresh notification count when navigating to notifications page
    if (page === 'notifications') {
      loadUnreadNotificationCount();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowSettingsDropdown(false);
      onPageChange('landing');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const settingsDropdownItems = [
    { label: 'Account Settings', action: () => {
      onPageChange('account-settings');
      navigate('/account-settings', { state: { internal: true } });
    }},
    { label: 'Privacy Policy', action: () => {
      onPageChange('privacy-policy-page');
      navigate('/privacy-policy', { state: { internal: true } });
    }},
    { label: 'Terms of Service', action: () => {
      onPageChange('terms');
      navigate('/terms', { state: { internal: true } });
    }},
    { label: 'Help Center', action: () => {
      onPageChange('help');
      navigate('/help', { state: { internal: true } });
    }},
    { label: 'Logout', action: handleSignOut },
  ];

  if (loading) {
    return (
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-10 w-auto"
              />
            </div>
            <div className="text-slate-300">Loading...</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>

            {/* Enhanced Search Bar with Real Suggestions */}
            {user && user.email_confirmed_at && (
              <div className="hidden md:flex flex-1 max-w-2xl mx-8 relative">
                <form onSubmit={handleSearchSubmit} className="w-full relative">
                  <div className="relative">
                    <div className="relative bg-slate-800 border border-slate-600 rounded-lg overflow-hidden hover:border-slate-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocus(true)}
                        onBlur={() => setTimeout(() => setSearchFocus(false), 200)}
                        placeholder="Search professionals, companies, opportunities..."
                        className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-slate-400 focus:outline-none"
                      />
                      {searchLoading && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {searchFocus && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="p-4">
                        <div className="text-xs text-slate-400 mb-3 uppercase tracking-wide font-medium">
                          {searchQuery.trim() ? 'Suggestions' : 'Recent Searches'}
                        </div>
                        <div className="space-y-2">
                          {getDisplaySuggestions().length > 0 ? (
                            getDisplaySuggestions().map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="w-full flex items-center space-x-3 p-3 rounded-md hover:bg-slate-700 transition-colors text-left"
                              >
                                {suggestion.image ? (
                                  <img
                                    src={suggestion.image}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover border border-slate-600"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                                    <span className="text-sm">{suggestion.icon}</span>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="text-white text-sm font-medium">{suggestion.text}</div>
                                  <div className="text-xs text-slate-400 capitalize">
                                    {suggestion.type === 'recent' ? suggestion.company : `${suggestion.type} • ${suggestion.company}`}
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : searchQuery.trim() ? (
                            <div className="text-center py-4 text-slate-400 text-sm">
                              {searchLoading ? 'Searching...' : 'No suggestions found'}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-slate-400 text-sm">
                              No recent searches
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Professional Navigation */}
            <nav className="hidden md:flex items-center space-x-1 flex-shrink-0">
              {user && user.email_confirmed_at ? (
                <>
                  {[
                    { icon: Home, label: 'Home', page: 'home' },
                    { icon: Briefcase, label: 'Jobs', page: 'jobs' },
                    { icon: MessageSquare, label: 'Messages', page: 'messages' },
                  ].map((item) => (
                    <Link
                      key={item.page}
                      to={`/${item.page === 'home' ? '' : item.page}`}
                      className={`relative flex flex-col items-center p-3 rounded-lg transition-all min-w-[80px] ${
                        currentPage === item.page 
                          ? 'bg-slate-700 text-blue-400' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                      onClick={() => handleNavClick(item.page)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-xs mt-1 font-medium">{item.label}</span>
                    </Link>
                  ))}
                  
                  {/* Notifications Button */}
                  <Link
                    to="/notifications"
                    className={`relative flex flex-col items-center p-3 rounded-lg transition-all min-w-[80px] ${
                      currentPage === 'notifications' 
                        ? 'bg-slate-700 text-blue-400' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    onClick={() => handleNavClick('notifications')}
                  >
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadNotificationCount > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold leading-none px-1">
                            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs mt-1 font-medium">Notifications</span>
                  </Link>

                  {/* Profile Button */}
                  <Link
                    to="/profile"
                    className={`relative flex flex-col items-center p-3 rounded-lg transition-all min-w-[80px] ${
                      currentPage === 'profile' 
                        ? 'bg-slate-700 text-blue-400' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    onClick={() => handleNavClick('profile')}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-xs mt-1 font-medium">Profile</span>
                  </Link>
                  
                  {/* Settings Dropdown */}
                  <div className="relative" ref={settingsDropdownRef}>
                    <button 
                      onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                      className="flex flex-col items-center p-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all min-w-[80px]"
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-xs mt-1 font-medium">Settings</span>
                    </button>
                    
                    {showSettingsDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="py-2">
                          {settingsDropdownItems.map((item, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                item.action();
                                setShowSettingsDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => {
                      setAuthMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="text-slate-300 hover:text-white font-medium transition-colors px-4 py-2"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Join Now
                  </button>
                </div>
              )}
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-300 hover:text-white transition-colors p-2"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-700">
              <div className="space-y-2">
                {user && user.email_confirmed_at && (
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSubmit(e);
                          setIsMenuOpen(false);
                        }
                      }}
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {user && user.email_confirmed_at ? (
                  <div className="space-y-1">
                    {[
                      { icon: Home, label: 'Home', page: 'home' },
                      { icon: Briefcase, label: 'Jobs', page: 'jobs' },
                      { icon: MessageSquare, label: 'Messages', page: 'messages' },
                      { icon: Bell, label: 'Notifications', page: 'notifications', badge: unreadNotificationCount },
                      { icon: User, label: 'Profile', page: 'profile' },
                      { icon: Settings, label: 'Settings', page: 'settings' },
                    ].map((item) => (
                      <Link
                        key={item.page}
                        to={`/${item.page === 'home' ? '' : item.page}`}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          currentPage === item.page 
                            ? 'bg-slate-700 text-blue-400' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        onClick={() => handleNavClick(item.page)}
                      >
                        <div className="relative">
                          <item.icon className="h-5 w-5" />
                          {item.badge && item.badge > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-xs text-white font-bold leading-none px-1">
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-red-400 hover:text-red-300 hover:bg-slate-800"
                    >
                      <X className="h-5 w-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setAuthMode('signin');
                        setShowAuthModal(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left p-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode('signup');
                        setShowAuthModal(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left p-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Join Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  );
};

export default Header;