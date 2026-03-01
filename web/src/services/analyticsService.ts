import { gdprService } from './gdprService';
import { supabase } from '../lib/supabase';
import { countryCodeToName } from '../utils/countryMapping';

interface PageViewEvent {
  page: string;
  referrer?: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  isFirstVisit?: boolean;
  userAgent?: string;
  screenResolution?: string;
  timeOnPage?: number;
}

interface UserEvent {
  eventType: string;
  eventData: any;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  page?: string;
  elementId?: string;
  elementType?: string;
  elementText?: string;
}

interface UserInteraction {
  type: 'click' | 'scroll' | 'hover' | 'form_focus' | 'form_submit' | 'button_click' | 'link_click';
  elementId?: string;
  elementType?: string;
  elementText?: string;
  page: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  coordinates?: { x: number; y: number };
  scrollDepth?: number;
}

interface SessionData {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  pageViews: string[];
  interactions: UserInteraction[];
  userId?: string;
  isFirstVisit: boolean;
  referrer?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
}

interface AnalyticsData {
  userStats: {
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsers: number;
    verifiedUsers: number;
    euUsers: number;
    verifiedSecondaryEmailUsers: number;
  };
  jobStats: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    newJobsThisMonth: number;
    avgApplicationsPerJob: number;
  };
  engagementStats: {
    averageSessionDuration: number;
    averagePageViewsPerSession: number;
    mostVisitedPages: Array<{ page: string; views: number }>;
    topInteractions: Array<{ interaction: string; count: number }>;
  };
  conversionStats: {
    signupRate: number;
    jobApplicationRate: number;
    referralCreationRate: number;
  };
  geographicData: Array<{ country: string; count: number }>;
  topCompanies: Array<{ company: string; jobCount: number }>;
  verifiedUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    secondary_email: string;
    secondary_email_verified_at: string;
  }>;
  platformStats: {
    totalConnections: number;
    totalPosts: number;
    totalMessages: number;
    avgJobViews: number;
  };
  timeSeriesData: {
    users: Array<{ date: string; count: number }>;
    jobs: Array<{ date: string; count: number }>;
  };
  founderStats: {
    userGrowthRateWoW: number;
    liquidityRatio: number;
    avgTimeOnSite: number;
    acquisitionChannels: Array<{ name: string; value: number }>;
    conversionFunnel: {
      signups: number;
      verified: number;
      posted: number;
    };
  };
}

declare global {
  interface Window {
    _analyticsInitialized: boolean;
    _sessionId: string;
    _firstVisit: boolean;
    _sessionStartTime: number;
    _lastActivity: number;
    _pageViews: string[];
    _interactions: UserInteraction[];
  }
}

// Storage limits to prevent QuotaExceededError
const MAX_INTERACTIONS_PER_SESSION = 100;
const MAX_PAGE_VIEWS_PER_SESSION = 50;
const MAX_SESSIONS_STORED = 10;

// Generate unique session ID
const generateSessionId = (): string => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Check if this is the first visit
const isFirstVisit = (): boolean => {
  const hasVisited = localStorage.getItem('has_visited_before');
  if (!hasVisited) {
    localStorage.setItem('has_visited_before', 'true');
    localStorage.setItem('first_visit_date', new Date().toISOString());
    return true;
  }
  return false;
};

