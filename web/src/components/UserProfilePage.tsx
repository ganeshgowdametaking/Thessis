import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { profileService } from '../services/profileService';
import { connectionService } from '../services/connectionService';
import { messageService } from '../services/messageService';
import { blockingService } from '../services/blockingService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import OfflineMessage from './OfflineMessage';
import { isOnline, getCachedData, setCachedData, getOfflineMessage } from '../utils/offlineUtils';
import { ProfileTabs } from './ProfileTabs';
import { ProfileExperienceList } from './ProfileExperienceList';
import { ProfileEducationList } from './ProfileEducationList';
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
  const [activeTab, setActiveTab] = useState('experience');
  const [connectionsCount, setConnectionsCount] = useState(0);

  // Use actual data from profile instead of hardcoded mock data
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // The wrapper in App.tsx doesn't key this component by userId, so navigating
  // between two different people's profiles reuses this mounted instance —
  // reset to the first tab whenever the viewed profile changes.
  useEffect(() => {
    setActiveTab('experience');
  }, [userId]);

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
    try {
      setConnectionLoading(true);

      if (connectionStatus === 'none') {
        // Send connection request
        await connectionService.sendConnectionRequest(userId);
        setConnectionStatus(userId, 'pending_sent'); // Instant UI update
        refreshUserConnections(); // Reconcile with server in the background
      } else if (connectionStatus === 'pending_sent') {
        // Cancel connection request
        await connectionService.cancelConnectionRequest(userId);
        setConnectionStatus(userId, 'none');
        refreshUserConnections();
      } else if (connectionStatus === 'connected') {
        // Disconnect from user
        await connectionService.cancelConnectionRequest(userId);
        setConnectionStatus(userId, 'none');
        refreshUserConnections();
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
      case 'pending_sent': return 'Requested';
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
        return 'flex-1 lg:flex-none lg:min-w-[160px] h-10 px-5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 group';
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
    return '/default-avatar.svg';
  };

  const formatConnectionsCount = (count?: number) => {
    const value = typeof count === 'number' ? count : 0;
    if (value < 1000) return String(value);
    return `${(value / 1000).toFixed(2).replace(/\.?0+$/, '')}k`;
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
      <div className="bg-stone-bg text-slate-700 min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show offline message if offline and no profile data
  if (isOffline && !profile) {
    return (
      <div className="bg-stone-bg text-slate-700 min-h-screen flex flex-col">
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
      <div className="bg-stone-bg text-slate-700 min-h-screen flex flex-col">
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
  const bio = profile.bio?.trim() || '';

  console.log('Rendering profile page for:', profile.full_name);

  return (
    <div className="bg-stone-bg text-slate-700 min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 md:px-6 py-5 md:py-12">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr] gap-6 md:gap-8 items-start">
          {/* Left column: profile details — 50% */}
          <aside className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden lg:sticky lg:top-8">
            <div
              className="relative w-full h-24 bg-center bg-cover bg-no-repeat"
              style={{
                backgroundImage: profile.cover_image_url
                  ? `url("${profile.cover_image_url}")`
                  : 'linear-gradient(135deg, #4353FF 0%, #7C86FF 50%, #C7CCFF 100%)',
              }}
            ></div>

            <div className="px-5 pb-5">
              <div className="flex items-end gap-2.5 -mt-10">
                <div className="relative shrink-0">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-20 w-20 ring-4 ring-white shadow-sm"
                    style={{ backgroundImage: `url("${getProfilePicture(profile)}")` }}
                  ></div>
                </div>
                <div className="pb-1">
                  <span className="text-slate-900 text-lg font-extrabold">{formatConnectionsCount(connectionsCount)}</span>{' '}
                  <span className="text-slate-500 text-sm font-medium">Connections</span>
                </div>
              </div>

              <h1 className="text-slate-900 text-lg font-extrabold leading-tight tracking-tight mt-2 flex items-center gap-1.5">
                {displayName}
                {profile?.verified && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500 stroke-white shrink-0" />
                )}
              </h1>

              {bio && (
                <p className="text-slate-500 text-sm leading-snug mt-1">
                  {bio}
                </p>
              )}

              {userId !== user?.id && (
                <div className="flex items-center gap-2 mt-4">
                  <button
                    className={getConnectionButtonStyle()}
                    onClick={handleConnect}
                    disabled={connectionLoading}
                  >
                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">{getConnectionButtonIcon()}</span>
                    {getConnectionButtonText()}
                  </button>

                  <button
                    className="h-10 px-5 bg-white border border-stone-border hover:bg-stone-off hover:border-sage text-slate-900 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
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
                      <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-stone-border overflow-hidden z-20">
                        <button
                          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isBlocked
                            ? 'text-success-ink hover:bg-success-tint'
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

              <div className="flex flex-col gap-6 mt-6 text-left">
                {/* Skills Section */}
                <section>
                  <div className="flex items-center mb-3 pb-2 border-b border-slate-200/70">
                    <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(skills) && skills.length > 0 ? (
                      skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="px-2.5 py-1.5 rounded-lg bg-white text-slate-body cursor-default text-[13px] font-bold tracking-tight border border-stone-border"
                        >
                          {skill.name}
                        </span>
                      ))
                    ) : null}
                  </div>
                </section>

                {/* Achievements Section */}
                <section>
                  <div className="flex items-center mb-3 pb-2 border-b border-slate-200/70">
                    <h2 className="text-lg font-semibold text-slate-900">Achievements</h2>
                  </div>
                  <div className="flex flex-col gap-1 divide-y divide-slate-200/80">
                    {Array.isArray(achievements) && achievements.length > 0 ? (
                      achievements.map((achievement) => (
                        <div key={achievement.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-text-main font-bold text-[1.05rem] leading-tight">{achievement.title}</h4>
                            <p className="text-slate-meta text-[13px] mt-1 font-semibold">{achievement.organization}</p>
                            {achievement.description && (
                              <p className="text-text-secondary text-sm mt-1.5 leading-snug">{achievement.description}</p>
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
          </aside>

          {/* Right column: tabbed detail content — 50% */}
          <div className="min-w-0 w-full bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <ProfileTabs
              tabs={[
                { id: 'experience', label: 'Experience' },
                { id: 'education', label: 'Education' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            <div className="mt-6 md:mt-10">
              {activeTab === 'experience' && (
                <section>
                  <div className="flex items-center mb-3 md:mb-6 px-1 pb-2 border-b border-slate-200/70 md:border-b-0 md:pb-0">
                    <h2 className="text-2xl font-semibold text-slate-900">Experience</h2>
                  </div>
                  <ProfileExperienceList experiences={experiences} />
                </section>
              )}

              {activeTab === 'education' && (
                <section>
                  <div className="flex items-center mb-3 md:mb-6 px-1 pb-2 border-b border-slate-200/70 md:border-b-0 md:pb-0">
                    <h2 className="text-2xl font-semibold text-slate-900">Education</h2>
                  </div>
                  <ProfileEducationList education={education} />
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
