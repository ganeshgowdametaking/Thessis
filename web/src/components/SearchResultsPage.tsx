import { useState, useEffect } from 'react';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { blockingService } from '../services/blockingService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import OfflineMessage from './OfflineMessage';
import { isOnline, getCachedData, setCachedData, getOfflineMessage } from '../utils/offlineUtils';
import { useMediaQuery } from 'react-responsive';

interface SearchResultsPageProps {
  searchQuery: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ searchQuery, onBack, onViewProfile }) => {
  const { user, userConnections, refreshUserConnections } = useAuthContext();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState({
    people: [] as any[]
  });
  // Local state removed in favor of context
  const [isOffline, setIsOffline] = useState(!isOnline());

  useEffect(() => {
    let isMounted = true;

    if (searchQuery && isMounted) {
      performSearch();
      // Use global refresh instead of local load
      refreshUserConnections();
    }

    // Refresh connections whenever the window gains focus (coming back from profile)
    const handleFocus = () => {
      if (isMounted) refreshUserConnections();
    };
    window.addEventListener('focus', handleFocus);

    // Listen for online/offline events
    const handleOnline = () => {
      if (isMounted) setIsOffline(false);
    };
    const handleOffline = () => {
      if (isMounted) setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [searchQuery]);

  const performSearch = async () => {
    try {
      setLoading(true);

      // Check if offline
      if (!isOnline()) {
        console.log('Device is offline, checking cache...');
        const cachedResults = getCachedData(`search_${searchQuery}`);
        if (cachedResults) {
          console.log('Using cached search results');
          setSearchResults(cachedResults);
        } else {
          console.log('No cached results available');
          setSearchResults({ people: [] });
        }
        setIsOffline(true);
        return;
      }

      // Online - fetch fresh data
      const people = await profileService.searchProfiles(searchQuery);

      // TODO: Re-implement search filtering with proper user identification
      // For now, disable filtering to restore search functionality
      // const filteredPeople = await blockingService.filterBlockedUsers(people || []);

      // Filter out current user
      const filteredPeople = (people || []).filter((p: any) => p.id !== user?.id);

      const results = {
        people: filteredPeople
      };

      setSearchResults(results);

      // Cache the results for offline use
      if (results.people.length > 0) {
        setCachedData(`search_${searchQuery}`, results);
      }

    } catch (error) {
      console.error('Error performing search:', error);

      // Try to use cached data on error
      const cachedResults = getCachedData(`search_${searchQuery}`);
      if (cachedResults) {
        console.log('Using cached results due to error');
        setSearchResults(cachedResults);
      } else {
        // Show empty results instead of mock data
        setSearchResults({ people: [] });
      }
    } finally {
      setLoading(false);
    }
  };

  // loadUserConnections removed: using refreshUserConnections from context

  const handleConnect = async (userId: string) => {
    try {
      const currentStatus = userConnections[userId] || 'none';

      if (currentStatus === 'none') {
        // Send connection request
        await connectionService.sendConnectionRequest(userId);
        refreshUserConnections(); // Update global state
      } else if (currentStatus === 'pending_sent') {
        // Cancel connection request
        await connectionService.cancelConnectionRequest(userId);
        refreshUserConnections(); // Update global state
      } else if (currentStatus === 'connected') {
        // Disconnect from user
        await connectionService.cancelConnectionRequest(userId);
        refreshUserConnections(); // Update global state
      } else if (currentStatus === 'pending_received') {
        // Accept the request - redirect to notifications page
        alert('Please go to your Notifications page to accept or decline this connection request.');
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      alert('Failed to update connection. Please try again.');
    }
  };

  const getConnectionButtonText = (userId: string) => {
    const status = userConnections[userId] || 'none';
    switch (status) {
      case 'pending_sent': return 'Requested';
      case 'connected': return 'Disconnect';
      case 'pending_received': return 'Accept';
      default: return 'Connect';
    }
  };

  const getConnectionButtonStyle = (userId: string) => {
    const status = userConnections[userId] || 'none';
    const baseStyle = 'w-full md:min-w-[150px] h-10 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm';

    switch (status) {
      case 'connected':
        return `${baseStyle} bg-slate-500 hover:bg-slate-600 text-white hover:shadow-md`;
      case 'pending_sent':
        return `${baseStyle} bg-slate-500 hover:bg-slate-600 text-white hover:shadow-md`;
      case 'pending_received':
        return `${baseStyle} bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md`;
      default:
        return `${baseStyle} bg-sage hover:bg-sage-dark text-white hover:shadow-md`;
    }
  };

  return (
    <div className="bg-page-bg text-txt-body font-display antialiased min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-5 md:pt-8 pb-8 md:pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-end gap-4">
            <div className="flex items-center p-1 bg-stone-200/50 rounded-xl">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-dark text-white shadow-md">
                <span className="material-symbols-outlined text-[20px]">group</span>
                <span className="font-semibold text-sm">People</span>
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold bg-white/20">
                  {searchResults.people.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Searching..." />
        ) : isOffline && searchResults.people.length === 0 ? (
          <OfflineMessage
            {...getOfflineMessage('search')}
            showRetry={true}
            onRetry={performSearch}
          />
        ) : (
          <>
            {/* People Results */}
            {searchResults.people.length === 0 && !isOffline ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-stone-off flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl text-slate-500">search_off</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">No people found</h3>
                <p className="text-slate-600">Try adjusting your search terms or browse all users.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:gap-3.5 mb-10 md:mb-12">
                {searchResults.people.map((person) => {
                  const connectionStatus = userConnections[person.id] || 'none';

                  if (isMobile) {
                    return (
                      <div key={person.id} className="bg-white rounded-xl border border-card-border p-3.5 shadow-sm">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => onViewProfile(person.id)}
                            className="size-12 rounded-full bg-slate-50 overflow-hidden shrink-0"
                          >
                            <img
                              alt="User"
                              className="w-full h-full object-cover"
                              src={person.avatar_url || '/default-avatar.svg'}
                            />
                          </button>

                          <div className="flex-1 min-w-0">
                            <button
                              className="text-left w-full"
                              onClick={() => onViewProfile(person.id)}
                            >
                              <p className="text-sm leading-snug line-clamp-2 min-h-9">
                                <span className="font-bold text-txt-main">{person.full_name}</span>
                                {(person.title || person.company) && <span className="text-txt-sub"> · </span>}
                                {person.title && <span className="font-medium text-txt-body">{person.title}</span>}
                                {person.title && person.company && <span className="text-txt-sub"> @ </span>}
                                {person.company && <span className="font-medium text-txt-body">{person.company}</span>}
                              </p>
                            </button>

                            <div className="mt-3">
                              <button
                                className={getConnectionButtonStyle(person.id)}
                                onClick={() => handleConnect(person.id)}
                              >
                                {connectionStatus === 'connected' && (
                                  <span className="material-symbols-outlined text-[18px] mr-2">person_remove</span>
                                )}
                                {connectionStatus === 'pending_sent' && (
                                  <span className="material-symbols-outlined text-[18px] mr-2">cancel</span>
                                )}
                                {connectionStatus === 'pending_received' && (
                                  <span className="material-symbols-outlined text-[18px] mr-2">notifications</span>
                                )}
                                {connectionStatus === 'none' && (
                                  <span className="material-symbols-outlined text-[18px] mr-2">person_add</span>
                                )}
                                {getConnectionButtonText(person.id)}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={person.id} className="group bg-white rounded-2xl border border-card-border p-4 shadow-sm hover:border-hairline-strong hover:shadow-sm transition-all duration-300 flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="size-14 rounded-full bg-slate-50 overflow-hidden">
                          <img
                            alt="User"
                            className="w-full h-full object-cover"
                            src={person.avatar_url || '/default-avatar.svg'}
                          />
                        </div>
                        {person.id === 'user4' && (
                          <span className="absolute top-0 right-0 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-base leading-snug line-clamp-2 min-h-10">
                          <span
                            className="font-bold text-txt-main hover:text-primary-sage cursor-pointer transition-colors"
                            onClick={() => onViewProfile(person.id)}
                          >
                            {person.full_name}
                          </span>
                          {(person.title || person.company) && <span className="text-txt-sub"> · </span>}
                          {person.title && <span className="font-medium text-txt-body">{person.title}</span>}
                          {person.title && person.company && <span className="text-txt-sub"> @ </span>}
                          {person.company && <span className="font-medium text-txt-body">{person.company}</span>}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <button
                          className={`${getConnectionButtonStyle(person.id)} !w-auto`}
                          onClick={() => handleConnect(person.id)}
                        >
                          {connectionStatus === 'connected' && (
                            <span className="material-symbols-outlined text-[18px] mr-2">person_remove</span>
                          )}
                          {connectionStatus === 'pending_sent' && (
                            <span className="material-symbols-outlined text-[18px] mr-2">cancel</span>
                          )}
                          {connectionStatus === 'pending_received' && (
                            <span className="material-symbols-outlined text-[18px] mr-2">notifications</span>
                          )}
                          {connectionStatus === 'none' && (
                            <span className="material-symbols-outlined text-[18px] mr-2">person_add</span>
                          )}
                          {getConnectionButtonText(person.id)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SearchResultsPage;
