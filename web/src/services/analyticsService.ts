import { supabase } from '../lib/supabase';
import { countryCodeToName } from '../utils/countryMapping';

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

export const analyticsService = {
  // Deprecated collection entry points deliberately do nothing. Operational report
  // queries below are retained for existing internal tools.
  init: () => {},
  trackPageView: async (_page: string) => {},
  trackEvent: async (_eventType: string, _eventData: unknown) => {},
  trackInteraction: async (_interaction: unknown) => {},

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

  saveSessionData: () => {},

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
  trackEUVisitor: () => {},

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
  trackEUSignup: () => {}
};

// Legacy local reporting only. Global collection is owned by productAnalytics.