// Initialize session tracking
const initializeSession = (): void => {
  if (!window._sessionId) {
    window._sessionId = generateSessionId();
    window._firstVisit = isFirstVisit();
    window._sessionStartTime = Date.now();
    window._lastActivity = Date.now();
    window._pageViews = [];
    window._interactions = [];

    // Store session data
    const sessionData: SessionData = {
      sessionId: window._sessionId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      pageViews: [],
      interactions: [],
      isFirstVisit: window._firstVisit,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    localStorage.setItem('current_session', JSON.stringify(sessionData));
  }
};

// Track user interactions
const trackInteraction = async (interaction: Omit<UserInteraction, 'timestamp' | 'sessionId' | 'userId'>): Promise<void> => {
  if (!window._analyticsInitialized) return;

  const interactionData: UserInteraction = {
    ...interaction,
    timestamp: new Date().toISOString(),
    sessionId: window._sessionId,
    userId: undefined
  };

  window._interactions.push(interactionData);
  window._lastActivity = Date.now();

  // Store in localStorage for persistence
  const sessionData = JSON.parse(localStorage.getItem('current_session') || '{}');

  // Cap interactions to prevent storage overflow
  if (window._interactions.length > MAX_INTERACTIONS_PER_SESSION) {
    window._interactions = window._interactions.slice(-MAX_INTERACTIONS_PER_SESSION);
  }

  sessionData.interactions = window._interactions;
  sessionData.lastActivity = new Date().toISOString();
  localStorage.setItem('current_session', JSON.stringify(sessionData));

  // Send to analytics service (in real implementation)

};

// Store cleanup function for event listeners
let trackingCleanup: (() => void) | null = null;

// Debounce utility
const debounce = <T extends (...args: never[]) => void>(func: T, wait: number): T & { cancel: () => void } => {
  let timeout: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args as never[]), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced as T & { cancel: () => void };
};

// Set up event listeners for automatic tracking
const setupAutomaticTracking = (): (() => void) => {
  if (!window._analyticsInitialized) return () => { };

  // If we already have listeners set up, clean them up first to avoid duplicates
  if (trackingCleanup) {
    trackingCleanup();
  }

  // Track scroll depth - Debounced to 2 seconds
  let maxScrollDepth = 0;
  const debouncedScrollTracker = debounce(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollDepth = Math.round((scrollTop / scrollHeight) * 100);

    if (scrollDepth > maxScrollDepth) {
      maxScrollDepth = scrollDepth;
      trackInteraction({
        type: 'scroll',
        page: window.location.pathname,
        scrollDepth
      });
    }
  }, 2000);

  const scrollHandler = () => debouncedScrollTracker();
  document.addEventListener('scroll', scrollHandler);

  // Track form interactions - Debounced
  const debouncedFormFocus = debounce((e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      const inputElement = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      // Filter out sensitive fields like passwords if needed
      if (inputElement.type === 'password') return;

      trackInteraction({
        type: 'form_focus',
        elementId: inputElement.id || inputElement.name || '',
        elementType: target.tagName.toLowerCase(),
        page: window.location.pathname
      });
    }
  }, 1000);

  const focusHandler = (e: FocusEvent) => debouncedFormFocus(e);
  document.addEventListener('focus', focusHandler, true); // Use capture for focus

  // Track form submissions
  const submitHandler = (e: Event) => {
    const target = e.target as HTMLFormElement;
    trackInteraction({
      type: 'form_submit',
      elementId: target.id || target.className,
      elementType: 'form',
      page: window.location.pathname
    });
  };
  document.addEventListener('submit', submitHandler);

  // Track link clicks - Specific conversion events
  const clickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Link clicks
    const link = target.closest('a');
    if (link) {
      trackInteraction({
        type: 'link_click',
        elementId: link.id || link.className,
        elementType: 'a',
        elementText: link.textContent?.trim().substring(0, 100) || '',
        page: window.location.pathname
      });
    }

    // Button clicks
    const button = target.closest('button');
    if (button) {
      trackInteraction({
        type: 'button_click',
        elementId: button.id || button.className,
        elementType: 'button',
        elementText: button.textContent?.trim().substring(0, 100) || '',
        page: window.location.pathname
      });
    }
  };
  document.addEventListener('click', clickHandler);

  // Return cleanup function
  const cleanup = () => {
    document.removeEventListener('scroll', scrollHandler);
    document.removeEventListener('focus', focusHandler, true);
    document.removeEventListener('submit', submitHandler);
    document.removeEventListener('click', clickHandler);

    // Cancel any pending debounces
    if (debouncedScrollTracker.cancel) debouncedScrollTracker.cancel();
    if (debouncedFormFocus.cancel) debouncedFormFocus.cancel();

    trackingCleanup = null;
  };

  trackingCleanup = cleanup;
  return cleanup;
};

