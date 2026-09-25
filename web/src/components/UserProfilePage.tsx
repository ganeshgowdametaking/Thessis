import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BadgeCheck, Ban, Bell, Check, Eye, Loader2, MapPin, MessageSquare, MoreHorizontal, Trophy, UserMinus, UserPlus, Users, UserX, WifiOff, X } from 'lucide-react';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { messageService } from '../services/messageService';
import { blockingService } from '../services/blockingService';
import { useAuthContext } from '../contexts/AuthContext';
import { isOnline, getCachedData, setCachedData, getOfflineMessage } from '../utils/offlineUtils';
import { ProfileTimelineItem, formatProfileDate, formatProfileDateRange } from './ProfileTimelineItem';
import type { Experience, Education, Skill, Achievement } from '../types/profileSections';

interface UserProfilePageProps {
  userId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ userId, onBack, onViewProfile }) => {
  const { user, userConnections, refreshUserConnections, setConnectionStatus } = useAuthContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Local connectionStatus removed in favor of global context
  const connectionStatus = userConnections[userId] || 'none';
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'block' | 'disconnect' | null>(null);
  const [connectionsCount, setConnectionsCount] = useState(0);

  // Use actual data from profile instead of hardcoded mock data
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (userId) {
      connectionService
        .getConnectionsForUser(userId)
        .then((connections) => setConnectionsCount(connections.length))
        .catch(() => {
          // Keep the count at 0 silently on failure.
        });
    }
  }, [userId]);

  const tryParseJson = (value: string): unknown => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const parsePgJsonArrayLiteral = (value: string): unknown[] => {
    if (!(value.startsWith('{') && value.endsWith('}'))) return [];

    const matches = value.match(/"((?:\\.|[^"\\])*)"/g);
    if (!matches) return [];

    return matches
      .map((entry) => {
        const unquoted = entry
          .slice(1, -1)
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');

        return tryParseJson(unquoted) ?? unquoted;
      })
      .filter((entry) => entry !== null && entry !== undefined);
  };

  const toArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;

    if (typeof value === 'string') {
      const parsed = tryParseJson(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];

      const pgParsed = parsePgJsonArrayLiteral(value);
      if (pgParsed.length > 0) return pgParsed;
    }

    return [];
  };

  function normalizeSectionItems<T extends Record<string, any>>(value: unknown): Array<T & { id: number | string }> {
    const sourceItems = toArray(value);

    return sourceItems
      .map((item) => {
        if (item && typeof item === 'object') return item;
        if (typeof item !== 'string') return null;

        const parsed = tryParseJson(item) ?? tryParseJson(item.replace(/\\"/g, '"'));
        return parsed && typeof parsed === 'object' ? parsed : null;
      })
      .filter((item): item is T & { id?: number | string } => Boolean(item))
      .map((item, index) => {
        const normalizedItem = item as T & { id?: number | string };
        return {
          ...normalizedItem,
          id: normalizedItem.id ?? `${Date.now()}-${index}`,
        };
      });
  }

  const getNormalizedProfileSections = (source: any) => ({
    experiences: normalizeSectionItems<Experience>(source?.experiences),
    education: normalizeSectionItems<Education>(source?.education),
    skills: normalizeSectionItems<Skill>(source?.skills),
    achievements: normalizeSectionItems<Achievement>(source?.achievements),
  });

  // Click outside handler to close the actions menu
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

  useEffect(() => {
    loadUserProfile();
    // loadConnectionStatus no longer needed (comes from context)
    loadBlockingStatus();
  }, [userId]);

  const loadUserProfile = async () => {
    console.log('Loading profile for userId:', userId);
    try {
      setLoading(true);

      // Check if there's a blocking relationship first
      const hasBlocking = await blockingService.hasBlockingRelationship(userId);
      if (hasBlocking) {
        console.log('User is blocked or has blocked current user, denying access');
        setProfile(null);
        setExperiences([]);
        setEducation([]);
        setSkills([]);
        setAchievements([]);
        setLoading(false);
        return;
      }

      // Check if offline first
      if (!isOnline()) {
        console.log('Device is offline, checking cache...');
        const cachedProfile = getCachedData(`profile_${userId}`);
        if (cachedProfile) {
          console.log('Using cached profile data');
          const normalizedSections = getNormalizedProfileSections(cachedProfile);
          setProfile(cachedProfile.profile);
          setExperiences(normalizedSections.experiences as Experience[]);
          setEducation(normalizedSections.education as Education[]);
          setSkills(normalizedSections.skills as Skill[]);
          setAchievements(normalizedSections.achievements as Achievement[]);
        } else {
          console.log('No cached profile available');
          setProfile(null);
        }
        setIsOffline(true);
        return;
      }

      // Online - try to load real profile data
      try {
        const userProfile = await profileService.getProfile(userId);
        console.log('Raw profile data from database:', userProfile);

        if (userProfile) {
          console.log('Loaded real profile:', userProfile);
          setProfile(userProfile);

          // Check if the profile has the extended data fields
          console.log('Profile experiences:', userProfile.experiences);
          console.log('Profile education:', userProfile.education);
          console.log('Profile skills:', userProfile.skills);
          console.log('Profile achievements:', userProfile.achievements);

          // Use real data if available, otherwise show empty sections
          const normalizedSections = getNormalizedProfileSections(userProfile);
          const experiences = normalizedSections.experiences as Experience[];
          const education = normalizedSections.education as Education[];
          const skills = normalizedSections.skills as Skill[];
          const achievements = normalizedSections.achievements as Achievement[];

          setExperiences(experiences);
          setEducation(education);
          setSkills(skills);
          setAchievements(achievements);

          // Cache the profile data for offline use
          setCachedData(`profile_${userId}`, {
            profile: userProfile,
            experiences,
            education,
            skills,
            achievements
          });

          return; // Exit early if we got real data
        }
      } catch (profileError) {
        console.log('Error loading real profile:', profileError);

        // Try cached data on error
        const cachedProfile = getCachedData(`profile_${userId}`);
        if (cachedProfile) {
          console.log('Using cached profile due to error');
          const normalizedSections = getNormalizedProfileSections(cachedProfile);
          setProfile(cachedProfile.profile);
          setExperiences(normalizedSections.experiences as Experience[]);
          setEducation(normalizedSections.education as Education[]);
          setSkills(normalizedSections.skills as Skill[]);
          setAchievements(normalizedSections.achievements as Achievement[]);
          return;
        }
      }

      // No real profile found and no cache - show as unavailable
      console.log('No profile data available for userId:', userId);
      setProfile(null);
      setExperiences([]);
      setEducation([]);
      setSkills([]);
      setAchievements([]);

    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      setProfile(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  // loadConnectionStatus removed: using userConnections from context

  const loadBlockingStatus = async () => {
    if (userId === user?.id) return;

    try {
      const blocked = await blockingService.isUserBlocked(userId);
      setIsBlocked(blocked);
    } catch (error) {
      console.error('Error loading blocking status:', error);
      setIsBlocked(false);
    }
  };

  const handleConnect = async () => {
    if (!user || userId === user.id) return;
    const theirName = (profile?.full_name?.trim() || 'them').split(' ')[0];
    try {
      setConnectionLoading(true);

      if (connectionStatus === 'none') {
        // Send connection request
        await connectionService.sendConnectionRequest(userId);
        setConnectionStatus(userId, 'pending_sent'); // Instant UI update
        refreshUserConnections(); // Reconcile with server in the background
        setToast({ tone: 'success', text: `Connection request sent to ${theirName}.` });
      } else if (connectionStatus === 'pending_sent') {
        // Cancel connection request
        await connectionService.cancelConnectionRequest(userId);
        setConnectionStatus(userId, 'none');
        refreshUserConnections();
        setToast({ tone: 'success', text: 'Request cancelled.' });
      } else if (connectionStatus === 'connected') {
        // Disconnect from user
        await connectionService.cancelConnectionRequest(userId);
        setConnectionStatus(userId, 'none');
        refreshUserConnections();
        setToast({ tone: 'success', text: `You're no longer connected with ${theirName}.` });
      } else if (connectionStatus === 'pending_received') {
        // Respond to the request from the notifications page
        navigate('/notifications');
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      setToast({ tone: 'error', text: "Couldn't update the connection. Please try again." });
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user || userId === user.id) return;

    try {
      // Navigate to messages page with user ID - don't create conversation yet
      navigate(`/messages?user=${encodeURIComponent(userId)}`, {
        state: {
          selectedApplicant: userId,
          msgNavTs: Date.now() // Add timestamp to ensure navigation happens
        }
      });

    } catch (error) {
      console.error('Error navigating to messages:', error);
      alert('Failed to open conversation. Please try again.');
    }
  };

  const handleBlock = async () => {
    if (!user || userId === user.id) return;

    try {
      setBlockLoading(true);
      setShowActionsMenu(false);

      if (isBlocked) {
        // Unblock the user
        await blockingService.unblockUser(userId);
        setIsBlocked(false);
        console.log('User unblocked successfully');
        setToast({ tone: 'success', text: 'Unblocked.' });
        if (!profile) loadUserProfile();
      } else {
        // Block the user
        await blockingService.blockUser(userId);
        setIsBlocked(true);
        console.log('User blocked successfully');
      }
    } catch (error) {
      console.error('Error handling block/unblock:', error);
      setToast({ tone: 'error', text: "Couldn't update the block. Please try again." });
    } finally {
      setBlockLoading(false);
    }
  };

  const formatConnectionsCount = (count?: number) => {
    const value = typeof count === 'number' ? count : 0;
    if (value < 1000) return String(value);
    return `${(value / 1000).toFixed(2).replace(/\.?0+$/, '')}k`;
  };

  const isSelf = userId === user?.id;
  const firstName = (profile?.full_name?.trim() || profile?.username?.trim() || 'this person').split(' ')[0];

  const renderStateCard = (icon: React.ReactNode, tone: string, title: string, body: string, buttons: React.ReactNode) => (
    <div className="bg-parchment min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 md:px-6 py-4 md:py-8 flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="self-start flex items-center gap-1.5 text-[13px] font-bold text-slate-600 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-14 flex flex-col items-center gap-2.5 text-center">
          <span className={`size-14 rounded-full flex items-center justify-center mb-1 ${tone}`}>{icon}</span>
          <h1 className="font-display text-lg font-extrabold text-ink">{title}</h1>
          <p className="text-[13.5px] leading-relaxed text-slate-500 max-w-sm">{body}</p>
          <div className="flex gap-2 mt-2">{buttons}</div>
        </div>
      </main>
    </div>
  );

  const outlineButtonClass = 'h-10 px-4 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-ink hover:bg-parchment-sunken transition-colors flex items-center justify-center gap-2 disabled:opacity-60';
  const primaryButtonClass = 'h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-60';

  if (loading) {
    return (
      <div className="bg-parchment min-h-screen">
        <main className="w-full max-w-[1120px] mx-auto px-4 md:px-6 py-4 md:py-8 flex flex-col gap-5 animate-pulse" role="status" aria-label="Loading profile">
          <div className="h-4 w-14 rounded bg-parchment-sunken" />
          <div className="bg-white border border-slate-200 rounded-[22px] overflow-hidden">
            <div className="h-28 md:h-44 bg-parchment-sunken" />
            <div className="px-4 md:px-8 pb-7 flex flex-col gap-3">
              <div className="-mt-11 md:-mt-14 size-[84px] md:size-28 rounded-full bg-slate-200 ring-4 ring-white" />
              <div className="h-6 w-48 rounded bg-parchment-sunken" />
              <div className="h-3.5 w-64 rounded bg-parchment-sunken" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Blocked people stay hidden, but you can always undo it from here.
  if (isBlocked && !isSelf) {
    return renderStateCard(
      <Ban className="h-6 w-6" />,
      'bg-danger-tint text-red-600',
      "You've blocked this person",
      "Their profile is hidden while they're blocked.",
      <>
        <button type="button" onClick={handleBlock} className={outlineButtonClass} disabled={blockLoading}>
          {blockLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Unblock
        </button>
        <button type="button" onClick={onBack} className={outlineButtonClass}>Go back</button>
      </>
    );
  }

  // Show offline message if offline and no profile data
  if (isOffline && !profile) {
    const offlineCopy = getOfflineMessage('profile');
    return renderStateCard(
      <WifiOff className="h-6 w-6" />,
      'bg-amber-tint text-amber-ink',
      offlineCopy.title,
      offlineCopy.message,
      <button type="button" onClick={loadUserProfile} className={primaryButtonClass}>Try again</button>
    );
  }

  // Show not found message if no profile data available
  if (!profile) {
    return renderStateCard(
      <UserX className="h-6 w-6" />,
      'bg-parchment-sunken text-slate-500',
      'Profile not found',
      "This profile doesn't exist or isn't available.",
      <button type="button" onClick={onBack} className={primaryButtonClass}>Go back</button>
    );
  }

  const displayName = profile.full_name?.trim() || profile.username?.trim() || 'User';
  const bio = profile.bio?.trim() || '';
  const roleLine = [profile.title, profile.company].filter(Boolean).join(' at ');
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  const visibleExperiences = experiences.filter((exp) => exp.title?.trim() || exp.company?.trim());
  const visibleEducation = education.filter((edu) => edu.degree?.trim() || edu.school?.trim());
  const visibleSkills = skills.filter((skill) => skill.name?.trim());
  const visibleAchievements = achievements.filter((item) => item.title?.trim() || item.organization?.trim());
  const hasMainSections = visibleExperiences.length > 0 || visibleEducation.length > 0;
  const hasSideSections = visibleSkills.length > 0 || visibleAchievements.length > 0;

  const statusChip =
    connectionStatus === 'connected' ? (
      <span className="inline-flex items-center gap-1 h-10 px-3 rounded-xl bg-success-tint text-success-ink text-[12.5px] font-bold whitespace-nowrap">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
        Connected
      </span>
    ) : connectionStatus === 'pending_sent' ? (
      <span className="inline-flex items-center h-10 px-3 rounded-xl bg-ink-wash text-primary-hover text-[12.5px] font-bold whitespace-nowrap">Request sent</span>
    ) : connectionStatus === 'pending_received' ? (
      <span className="inline-flex items-center h-10 px-3 rounded-xl bg-amber-tint text-amber-ink text-[12.5px] font-bold whitespace-nowrap">Wants to connect</span>
    ) : null;

  const messageButton = (primary: boolean) => (
    <button type="button" className={`${primary ? primaryButtonClass : outlineButtonClass} flex-1 sm:flex-none`} onClick={handleMessage}>
      <MessageSquare className="h-4 w-4" />
      Message
    </button>
  );

  const renderViewerActions = () => {
    let connectControl: React.ReactNode = null;
    if (connectionStatus === 'none') {
      connectControl = (
        <button type="button" className={`${primaryButtonClass} flex-1 sm:flex-none`} onClick={handleConnect} disabled={connectionLoading}>
          {connectionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Connect
        </button>
      );
    } else if (connectionStatus === 'pending_sent') {
      connectControl = (
        <button type="button" className={`${outlineButtonClass} flex-1 sm:flex-none`} onClick={handleConnect} disabled={connectionLoading}>
          {connectionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Cancel request
        </button>
      );
    } else if (connectionStatus === 'pending_received') {
      connectControl = (
        <button type="button" className={`${primaryButtonClass} flex-1 sm:flex-none`} onClick={handleConnect}>
          <Bell className="h-4 w-4" />
          Respond
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {statusChip && <span className="hidden sm:inline-flex">{statusChip}</span>}
        {connectControl}
        {messageButton(connectionStatus === 'connected')}
        <div className="relative" ref={actionsMenuRef}>
          <button
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={showActionsMenu}
            className="size-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-parchment-sunken transition-colors flex items-center justify-center"
            onClick={() => setShowActionsMenu(!showActionsMenu)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showActionsMenu && (
            <>
              <div className="fixed inset-0 z-40 bg-ink/45 md:hidden" onClick={() => setShowActionsMenu(false)} aria-hidden="true" />
              <div
                role="menu"
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-3 pt-3 pb-6 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-60 md:rounded-2xl md:p-1.5 md:pb-1.5 md:border md:border-slate-200 md:shadow-xl"
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
                {connectionStatus === 'connected' && (
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-3.5 md:py-2.5 rounded-xl text-sm md:text-[13px] font-semibold text-ink hover:bg-parchment-sunken"
                    onClick={() => {
                      setShowActionsMenu(false);
                      setConfirmAction('disconnect');
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                    Disconnect
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3 py-3.5 md:py-2.5 rounded-xl text-sm md:text-[13px] font-semibold text-red-600 hover:bg-danger-tint"
                  onClick={() => {
                    setShowActionsMenu(false);
                    setConfirmAction('block');
                  }}
                >
                  <Ban className="h-4 w-4" />
                  Block {firstName}
                </button>
                <button
                  type="button"
                  className="md:hidden w-full h-12 mt-2 rounded-xl border border-slate-200 text-sm font-bold text-ink"
                  onClick={() => setShowActionsMenu(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderCard = (title: string, body: React.ReactNode) => (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
      <h2 className="font-display text-[17px] font-extrabold text-ink">{title}</h2>
      {body}
    </section>
  );

  return (
    <div className="bg-parchment min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 md:px-6 py-4 md:py-8 flex flex-col gap-4 md:gap-5">
        <button
          type="button"
          onClick={onBack}
          className="self-start flex items-center gap-1.5 text-[13px] font-bold text-slate-600 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="bg-white border border-slate-200 rounded-2xl md:rounded-[22px] overflow-hidden">
          {isSelf && (
            <div className="flex items-center gap-2.5 px-4 md:px-6 py-3 bg-ink-wash text-primary-hover text-[13px] font-semibold">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="flex-1">This is how other members see your profile.</span>
              <button type="button" onClick={() => navigate('/profile')} className="shrink-0 font-bold hover:underline">
                Edit profile
              </button>
            </div>
          )}
          <div
            className="h-28 md:h-44 bg-center bg-cover bg-no-repeat"
            style={{
              backgroundImage: profile.cover_image_url
                ? `url("${profile.cover_image_url}")`
                : 'linear-gradient(135deg, #4353FF 0%, #7C86FF 55%, #C7CCFF 100%)',
            }}
          />
          <div className="px-4 pb-5 md:px-8 md:pb-7 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-11 md:-mt-14">
              <div className="relative z-[1] self-start shrink-0 rounded-full ring-4 md:ring-[5px] ring-white bg-white">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="size-[84px] md:size-28 rounded-full object-cover" />
                ) : (
                  <span className="size-[84px] md:size-28 rounded-full bg-ink-wash text-primary-hover font-display font-extrabold text-[26px] md:text-[34px] flex items-center justify-center">
                    {initials || <UserX className="h-8 w-8" />}
                  </span>
                )}
              </div>
              {!isSelf && <div className="sm:pb-1 order-last sm:order-none">{renderViewerActions()}</div>}
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-[22px] md:text-[28px] font-extrabold text-ink leading-tight flex items-center gap-2">
                {displayName}
                {profile?.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-white fill-primary" aria-label="Verified" />}
              </h1>
              {roleLine && <p className="text-sm md:text-[15px] font-semibold text-slate-600">{roleLine}</p>}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-1 text-[12.5px] md:text-[13px] text-slate-500">
                {profile.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{profile.location}</span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <strong className="text-ink">{formatConnectionsCount(connectionsCount)}</strong> {connectionsCount === 1 ? 'connection' : 'connections'}
                </span>
              </div>
              {!isSelf && statusChip && <span className="sm:hidden mt-1">{statusChip}</span>}
            </div>

            {bio && <p className="text-[13.5px] md:text-[14.5px] leading-relaxed text-slate-600 max-w-3xl whitespace-pre-line">{bio}</p>}
          </div>
        </section>

        {!hasMainSections && !hasSideSections ? (
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 flex flex-col items-center gap-2 text-center">
            <span className="size-14 rounded-full bg-ink-wash text-primary flex items-center justify-center mb-1"><Users className="h-6 w-6" /></span>
            <p className="font-display text-lg font-extrabold text-ink">{firstName} hasn't filled in their profile yet</p>
            <p className="text-[13.5px] text-slate-500 max-w-sm">Experience, education and skills will show here once they add them.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 md:gap-5 items-start">
            {hasMainSections && (
              <div className="w-full flex-1 min-w-0 flex flex-col gap-4 md:gap-5">
                {visibleExperiences.length > 0 && renderCard('Experience', (
                  <div className="flex flex-col gap-5">
                    {visibleExperiences.map((exp, index) => (
                      <ProfileTimelineItem
                        key={exp.id}
                        logoName={exp.company}
                        heading={exp.title || exp.company}
                        subheading={exp.title ? exp.company : ''}
                        meta={exp.location}
                        dates={formatProfileDateRange(exp.startDate, exp.endDate, exp.current)}
                        description={exp.description}
                        isLast={index === visibleExperiences.length - 1}
                      />
                    ))}
                  </div>
                ))}
                {visibleEducation.length > 0 && renderCard('Education', (
                  <div className="flex flex-col gap-5">
                    {visibleEducation.map((edu, index) => (
                      <ProfileTimelineItem
                        key={edu.id}
                        logoName={edu.school}
                        heading={edu.degree || edu.school}
                        subheading={edu.degree ? edu.school : ''}
                        meta={edu.gpa?.trim() ? `GPA ${edu.gpa}` : ''}
                        dates={formatProfileDateRange(edu.startDate, edu.endDate, false)}
                        description={edu.description}
                        isLast={index === visibleEducation.length - 1}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {hasSideSections && (
              <aside className={`w-full ${hasMainSections ? 'lg:w-[360px]' : ''} shrink-0 flex flex-col gap-4 md:gap-5`}>
                {visibleSkills.length > 0 && renderCard('Skills', (
                  <div className="flex flex-wrap gap-2">
                    {visibleSkills.map((skill) => (
                      <span key={skill.id} className="rounded-full bg-ink-wash px-3 py-1.5 text-[12.5px] font-bold text-primary-hover">{skill.name}</span>
                    ))}
                  </div>
                ))}
                {visibleAchievements.length > 0 && renderCard('Achievements', (
                  <div className="flex flex-col gap-4">
                    {visibleAchievements.map((achievement) => (
                      <div key={achievement.id} className="flex gap-3">
                        <span className="size-[38px] shrink-0 rounded-[11px] bg-amber-tint text-amber-ink flex items-center justify-center">
                          <Trophy className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <p className="text-sm font-bold text-ink">{achievement.title}</p>
                          <p className="text-[12.5px] text-slate-600">
                            {[achievement.organization, achievement.date ? formatProfileDate(achievement.date) : ''].filter(Boolean).join(' · ')}
                          </p>
                          {achievement.description?.trim() && (
                            <p className="text-[12.5px] leading-snug text-slate-500 mt-0.5">{achievement.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </aside>
            )}
          </div>
        )}
      </main>

      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-ink/45" onClick={() => setConfirmAction(null)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full md:max-w-sm bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center gap-2.5">
              <span className="size-14 rounded-full bg-danger-tint text-red-600 flex items-center justify-center">
                {confirmAction === 'block' ? <Ban className="h-6 w-6" /> : <UserMinus className="h-6 w-6" />}
              </span>
              <h2 id="confirm-title" className="font-display text-lg font-extrabold text-ink">
                {confirmAction === 'block' ? `Block ${displayName}?` : `Disconnect from ${firstName}?`}
              </h2>
              <p className="text-[13.5px] leading-relaxed text-slate-500">
                {confirmAction === 'block'
                  ? `${firstName}'s profile will be hidden from you. For now, blocking is only saved in this browser — ${firstName} can still find and message you.`
                  : "You'll need to send a new request to connect again."}
              </p>
            </div>
            <div className="flex flex-col-reverse md:flex-row gap-2.5 px-5 pt-1 pb-6 md:py-4 md:border-t md:border-slate-100 md:bg-parchment">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmAction(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-parchment-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === 'block') handleBlock();
                  else handleConnect();
                }}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                {confirmAction === 'block' ? 'Block' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-5 z-[110] flex justify-center pointer-events-none">
          <div role="status" className="pointer-events-auto flex items-center gap-2.5 max-w-md w-full rounded-xl bg-ink px-4 py-3 text-[13px] text-white shadow-xl">
            {toast.tone === 'success' ? <Check className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={3} /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />}
            <span className="flex-1">{toast.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="shrink-0 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
