import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { messageService } from '../services/messageService';
import { blockingService } from '../services/blockingService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import OfflineMessage from './OfflineMessage';
import { isOnline, getCachedData, setCachedData, getOfflineMessage } from '../utils/offlineUtils';
import { supabase } from '../lib/supabase';
import BackArrowIcon from './icons/BackArrowIcon';

interface UserProfilePageProps {
  userId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

interface Experience {
  id: number | string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  logo: string;
}

interface Education {
  id: number | string;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  description: string;
  gpa: string;
}

interface Skill {
  id: number | string;
  name: string;
  level: number;
  category: string;
}

interface Achievement {
  id: number | string;
  title: string;
  organization: string;
  date: string;
  type: string;
  description: string;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ userId, onBack, onViewProfile }) => {
  const { user, userConnections, refreshUserConnections } = useAuthContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Local connectionStatus removed in favor of global context
  const connectionStatus = userConnections[userId] || 'none';
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [realCounts, setRealCounts] = useState({
    connections: 0,
    expYears: 0,
    rating: 5.0
  });
  const [isOffline, setIsOffline] = useState(!isOnline());

  // Use actual data from profile instead of hardcoded mock data
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

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
    loadRealCounts();
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

          // Load real counts with the profile data
          loadRealCounts(userProfile);
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

  const loadRealCounts = async (userProfile?: any) => {
    try {
      // 1. Count connections
      const { count, error } = await supabase
        .from('connections')
        .select('*', { count: 'planned', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) throw error;
      const connectionsCount = count || 0;

      // 2. Calculate experience from profile (passed in or from state)
      const targetProfile = userProfile || profile;
      let totalMonths = 0;

      if (targetProfile && Array.isArray(targetProfile.experiences)) {
        targetProfile.experiences.forEach((exp: any) => {
          if (exp.startDate) {
            const start = new Date(exp.startDate);
            const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
            const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            totalMonths += Math.max(0, months);
          }
        });
      }

      const expYears = Math.floor(totalMonths / 12);

      // 3. Rating dynamic placeholder based on connections
      const baseRating = 4.5;
      const rating = Math.min(5.0, baseRating + (connectionsCount * 0.1)).toFixed(1);

      setRealCounts({
        connections: connectionsCount,
        expYears,
        rating: parseFloat(rating)
      });
    } catch (error) {
      console.error('Error loading real counts:', error);
    }
  };

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
    try {
      setConnectionLoading(true);

      if (connectionStatus === 'none') {
        // Send connection request
        await connectionService.sendConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        refreshUserConnections(); // Update global state
      } else if (connectionStatus === 'pending_sent') {
        // Cancel connection request
        await connectionService.cancelConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        refreshUserConnections(); // Update global state
      } else if (connectionStatus === 'connected') {
        // Disconnect from user
        await connectionService.cancelConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        refreshUserConnections(); // Update global state
        // Reload connection counts after disconnecting
        loadRealCounts();
      } else if (connectionStatus === 'pending_received') {
        // Redirect to notifications page to respond to the request
        console.log('User should go to notifications page to respond to connection request');
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      console.log('Failed to update connection. Please try again.');
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
      } else {
        // Block the user
        await blockingService.blockUser(userId);
        setIsBlocked(true);
        console.log('User blocked successfully');
      }
    } catch (error) {
      console.error('Error handling block/unblock:', error);
      console.log('Failed to update block status. Please try again.');
    } finally {
      setBlockLoading(false);
    }
  };

  const getConnectionButtonText = () => {
    if (connectionLoading) return 'Loading...';

    switch (connectionStatus) {
      case 'connected': return 'Disconnect';
      case 'pending_sent': return 'Cancel Request';
      case 'pending_received': return 'Respond';
      default: return 'Connect';
    }
  };

  const getConnectionButtonStyle = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'flex-1 lg:flex-none lg:min-w-[160px] h-10 px-5 bg-slate-500 hover:bg-slate-600 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 group';
      case 'pending_sent':
        return 'flex-1 lg:flex-none lg:min-w-[160px] h-10 px-5 bg-slate-500 hover:bg-slate-600 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 group';
      case 'pending_received':
        return 'flex-1 lg:flex-none lg:min-w-[160px] h-10 px-5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 group';
      default:
        return 'flex-1 lg:flex-none lg:min-w-[160px] h-10 px-5 bg-sage hover:bg-sage-dark text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 group';
    }
  };

  const getConnectionButtonIcon = () => {
    switch (connectionStatus) {
      case 'connected': return 'person_remove';
      case 'pending_sent': return 'cancel';
      case 'pending_received': return 'notifications';
      default: return 'person_add';
    }
  };

  const getProfilePicture = (user: any) => {
    if (user?.avatar_url) {
      return user.avatar_url;
    }

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const colorIndex = user?.id ? user.id.charCodeAt(0) % colors.length : 0;
    const backgroundColor = colors[colorIndex];

    const initials = user?.full_name
      ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';

    const svg = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="${backgroundColor}"/>
        <text x="75" y="85" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const timelineTextClass = 'text-slate-900 text-xs font-black uppercase tracking-wide whitespace-nowrap';

  console.log('UserProfilePage render - loading:', loading, 'profile:', profile);

  if (loading) {
    console.log('Showing loading spinner');
    return (
      <div className="bg-stone text-slate-700 min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show offline message if offline and no profile data
  if (isOffline && !profile) {
    return (
      <div className="bg-stone text-slate-700 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <OfflineMessage
            {...getOfflineMessage('profile')}
            showRetry={true}
            onRetry={loadUserProfile}
          />
        </div>
      </div>
    );
  }

  // Show not found message if no profile data available
  if (!profile) {
    return (
      <div className="bg-stone text-slate-700 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-stone-off flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-500">person_off</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Profile not found</h3>
            <p className="text-slate-600">This user profile could not be loaded.</p>
            <button
              onClick={onBack}
              className="mt-6 bg-sage hover:bg-sage-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.full_name?.trim() || profile.username?.trim() || 'User';
  const title = profile.title?.trim() || '';
  const company = profile.company?.trim() || '';
  const location = profile.location?.trim() || '';
  const bio = profile.bio?.trim() || '';
  const hasHeadline = Boolean(title || company);

  console.log('Rendering profile page for:', profile.full_name);

  return (
    <div className="bg-stone text-slate-700 min-h-screen flex flex-col">
      <main className="flex-1 px-4 py-8 md:px-6 md:py-10 flex justify-center w-full">
        <div className="w-full max-w-6xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative">
            {/* Back Button */}
            <button
              className="hidden md:block absolute top-4 left-4 z-10 p-2 bg-white bg-opacity-80 hover:bg-stone-off backdrop-blur-sm rounded-full shadow-sm text-slate-500 hover:text-sage transition-all border border-stone-border"
              onClick={onBack}
              aria-label="Go back"
            >
              <BackArrowIcon className="h-5 w-5 block" />
            </button>

            {/* Header Section */}
            <div className="relative w-full">
              <div className="h-44 w-full border-b border-transparent relative overflow-hidden">
                {profile?.cover_image_url && (
                  <img
                    src={profile.cover_image_url}
                    alt="Profile cover"
                    className="absolute inset-0 h-full w-full object-cover"
                    decoding="async"
                  />
                )}
                {!profile?.cover_image_url && (
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-off via-stone-border to-slate-200"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent"></div>
              </div>

              <div className="px-6 md:px-10 pb-8">
                <div className="flex flex-col md:flex-row gap-6 items-start -mt-14 md:-mt-16 relative">
                  {/* Profile Picture */}
                  <div className="relative group">
                    <div
                      className="bg-center bg-no-repeat bg-cover rounded-full h-32 w-32 border-4 border-white shadow-md flex-shrink-0 bg-stone-off"
                      style={{ backgroundImage: `url("${getProfilePicture(profile)}")` }}
                    ></div>
                    <div className="absolute bottom-2 right-2 h-5 w-5 bg-green-500 rounded-full border-4 border-white" title="Online"></div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 pt-2 md:pt-20 flex flex-col w-full">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {displayName}
                          </h1>
                          {profile.verified && (
                            <span className="material-symbols-outlined text-blue-500 text-xl" title="Verified User">verified</span>
                          )}
                        </div>
                        {hasHeadline && (
                          <p className="text-slate-700 text-lg font-medium">
                            {title}
                            {title && company ? ' at ' : ''}
                            {company && <span className="text-slate-900 font-semibold">{company}</span>}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-slate-500 font-medium">
                          {location && (
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-lg text-slate-400">location_on</span>
                              {location}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-lg text-slate-400">group</span>
                            <span className="text-slate-900 font-bold">{realCounts.connections}</span> Connections
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-lg text-slate-400">star</span>
                            <span className="text-slate-900 font-bold">{realCounts.rating.toFixed(1)}/5</span> Rating
                          </span>
                        </div>
                        {bio && (
                          <p className="mt-4 text-slate-700 max-w-2xl text-sm leading-relaxed">
                            {bio}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {userId !== user?.id && (
                        <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                          <button
                            className={getConnectionButtonStyle()}
                            onClick={handleConnect}
                            disabled={connectionLoading}
                          >
                            <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">{getConnectionButtonIcon()}</span>
                            {getConnectionButtonText()}
                          </button>

                          <button
                            className="flex-1 lg:flex-none lg:min-w-[120px] h-10 px-5 bg-white border border-stone-border hover:bg-stone-off hover:border-sage text-slate-900 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                            onClick={handleMessage}
                          >
                            <span className="material-symbols-outlined text-xl">mail</span>
                            Message
                          </button>

                          <div className="relative group/menu" ref={actionsMenuRef}>
                            <button
                              className="h-10 w-10 flex items-center justify-center bg-white border border-stone-border hover:bg-stone-off rounded-lg text-slate-500 transition-colors"
                              onClick={() => setShowActionsMenu(!showActionsMenu)}
                            >
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>

                            {showActionsMenu && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-border overflow-hidden z-20">
                                <button
                                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isBlocked
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-red-500 hover:bg-red-50'
                                    } ${blockLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={handleBlock}
                                  disabled={blockLoading}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {blockLoading ? 'hourglass_empty' : isBlocked ? 'check_circle' : 'block'}
                                  </span>
                                  {blockLoading ? 'Loading...' : isBlocked ? 'Unblock' : 'Block'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-stone-border"></div>

            {/* Main Content */}
            <div className="p-6 md:p-10 flex flex-col divide-y divide-stone-border">
              {/* Experience Section */}
              <section className="py-10 first:pt-0 last:pb-0">
                <div className="flex items-center mb-6 px-1">
                  <h2 className="text-slate-900 text-xl font-extrabold uppercase tracking-[0.18em] pt-0.5">Experience</h2>
                </div>

                <div className="relative pl-2">
                  {Array.isArray(experiences) && experiences.length > 0 && (
                    <div className="absolute left-[31px] top-6 bottom-6 w-px bg-slate-100"></div>
                  )}
                  {Array.isArray(experiences) && experiences.length > 0 ? (
                    <div className="space-y-14">
                      {experiences.map((exp) => (
                        <div key={exp.id} className="relative flex gap-10">
                          <div className="relative z-10 shrink-0">
                            <div className="bg-white rounded-xl size-20 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                              <img src="/company-placeholder.png" alt={exp.company} className="w-full h-full object-contain" />
                            </div>
                          </div>

                          <div className="flex flex-col flex-1 pt-1">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                              <div className="flex flex-col gap-1.5">
                                <h3 className="text-slate-900 text-lg font-black uppercase tracking-[0.1em] leading-tight">
                                  {exp.title}
                                </h3>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-900 font-bold text-xs uppercase tracking-wider">{exp.company}</span>
                                  {exp.location && (
                                    <>
                                      <span className="text-slate-200 text-xs">/</span>
                                      <span className="text-slate-400 text-sm font-semibold tracking-tight">{exp.location}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 pt-0.5">
                                <span className={timelineTextClass}>
                                  {formatDate(exp.startDate)} — {exp.current ? 'Present' : formatDate(exp.endDate)}
                                </span>
                              </div>
                            </div>

                            {exp.description && (
                              <p className="text-slate-500 text-[14px] leading-[1.8] mt-6 max-w-2xl font-medium whitespace-pre-line">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Education Section */}
              <section className="py-10 first:pt-0 last:pb-0">
                <div className="flex items-center mb-6 px-1">
                  <h2 className="text-slate-900 text-xl font-extrabold uppercase tracking-[0.18em] pt-0.5">Education</h2>
                </div>
                <div className="px-1">
                  <div className="relative space-y-10">
                    {Array.isArray(education) && education.length > 0 && (
                      <div className="absolute left-[40px] top-3 bottom-3 w-0.5 bg-off-stone"></div>
                    )}
                    {Array.isArray(education) && education.length > 0 ? (
                      education.map((edu) => (
                        <div key={edu.id} className="relative flex gap-6">
                          <div className="relative z-10 shrink-0">
                            <div className="size-20 rounded-xl bg-white border border-stone-border flex items-center justify-center text-slate-meta">
                              <span className="material-symbols-outlined text-3xl">school</span>
                            </div>
                          </div>
                          <div className="flex flex-col flex-1 pt-2">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-1">
                              <h3 className="text-text-main text-lg font-bold">{edu.degree}</h3>
                              <span className={timelineTextClass}>{formatDate(edu.endDate)}</span>
                            </div>
                            <p className="text-text-secondary text-base">{edu.school}</p>
                          </div>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Skills Section */}
              <section className="py-10 first:pt-0 last:pb-0">
                <div className="flex items-center mb-6 px-1">
                  <h2 className="text-slate-900 text-xl font-extrabold uppercase tracking-[0.18em] pt-0.5">Skills</h2>
                </div>
                <div className="px-1">
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(skills) && skills.length > 0 ? (
                      skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="px-3 py-1.5 rounded-md bg-white text-slate-body cursor-default text-sm font-bold tracking-wide border border-stone-border"
                        >
                          {skill.name}
                        </span>
                      ))
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Achievements Section */}
              <section className="py-10 first:pt-0 last:pb-0">
                <div className="flex items-center mb-6 px-1">
                  <h2 className="text-slate-900 text-xl font-extrabold uppercase tracking-[0.18em] pt-0.5">Achievements</h2>
                </div>
                <div className="flex flex-col gap-4">
                  {Array.isArray(achievements) && achievements.length > 0 ? (
                    achievements.map((achievement) => (
                      <div key={achievement.id} className="px-1 py-1 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-text-main font-bold text-base leading-tight">{achievement.title}</h4>
                          <p className="text-slate-meta text-sm mt-1 font-semibold">{achievement.organization}</p>
                          {achievement.description && (
                            <p className="text-text-secondary text-sm mt-2 leading-snug">{achievement.description}</p>
                          )}
                        </div>
                        <span className={`${timelineTextClass} shrink-0 pt-0.5`}>{formatDate(achievement.date)}</span>
                      </div>
                    ))
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
