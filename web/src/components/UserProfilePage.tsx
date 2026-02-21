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

interface UserProfilePageProps {
  userId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

interface Experience {
  id: number;
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
  id: number;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  description: string;
  gpa: string;
}

interface Skill {
  id: number;
  name: string;
  level: number;
  category: string;
}

interface Achievement {
  id: number;
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
          setProfile(cachedProfile.profile);
          setExperiences(cachedProfile.experiences || []);
          setEducation(cachedProfile.education || []);
          setSkills(cachedProfile.skills || []);
          setAchievements(cachedProfile.achievements || []);
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
          const experiences = Array.isArray(userProfile.experiences) && userProfile.experiences.length > 0
            ? userProfile.experiences : [];
          const education = Array.isArray(userProfile.education) && userProfile.education.length > 0
            ? userProfile.education : [];
          const skills = Array.isArray(userProfile.skills) && userProfile.skills.length > 0
            ? userProfile.skills : [];
          const achievements = Array.isArray(userProfile.achievements) && userProfile.achievements.length > 0
            ? userProfile.achievements : [];

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
          setProfile(cachedProfile.profile);
          setExperiences(cachedProfile.experiences || []);
          setEducation(cachedProfile.education || []);
          setSkills(cachedProfile.skills || []);
          setAchievements(cachedProfile.achievements || []);
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

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
              className="absolute top-4 left-4 z-10 p-2 bg-white bg-opacity-80 hover:bg-stone-off backdrop-blur-sm rounded-full shadow-sm text-slate-500 hover:text-sage transition-all border border-stone-border"
              onClick={onBack}
              aria-label="Go back"
            >
              <span className="material-symbols-outlined text-xl block">arrow_back</span>
            </button>

            {/* Header Section */}
            <div className="relative w-full">
              <div
                className="h-44 w-full bg-cover bg-center border-b border-transparent relative overflow-hidden"
                style={profile?.cover_image_url ? { backgroundImage: `url("${profile.cover_image_url}")` } : {}}
              >
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
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-lg text-slate-400">history</span>
                            <span className="text-slate-900 font-bold">{realCounts.expYears}yr</span> Exp
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-96">
              {/* Left Column - Experience & Education */}
              <div className="lg:col-span-8 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-stone-border flex flex-col">
                {/* Experience Section */}
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-stone-off rounded-lg text-slate-500">
                      <span className="material-symbols-outlined text-2xl">business_center</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Experience</h2>
                  </div>

                  <div className="space-y-8">
                    {Array.isArray(experiences) && experiences.map((exp) => (
                      <div key={exp.id} className="flex gap-4 group">
                        <div className="w-12 h-12 rounded-lg bg-stone-off text-slate-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                          <span className="material-symbols-outlined text-2xl">waves</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                            <div>
                              <h3 className="font-bold text-lg text-slate-900 leading-snug">{exp.title}</h3>
                              <p className="text-slate-900 font-medium">{exp.company}</p>
                            </div>
                            <span className="text-sm font-medium text-slate-500 mt-1 sm:mt-0 whitespace-nowrap">
                              {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                            </span>
                          </div>
                          <div className="mt-3 text-sm text-slate-700 leading-relaxed">
                            <p>{exp.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(experiences) || experiences.length === 0) && (
                      <p className="text-slate-500 text-center py-8">No experience information available.</p>
                    )}
                  </div>
                </section>

                <div className="border-t border-stone-border my-8"></div>

                {/* Education Section */}
                <section className="mb-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-stone-off rounded-lg text-slate-500">
                      <span className="material-symbols-outlined text-2xl">school</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Education</h2>
                  </div>

                  <div className="space-y-6">
                    {Array.isArray(education) && education.map((edu) => (
                      <div key={edu.id} className="flex gap-4 items-start">
                        <div className="w-12 h-12 rounded-lg bg-stone-off text-slate-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="font-serif font-bold text-lg">{edu.school.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-slate-900">{edu.school}</h3>
                              <p className="text-slate-500 text-sm">{edu.degree}</p>
                              {edu.gpa && (
                                <p className="text-xs font-semibold text-green-500 mt-1">GPA: {edu.gpa}</p>
                              )}
                            </div>
                            <span className="text-sm text-slate-500">
                              {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(education) || education.length === 0) && (
                      <p className="text-slate-500 text-center py-8">No education information available.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column - Skills, Achievements, Links */}
              <div className="lg:col-span-4 bg-stone-off p-6 md:p-8 flex flex-col gap-10 border-l border-stone-border">
                {/* Skills Section */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                    Skills
                    <div className="h-px bg-stone-border flex-1"></div>
                  </h3>

                  <div className="space-y-4">
                    {Array.isArray(skills) && skills.map((skill) => (
                      <div key={skill.id}>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-sm font-semibold text-slate-900">{skill.name}</span>
                          <span className="text-xs font-bold text-green-500">{skill.level}%</span>
                        </div>
                        <div className="w-full bg-stone-border rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-sage h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${skill.level}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(skills) || skills.length === 0) && (
                      <p className="text-slate-500 text-center py-4">No skills information available.</p>
                    )}
                  </div>
                </section>

                {/* Achievements Section */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                    Achievements
                    <div className="h-px bg-stone-border flex-1"></div>
                  </h3>

                  <div className="space-y-4">
                    {Array.isArray(achievements) && achievements.map((achievement) => (
                      <div key={achievement.id} className="flex gap-3">
                        <div className="text-slate-500 bg-white p-1.5 rounded-lg h-fit flex-shrink-0">
                          <span className="material-symbols-outlined text-xl">
                            {achievement.type === 'Award' ? 'emoji_events' :
                              achievement.type === 'Certification' ? 'psychology' : 'workspace_premium'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{achievement.title}</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            {achievement.organization} • {formatDate(achievement.date)}
                          </p>
                          {achievement.description && (
                            <p className="text-xs text-slate-700 mt-1">{achievement.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(achievements) || achievements.length === 0) && (
                      <p className="text-slate-500 text-center py-4">No achievements information available.</p>
                    )}
                  </div>
                </section>

                {/* Links Section */}
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-5 flex items-center gap-2">
                    Links
                    <div className="h-px bg-stone-border flex-1"></div>
                  </h3>

                  <div className="space-y-2">
                    {profile.website && (
                      <a className="group flex items-center gap-3 text-sm text-slate-900 py-2 px-2 -mx-2 rounded-lg hover:bg-white transition-colors" href={profile.website} target="_blank" rel="noopener noreferrer">
                        <span className="material-symbols-outlined text-xl text-slate-500 group-hover:text-sage">language</span>
                        <span className="font-medium">{profile.website}</span>
                      </a>
                    )}
                    {profile.linkedin_url && (
                      <a className="group flex items-center gap-3 text-sm text-slate-900 py-2 px-2 -mx-2 rounded-lg hover:bg-white transition-colors" href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <span className="material-symbols-outlined text-xl text-slate-500 group-hover:text-sage">link</span>
                        <span className="font-medium">LinkedIn Profile</span>
                      </a>
                    )}
                    {!profile.website && !profile.linkedin_url && (
                      <p className="text-slate-500 text-center py-4">No links available.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