export const analyticsService = {
  // Initialize analytics
  init: () => {
    // Check if user is EU and has not given consent
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      return;
    }

    // Initialize session tracking
    initializeSession();

    // Set up automatic tracking for non-EU users or EU users with consent
    if (!isEU || consent === 'true') {
      setupAutomaticTracking();
    }

    window._analyticsInitialized = true;
  },

  // Track page view
  trackPageView: async (page: string) => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      return;
    }

    // Throttled: Don't track if we just tracked this page < 1s ago
    const now = Date.now();
    if (window._lastActivity && (now - window._lastActivity < 1000)) {
      return;
    }

    // Initialize if not already initialized
    if (!window._analyticsInitialized) {
      analyticsService.init();
    }

    /* 
    const pageViewEvent: PageViewEvent = {
      page,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      sessionId: window._sessionId,
      userId: undefined,
      isFirstVisit: window._firstVisit,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`
    };
    */

    // Track page view
    // Cap page views to prevent storage overflow
    if (window._pageViews.length > MAX_PAGE_VIEWS_PER_SESSION) {
      window._pageViews = window._pageViews.slice(-MAX_PAGE_VIEWS_PER_SESSION);
    }
    window._pageViews.push(page);
    window._lastActivity = Date.now(); // Update activity time

    // Store in localStorage
    const sessionData = JSON.parse(localStorage.getItem('current_session') || '{}');
    sessionData.pageViews = window._pageViews;
    sessionData.lastActivity = new Date().toISOString();
    localStorage.setItem('current_session', JSON.stringify(sessionData));


    (window as any)._prevActivity = Date.now(); // Store for next time check
  },

  // Track user event
  trackEvent: async (eventType: string, eventData: any) => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      return;
    }

    // Initialize if not already initialized
    if (!window._analyticsInitialized) {
      analyticsService.init();
    }

    /*
    const userEvent: UserEvent = {
      eventType,
      eventData,
      timestamp: new Date().toISOString(),
      sessionId: window._sessionId,
      userId: undefined,
      page: window.location.pathname
    };
    */

    // Send to analytics service (in real implementation)

  },

  // Track custom interaction
  trackInteraction: async (interaction: Omit<UserInteraction, 'timestamp' | 'sessionId' | 'userId'>) => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (isEU && consent !== 'true') {
      return;
    }

    await trackInteraction(interaction);
  },

  // Get session data
  getSessionData: (): SessionData | null => {
    try {
      const sessionData = localStorage.getItem('current_session');
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  },

  // Clean up analytics data (for GDPR compliance)
  cleanUp: () => {
    // console.log('Analytics cleaned up'); // Freed up console

    // Remove event listeners
    if (trackingCleanup) {
      trackingCleanup();
    }

    // Clear session data
    localStorage.removeItem('current_session');
    localStorage.removeItem('has_visited_before');
    localStorage.removeItem('first_visit_date');

    window._analyticsInitialized = false;
    window._sessionId = '';
    window._firstVisit = false;
    window._sessionStartTime = 0;
    window._lastActivity = 0;
    window._pageViews = [];
    window._interactions = [];
  },

  // Update existing users with missing country codes
  updateMissingCountryCodes: async () => {
    try {
      // Get all profiles without country_code
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .is('country_code', null);

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        console.log(`Found ${profiles.length} profiles without country codes`);

        // Update all profiles to have 'IND' as default country
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ country_code: 'IND' })
          .is('country_code', null);

        if (updateError) throw updateError;

        return {
          updated: profiles.length,
          total: profiles.length,
          message: `Successfully updated ${profiles.length} profiles with country code 'IND'`
        };
      }

      return { updated: 0, total: 0, message: 'All profiles already have country codes' };
    } catch (error) {
      console.error('Error updating country codes:', error);
      throw error;
    }
  },

  // Get comprehensive analytics data for admin dashboard
  getAnalyticsData: async (): Promise<AnalyticsData> => {
    // Helper for safe failure-resistant queries
    const safeQuery = async <T>(promise: PromiseLike<{ data: T | null; error: any }> | any, fallback: T, tableName: string): Promise<T> => {
      try {
        const { data, error } = await promise;
        if (error) {
          console.warn(`Analytics warning [${tableName}]: using fallback`, error.message);
          return fallback;
        }
        return data || fallback;
      } catch (err) {
        console.warn(`Analytics exception [${tableName}]: using fallback`, err);
        return fallback;
      }
    };

    try {
      console.log('📡 Fetching Analytics...');

      // Sequential fetching to prevent race conditions and easier debugging
      // 1. Profiles (Base)
      const profiles = await safeQuery(
        supabase.from('profiles').select('id, created_at, verified, is_eu_user, country_code, signup_source, last_seen'),
        [],
        'profiles'
      );

      // 2. Verified Profiles
      const verifiedProfiles = await safeQuery(
        supabase.from('profiles').select('id, full_name, email, secondary_email, secondary_email_verified_at').eq('secondary_email_verified', true),
        [],
        'verified_profiles'
      );

      // 3. Jobs
      const jobs = await safeQuery(
        supabase.from('jobs').select('id, company, status, created_at, views_count, created_by'),
        [],
        'jobs'
      );

      // 4. Applications
      const applications = await safeQuery(
        supabase.from('applications').select('id, job_id'),
        [],
        'applications'
      );

      // 5. Connections
      const connections = await safeQuery(
        supabase.from('connections').select('id'),
        [],
        'connections'
      );

      // 6. Posts
      const posts = await safeQuery(
        supabase.from('posts').select('id'),
        [],
        'posts'
      );

      // 7. Messages
      const messages = await safeQuery(
        supabase.from('messages').select('id'),
        [],
        'messages'
      );

      // Debug raw counts
      console.table({
        profiles: profiles.length,
        verifiedProfiles: verifiedProfiles.length,
        jobs: jobs.length,
        applications: applications.length,
        connections: connections.length,
        posts: posts.length,
        messages: messages.length
      });

      const profilesList = profiles as any[] || [];
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const userStats = {
        totalUsers: profilesList.length,
        newUsersThisMonth: profilesList.filter(p => new Date(p.created_at) >= thisMonth).length,
        activeUsers: profilesList.filter(p => new Date(p.created_at) >= lastMonth).length,
        verifiedUsers: profilesList.filter(p => p.verified).length,
        euUsers: profilesList.filter(p => p.is_eu_user).length,
        verifiedSecondaryEmailUsers: (verifiedProfiles as any[] || []).length,
      };

      // Aggregate users by country_code
      const countryCounts: { [key: string]: number } = {};
      profilesList.forEach((p: any) => {
        if (p.country_code) {
          countryCounts[p.country_code] = (countryCounts[p.country_code] || 0) + 1;
        }
      });

      const geographicData = Object.entries(countryCounts).map(([code, count]) => {
        const countryName = countryCodeToName[code] || code;
        return {
          country: countryName,
          count
        };
      });

      const jobsList = jobs as any[] || [];
      const applicationsList = applications as any[] || [];

      // Count companies
      const companyCounts = jobsList.reduce((acc: any, job) => {
        acc[job.company] = (acc[job.company] || 0) + 1;
        return acc;
      }, {});

      const topCompanies = Object.entries(companyCounts)
        .map(([company, count]) => ({ company, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const jobStats = {
        totalJobs: jobsList.length,
        activeJobs: jobsList.filter(j => j.status === 'active').length,
        totalApplications: applicationsList.length,
        newJobsThisMonth: jobsList.filter(j => new Date(j.created_at) >= thisMonth).length,
        avgApplicationsPerJob: jobsList.length > 0 ? applicationsList.length / jobsList.length : 0
      };

      // Get session data for engagement stats
      const sessionData = analyticsService.getSessionData();
      const allSessions = JSON.parse(localStorage.getItem('all_sessions') || '[]');

      const engagementStats = {
        averageSessionDuration: allSessions.length > 0
          ? allSessions.reduce((acc: number, session: any) => {
            const duration = new Date(session.lastActivity).getTime() - new Date(session.startTime).getTime();
            return acc + duration;
          }, 0) / allSessions.length / 1000 // Convert to seconds
          : 0,
        averagePageViewsPerSession: allSessions.length > 0
          ? allSessions.reduce((acc: number, session: any) => acc + session.pageViews.length, 0) / allSessions.length
          : 0,
        mostVisitedPages: [], // Would be calculated from all sessions
        topInteractions: [] // Would be calculated from all sessions
      };

      // Calculate conversion rates
      const totalVisitors = allSessions.length;
      const signups = profilesList.length;
      const jobApplications = applicationsList.length;
      const referrals = jobsList.filter(j => j.status === 'active').length;

      const conversionStats = {
        signupRate: totalVisitors > 0 ? (signups / totalVisitors) * 100 : 0,
        jobApplicationRate: totalVisitors > 0 ? (jobApplications / totalVisitors) * 100 : 0,
        referralCreationRate: totalVisitors > 0 ? (referrals / totalVisitors) * 100 : 0
      };

      const connectionsList = connections as any[] || [];
      const postsList = posts as any[] || [];
      const messagesList = messages as any[] || [];

      const platformStats = {
        totalConnections: connectionsList.length,
        totalPosts: postsList.length,
        totalMessages: messagesList.length,
        avgJobViews: jobsList.length > 0 ? jobsList.reduce((acc, job) => acc + (job.views_count || 0), 0) / jobsList.length : 0
      };

      // Generate time series data for last 30 days (cumulative, UTC day boundaries)
      function getUTCDateString(date: Date) {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().split('T')[0];
      }
      const today = new Date();
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        d.setUTCDate(d.getUTCDate() - (29 - i));
        return d;
      });
      // Always show last 30 days, flat at 0 before first user/job
      const firstUserDate = profilesList.length > 0 ? new Date(Math.min(...profilesList.map(p => new Date(p.created_at).getTime()))) : null;
      const firstJobDate = jobsList.length > 0 ? new Date(Math.min(...jobsList.map(j => new Date(j.created_at).getTime()))) : null;
      const timeSeriesData = {
        users: days.map(day => {
          const endOfDay = new Date(day);
          endOfDay.setUTCHours(23, 59, 59, 999);
          let count = 0;
          if (!firstUserDate || endOfDay < firstUserDate) {
            count = 0;
          } else {
            count = profilesList.filter(p => new Date(p.created_at) <= endOfDay).length;
          }
          return { date: getUTCDateString(day), count };
        }),
        jobs: days.map(day => {
          const endOfDay = new Date(day);
          endOfDay.setUTCHours(23, 59, 59, 999);
          let count = 0;
          if (!firstJobDate || endOfDay < firstJobDate) {
            count = 0;
          } else {
            count = jobsList.filter(j => new Date(j.created_at) <= endOfDay).length;
          }
          return { date: getUTCDateString(day), count };
        })
      };



      // Calculate Founder Metrics

      // 1. WoW Growth Rate
      const nowTime = new Date().getTime();
      const oneWeekAgo = nowTime - (7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = nowTime - (14 * 24 * 60 * 60 * 1000);

      const newUsersLast7Days = profilesList.filter(p => {
        const t = new Date(p.created_at).getTime();
        return t >= oneWeekAgo;
      }).length;

      const newUsersPrior7Days = profilesList.filter(p => {
        const t = new Date(p.created_at).getTime();
        return t >= twoWeeksAgo && t < oneWeekAgo;
      }).length;

      const userGrowthRateWoW = newUsersPrior7Days > 0
        ? ((newUsersLast7Days - newUsersPrior7Days) / newUsersPrior7Days) * 100
        : (newUsersLast7Days > 0 ? 100 : 0);

      // 2. Liquidity Ratio (Total Referrals / Total Verified Users)
      // Note: In this context "Referrals" are active jobs posted
      const liquidityRatio = userStats.verifiedSecondaryEmailUsers > 0
        ? jobStats.activeJobs / userStats.verifiedSecondaryEmailUsers
        : 0;

      // 3. Channel Attribution (Real Data)
      // We now track 'signup_source' directly from URL params (?ref=, ?utm_source=)
      const channelCounts: { [key: string]: number } = {
        'Direct': 0,
        'LinkedIn': 0,
        'Twitter/X': 0,
        'Referral': 0,
        'Other': 0
      };

      profilesList.forEach((p: any) => {
        const source = (p.signup_source || 'Direct').toLowerCase();

        if (source.includes('linkedin')) channelCounts['LinkedIn']++;
        else if (source.includes('twitter') || source.includes('x.com')) channelCounts['Twitter/X']++;
        else if (source.includes('ref') || source.includes('friend')) channelCounts['Referral']++;
        else if (source === 'direct') channelCounts['Direct']++;
        else {
          // Check if key exists, else add to Other or create new key dynamically?
          // For chart stability, let's group unknown into 'Other' or add dynamic keys if significant
          if (channelCounts[source]) {
            channelCounts[source]++;
          } else {
            // Optional: Dynamically add top sources if needed, for now bucket to Other
            channelCounts['Other']++;
          }
        }
      });

      const acquisitionChannels = Object.entries(channelCounts)
        .filter(([_, value]) => value > 0) // Only show active channels
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // If all zero (fresh/legacy data), show default distribution to avoid broken chart
      if (acquisitionChannels.length === 0) {
        acquisitionChannels.push({ name: 'Direct (Legacy)', value: profilesList.length });
      }

      // 4. Conversion Funnel
      // Signups -> Verified Company Email -> Posted a Referral (Job)
      // Getting users who have posted at least one job
      const authors = new Set(jobsList.map(j => j.created_by));
      const postedCount = authors.size;

      const conversionFunnel = {
        signups: userStats.totalUsers,
        verified: userStats.verifiedSecondaryEmailUsers,
        posted: postedCount
      };

      return {
        userStats,
        jobStats,
        engagementStats,
        conversionStats,
        geographicData,
        topCompanies: topCompanies.map(c => ({ company: c.company, jobCount: c.count })),
        verifiedUsers: (verifiedProfiles as any[] || []).map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          secondary_email: p.secondary_email,
          secondary_email_verified_at: p.secondary_email_verified_at
        })),
        platformStats,
        timeSeriesData,
        founderStats: {
          userGrowthRateWoW,
          liquidityRatio,
          avgTimeOnSite: engagementStats.averageSessionDuration,
          acquisitionChannels,
          conversionFunnel
        }
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  },

  // Save session data when user leaves
  saveSessionData: () => {
    if (!window._analyticsInitialized) return;

    const sessionData = analyticsService.getSessionData();
    if (sessionData) {
      try {
        let allSessions = JSON.parse(localStorage.getItem('all_sessions') || '[]');
        if (!Array.isArray(allSessions)) allSessions = [];

        // Remove current session if it already exists to avoid duplicates
        allSessions = allSessions.filter((s: any) => s.sessionId !== sessionData.sessionId);

        // Add current session
        allSessions.push(sessionData);

        // Cap the number of stored sessions
        if (allSessions.length > MAX_SESSIONS_STORED) {
          allSessions = allSessions.slice(-MAX_SESSIONS_STORED);
        }

        localStorage.setItem('all_sessions', JSON.stringify(allSessions));
      } catch (error) {
        console.warn('Analytics: Failed to save session data', error);
        // Fallback: If we can't save all_sessions, clear it to make room
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          localStorage.removeItem('all_sessions');
        }
      }
    }
  },

  // Force clear all analytics data to free up space
  forceClearAnalytics: () => {
    const keysToRemove = [
      'current_session',
      'all_sessions',
      'has_visited_before',
      'first_visit_date',
      'total_visitors',
      'first_time_visitors',
      'total_signups',
      'last_signup_date',
      'is_eu_user',
      'gdpr_consent'
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Reset window objects
    window._analyticsInitialized = false;
    window._sessionId = '';
    window._pageViews = [];
    window._interactions = [];

    console.log('✅ Analytics storage cleared successfully');
  },

  // GDPR-compliant visitor tracking for EU users
  trackEUVisitor: () => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (!isEU || consent !== 'true') return;

    // Track total visitors (aggregate only)
    const totalVisitors = parseInt(localStorage.getItem('total_visitors') || '0') + 1;
    localStorage.setItem('total_visitors', totalVisitors.toString());

    // Track first-time visitors
    const isFirstVisit = !localStorage.getItem('has_visited_before');
    if (isFirstVisit) {
      const firstTimeVisitors = parseInt(localStorage.getItem('first_time_visitors') || '0') + 1;
      localStorage.setItem('first_time_visitors', firstTimeVisitors.toString());
      localStorage.setItem('has_visited_before', 'true');
      localStorage.setItem('first_visit_date', new Date().toISOString());
    }

    console.log('EU Visitor tracked (GDPR-compliant):', {
      totalVisitors,
      firstTimeVisitors: parseInt(localStorage.getItem('first_time_visitors') || '0'),
      totalSignups: parseInt(localStorage.getItem('total_signups') || '0'),
      isFirstVisit
    });
  },

  // Get EU visitor statistics (GDPR-compliant)
  getEUVisitorStats: () => {
    const totalVisitors = parseInt(localStorage.getItem('total_visitors') || '0');
    const firstTimeVisitors = parseInt(localStorage.getItem('first_time_visitors') || '0');
    const totalSignups = parseInt(localStorage.getItem('total_signups') || '0');
    const signupRate = totalVisitors > 0 ? (totalSignups / totalVisitors) * 100 : 0;

    return {
      totalVisitors,
      firstTimeVisitors,
      totalSignups,
      signupRate: signupRate.toFixed(1),
      lastSignupDate: localStorage.getItem('last_signup_date')
    };
  },

  // Track EU user signup (GDPR-compliant)
  trackEUSignup: () => {
    const isEU = localStorage.getItem('is_eu_user') === 'true';
    const consent = localStorage.getItem('gdpr_consent');

    if (!isEU || consent !== 'true') return;

    const totalSignups = parseInt(localStorage.getItem('total_signups') || '0') + 1;
    localStorage.setItem('total_signups', totalSignups.toString());
    localStorage.setItem('last_signup_date', new Date().toISOString());

    console.log('EU Signup tracked (GDPR-compliant):', {
      totalSignups,
      totalVisitors: parseInt(localStorage.getItem('total_visitors') || '0'),
      signupRate: ((totalSignups / parseInt(localStorage.getItem('total_visitors') || '1')) * 100).toFixed(1) + '%'
    });
  }
};

// Save session data when user leaves the page
window.addEventListener('beforeunload', () => {
  analyticsService.saveSessionData();
});

// Save session data periodically
setInterval(() => {
  analyticsService.saveSessionData();
}, 30000); // Every 30 seconds
