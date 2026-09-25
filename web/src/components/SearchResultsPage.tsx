import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Bell, Check, Loader2, MapPin, Search, UserPlus, Users, WifiOff, X } from 'lucide-react';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { blockingService } from '../services/blockingService';
import { useAuthContext } from '../contexts/AuthContext';
import { isOnline, getCachedData, setCachedData, getOfflineMessage } from '../utils/offlineUtils';

// The profile fields profileService.searchProfiles selects.
interface SearchPerson {
  id: string;
  full_name?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  connections_count?: number | null;
  verified?: boolean | null;
}

interface SearchResultsPageProps {
  searchQuery: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ searchQuery, onBack, onViewProfile }) => {
  const { user, userConnections, refreshUserConnections, setConnectionStatus } = useAuthContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'connected' | 'pending' | 'none'>('all');
  const [queryInput, setQueryInput] = useState(searchQuery);
  const [personToDisconnect, setPersonToDisconnect] = useState<SearchPerson | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

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
        setConnectionStatus(userId, 'pending_sent'); // Instant UI update
        refreshUserConnections(); // Reconcile with server in the background
      } else if (currentStatus === 'pending_sent') {
        // Cancel connection request
        await connectionService.cancelConnectionRequest(userId);
        setConnectionStatus(userId, 'none');
        refreshUserConnections();
      } else if (currentStatus === 'connected') {
        // Disconnect from user
        await connectionService.cancelConnectionRequest(userId);
        setConnectionStatus(userId, 'none');
        refreshUserConnections();
      } else if (currentStatus === 'pending_received') {
        // Accept the request - redirect to notifications page
        alert('Please go to your Notifications page to accept or decline this connection request.');
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      setActionError("Couldn't update the connection. Please try again.");
    }
  };

  // Wraps the existing connect/cancel/disconnect handler so a card can't be
  // clicked twice while its request is still in flight.
  const runConnect = async (userId: string) => {
    setBusyId(userId);
    await handleConnect(userId);
    setBusyId(null);
  };

  const statusOf = (userId: string) => userConnections[userId] || 'none';
  const people = searchResults.people;
  const counts = {
    all: people.length,
    connected: people.filter((p) => statusOf(p.id) === 'connected').length,
    pending: people.filter((p) => ['pending_sent', 'pending_received'].includes(statusOf(p.id))).length,
    none: people.filter((p) => !['connected', 'pending_sent', 'pending_received'].includes(statusOf(p.id))).length,
  };
  const visiblePeople = people.filter((p) => {
    const status = statusOf(p.id);
    if (filter === 'connected') return status === 'connected';
    if (filter === 'pending') return status === 'pending_sent' || status === 'pending_received';
    if (filter === 'none') return !['connected', 'pending_sent', 'pending_received'].includes(status);
    return true;
  });
  const filters: { id: typeof filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'connected', label: 'Connected', count: counts.connected },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'none', label: 'Not connected', count: counts.none },
  ];
  const emptyFilterCopy: Record<string, string> = {
    connected: 'None of these results are connections yet',
    pending: 'No pending requests in these results',
    none: "You're already connected with everyone here",
  };

  const highlight = (text: string) => {
    const term = searchQuery.trim();
    const index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <mark className="rounded bg-ink-wash px-0.5 text-primary-hover">{text.slice(index, index + term.length)}</mark>
        {text.slice(index + term.length)}
      </>
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = queryInput.trim();
    if (!next) return;
    if (next === searchQuery) {
      performSearch();
      return;
    }
    navigate(`/search-results?q=${encodeURIComponent(next)}`);
  };

  const offlineCopy = getOfflineMessage('search');
  const firstNameOf = (person: SearchPerson) => (person.full_name || 'this person').split(' ')[0];

  const renderAvatar = (person: SearchPerson) => {
    const name: string = person.full_name || '';
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase() || '?';
    return (
      <button
        type="button"
        onClick={() => onViewProfile(person.id)}
        className="relative shrink-0"
        aria-label={`View ${name || 'this person'}'s profile`}
      >
        {person.avatar_url ? (
          <img alt="" className="size-[52px] rounded-full object-cover" src={person.avatar_url} />
        ) : (
          <span className="size-[52px] rounded-full bg-ink-wash text-primary-hover font-display font-extrabold text-[17px] flex items-center justify-center">
            {initials}
          </span>
        )}
        {person.verified && (
          <span title="Verified" className="absolute -right-0.5 -bottom-0.5 size-[19px] rounded-full bg-primary border-2 border-white text-white flex items-center justify-center">
            <Check className="h-2.5 w-2.5" strokeWidth={4} />
          </span>
        )}
      </button>
    );
  };

  const renderStatusChip = (status: string) => {
    if (status === 'connected') {
      return (
        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-1 text-[11px] font-bold text-success-ink">
          <Check className="h-3 w-3" strokeWidth={3} />
          Connected
        </span>
      );
    }
    if (status === 'pending_sent') {
      return <span className="shrink-0 whitespace-nowrap rounded-full bg-ink-wash px-2.5 py-1 text-[11px] font-bold text-primary-hover">Request sent</span>;
    }
    if (status === 'pending_received') {
      return <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-tint px-2.5 py-1 text-[11px] font-bold text-amber-ink">Wants to connect</span>;
    }
    return null;
  };

  const primaryClass = 'flex-1 h-10 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2';
  const outlineClass = 'flex-1 h-10 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-ink hover:bg-parchment-sunken transition-colors disabled:opacity-60 flex items-center justify-center gap-2';

  const renderActions = (person: SearchPerson) => {
    const status = statusOf(person.id);
    const isBusy = busyId === person.id;
    const viewProfile = (
      <button type="button" className={outlineClass} onClick={() => onViewProfile(person.id)}>
        View profile
      </button>
    );

    if (status === 'connected') {
      return (
        <>
          {viewProfile}
          <button
            type="button"
            className="h-10 px-3 rounded-xl text-[12.5px] font-bold text-red-600 hover:bg-danger-tint transition-colors disabled:opacity-60"
            onClick={() => setPersonToDisconnect(person)}
            disabled={isBusy}
          >
            Disconnect
          </button>
        </>
      );
    }
    if (status === 'pending_sent') {
      return (
        <>
          <button type="button" className={outlineClass} onClick={() => runConnect(person.id)} disabled={isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Cancel request
          </button>
          {viewProfile}
        </>
      );
    }
    if (status === 'pending_received') {
      return (
        <>
          <button type="button" className={primaryClass} onClick={() => navigate('/notifications')}>
            <Bell className="h-4 w-4" />
            Respond
          </button>
          {viewProfile}
        </>
      );
    }
    return (
      <>
        <button type="button" className={primaryClass} onClick={() => runConnect(person.id)} disabled={isBusy}>
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Connect
        </button>
        {viewProfile}
      </>
    );
  };

  const renderPerson = (person: SearchPerson) => (
    <div key={person.id} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col gap-3.5">
      <div className="flex items-start gap-3">
        {renderAvatar(person)}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="min-w-0 text-left text-[15px] font-bold text-ink hover:text-primary transition-colors truncate"
              onClick={() => onViewProfile(person.id)}
            >
              {highlight(person.full_name || 'Unknown')}
            </button>
            {renderStatusChip(statusOf(person.id))}
          </div>
          {(person.title || person.company) && (
            <p className="text-[12.5px] text-slate-600">
              {person.title && highlight(person.title)}
              {person.title && person.company && ' at '}
              {person.company && highlight(person.company)}
            </p>
          )}
          {(person.location || (person.connections_count ?? 0) > 0) && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11.5px] text-slate-500">
              {person.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{person.location}</span>
              )}
              {(person.connections_count ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 shrink-0" />
                  {person.connections_count} {person.connections_count === 1 ? 'connection' : 'connections'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {person.bio && <p className="text-[12.5px] leading-relaxed text-slate-500 line-clamp-2">{person.bio}</p>}
      <div className="flex gap-2 mt-auto">{renderActions(person)}</div>
    </div>
  );

  const renderSkeleton = (key: number) => (
    <div key={key} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5 animate-pulse" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="size-[52px] rounded-full bg-parchment-sunken" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3 w-3/5 rounded bg-parchment-sunken" />
          <div className="h-2.5 w-4/5 rounded bg-parchment-sunken" />
          <div className="h-2.5 w-2/5 rounded bg-parchment-sunken" />
        </div>
      </div>
      <div className="h-2.5 w-full rounded bg-parchment-sunken" />
      <div className="flex gap-2">
        <div className="flex-1 h-10 rounded-xl bg-parchment-sunken" />
        <div className="flex-1 h-10 rounded-xl bg-parchment-sunken" />
      </div>
    </div>
  );

  return (
    <div className="bg-parchment font-display antialiased min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-8 pb-10 md:pb-12 flex flex-col gap-4 md:gap-5">
        {/* Phones don't get the site header here, so search and Back live on the page */}
        <form onSubmit={handleSearchSubmit} className="md:hidden flex items-center gap-2" role="search">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="size-10 shrink-0 rounded-xl border border-slate-200 bg-white text-ink flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              enterKeyHint="search"
              aria-label="Search people"
              placeholder="Search people"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="w-full h-10 pl-9 pr-9 rounded-xl border-[1.5px] border-slate-200 bg-white text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none"
            />
            {queryInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQueryInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-full text-slate-400 hover:text-ink flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 md:gap-4">
          <header className="flex flex-col gap-1 min-w-0">
            <h1 className="font-display text-xl md:text-[28px] font-extrabold text-ink break-words">Results for “{searchQuery}”</h1>
            <p className="text-[13px] md:text-sm text-slate-500">
              {loading ? (
                'Searching…'
              ) : (
                <><strong className="text-ink">{people.length} {people.length === 1 ? 'person' : 'people'}</strong> {people.length === 1 ? 'matches' : 'match'} by name, job title or company</>
              )}
            </p>
          </header>

          {!loading && people.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {filters.map((item) => {
                const isActive = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilter(item.id)}
                    className={`shrink-0 flex items-center gap-2 h-9 md:h-[38px] px-3.5 rounded-full border text-[12.5px] md:text-[13px] font-bold transition-colors ${isActive
                      ? 'bg-ink border-ink text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                  >
                    {item.label}
                    <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-parchment-sunken text-slate-500'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isOffline && people.length > 0 && !loading && (
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-tint px-4 py-3 text-[12.5px] font-semibold text-amber-ink" role="status">
            <WifiOff className="h-4 w-4 shrink-0" />
            You're offline — showing results saved from your last search.
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Searching">
            {[0, 1, 2].map(renderSkeleton)}
          </div>
        ) : isOffline && people.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 flex flex-col items-center gap-2.5 text-center">
            <span className="size-14 rounded-full bg-amber-tint text-amber-ink flex items-center justify-center mb-1"><WifiOff className="h-6 w-6" /></span>
            <p className="font-display text-lg font-extrabold text-ink">{offlineCopy.title}</p>
            <p className="text-[13.5px] leading-relaxed text-slate-500 max-w-md">{offlineCopy.message}</p>
            <button
              type="button"
              onClick={performSearch}
              className="mt-2 h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors"
            >
              Try again
            </button>
          </div>
        ) : people.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 flex flex-col items-center gap-2.5 text-center">
            <span className="size-14 rounded-full bg-parchment-sunken text-slate-400 flex items-center justify-center mb-1"><Search className="h-6 w-6" /></span>
            <p className="font-display text-lg font-extrabold text-ink break-words">No one matches “{searchQuery}”</p>
            <ul className="flex flex-col gap-1 text-[13.5px] text-slate-500">
              <li>Check the spelling</li>
              <li>Search by a full name, a job title or a company</li>
            </ul>
            <button type="button" onClick={() => navigate('/jobs')} className="mt-1.5 text-[13px] font-bold text-primary hover:underline">
              Looking for roles instead? Browse jobs
            </button>
          </div>
        ) : visiblePeople.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-10 flex flex-col items-center gap-2 text-center">
            <p className="font-display text-base font-extrabold text-ink">{emptyFilterCopy[filter]}</p>
            <button type="button" onClick={() => setFilter('all')} className="text-[13px] font-bold text-primary hover:underline">
              Show all results
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePeople.map(renderPerson)}
            </div>
          </>
        )}
      </main>

      {/* Disconnect asks first — a bottom sheet on phones, a dialog elsewhere */}
      {personToDisconnect && (
        <div
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-ink/45"
          onClick={() => setPersonToDisconnect(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="disconnect-title"
            className="w-full md:max-w-sm bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center gap-2.5">
              <span className="size-14 rounded-full bg-success-tint text-success-ink font-display font-extrabold text-lg flex items-center justify-center">
                {(personToDisconnect.full_name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase()}
              </span>
              <h2 id="disconnect-title" className="font-display text-lg font-extrabold text-ink">Disconnect from {firstNameOf(personToDisconnect)}?</h2>
              <p className="text-[13.5px] leading-relaxed text-slate-500">
                You'll need to send a new request to connect with <strong className="text-ink">{personToDisconnect.full_name}</strong> again.
              </p>
            </div>
            <div className="flex flex-col-reverse md:flex-row gap-2.5 px-5 pt-1 pb-6 md:py-4 md:border-t md:border-slate-100 md:bg-parchment">
              <button
                type="button"
                autoFocus
                onClick={() => setPersonToDisconnect(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-parchment-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const userId = personToDisconnect.id;
                  setPersonToDisconnect(null);
                  runConnect(userId);
                }}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="fixed inset-x-4 bottom-5 z-[110] flex justify-center pointer-events-none">
          <div role="alert" className="pointer-events-auto flex items-center gap-2.5 max-w-md w-full rounded-xl bg-ink px-4 py-3 text-[13px] text-white shadow-xl">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
            <span className="flex-1">{actionError}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
