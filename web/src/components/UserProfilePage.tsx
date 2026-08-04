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
import BackArrowIcon from './icons/BackArrowIcon';
import { ProfileTabs } from './ProfileTabs';
import { ProfileExperienceList } from './ProfileExperienceList';
import { ProfileEducationList } from './ProfileEducationList';
import CompanyAvatar from './CompanyAvatar';
import type { Experience, Education, Skill, Achievement } from '../types/profileSections';

interface UserProfilePageProps {
  userId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
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
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [activeTab, setActiveTab] = useState('about');

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
    setActiveTab('about');
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
    return '/149071.png';
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
              className="hidden md:block absolute top-4 left-4 z-10 p-2 bg-white bg-opacity-80 hover:bg-stone-off backdrop-blur-sm rounded-full text-slate-500 hover:text-sage transition-all border border-stone-border"
              onClick={onBack}
              aria-label="Go back"
            >
              <BackArrowIcon className="h-5 w-5 block" />
            </button>

            {/* Header Section */}
            <div className="px-6 md:px-10 pt-6 md:pt-8 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-border">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className="bg-center bg-no-repeat bg-cover rounded-full h-16 w-16 md:h-20 md:w-20 border-2 border-white shadow-sm bg-stone-off"
                    style={{ backgroundImage: `url("${getProfilePicture(profile)}")` }}
                  ></div>
                  <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white" title="Online"></div>
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">
                    {displayName}
                  </h1>
                  {hasHeadline && (
                    <div className="flex items-center gap-1.5 text-slate-700 text-sm md:text-base font-medium min-w-0">
                      {company && (
                        <div className="h-5 w-5 rounded-full overflow-hidden shrink-0">
                          <CompanyAvatar company={company} size="sm" />
                        </div>
                      )}
                      <span className="truncate">
                        {title}
                        {title && company ? ' at ' : ''}
                        {company && <span className="text-slate-900 font-semibold">{company}</span>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {userId !== user?.id && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    className={getConnectionButtonStyle()}
                    onClick={handleConnect}
                    disabled={connectionLoading}
                  >
                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">{getConnectionButtonIcon()}</span>
                    {getConnectionButtonText()}
                  </button>

                  <button
                    className="lg:min-w-[120px] h-10 px-5 bg-white border border-stone-border hover:bg-stone-off hover:border-sage text-slate-900 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
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

            {/* Main Content */}
            <div className="p-6 md:p-10">
              <ProfileTabs
                tabs={[
                  { id: 'about', label: 'About' },
                  { id: 'experience', label: 'Experience' },
                  { id: 'education', label: 'Education' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              <div className="mt-8 md:mt-10">
                {activeTab === 'about' && (
                  <div className="flex flex-col gap-8 md:gap-10">
                    {bio && (
                      <section>
                        <div className="flex items-center mb-6 px-1">
                          <h2 className="text-lg font-semibold text-slate-900">Short bio</h2>
                        </div>
                        <p className="px-1 text-slate-700 max-w-2xl text-sm leading-relaxed">{bio}</p>
                      </section>
                    )}

                    {/* Skills Section */}
                    <section>
                      <div className="flex items-center mb-6 px-1">
                        <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                      </div>
                      <div className="px-1">
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(skills) && skills.length > 0 ? (
                            skills.map((skill) => (
                              <span
                                key={skill.id}
                                className="px-3 py-1.5 rounded-lg bg-white text-slate-body cursor-default text-sm font-bold tracking-wide border border-stone-border"
                              >
                                {skill.name}
                              </span>
                            ))
                          ) : null}
                        </div>
                      </div>
                    </section>

                    {/* Achievements Section */}
                    <section>
                      <div className="flex items-center mb-6 px-1">
                        <h2 className="text-lg font-semibold text-slate-900">Achievements</h2>
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
                )}

                {activeTab === 'experience' && (
                  <section>
                    <div className="flex items-center mb-6 px-1">
                      <h2 className="text-lg font-semibold text-slate-900">Experience</h2>
                    </div>
                    <ProfileExperienceList experiences={experiences} />
                  </section>
                )}

                {activeTab === 'education' && (
                  <section>
                    <div className="flex items-center mb-6 px-1">
                      <h2 className="text-lg font-semibold text-slate-900">Education</h2>
                    </div>
                    <ProfileEducationList education={education} />
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
