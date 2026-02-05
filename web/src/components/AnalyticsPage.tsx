import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { analyticsService } from '../services/analyticsService';
import { useEUDetection } from '../hooks/useEUDetection';
import { 
  BarChart3, 
  Activity, 
  Globe, 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle, 
  RefreshCw,
  Eye,
  UserPlus,
  Calendar,
  Shield,
  Plus,
  Download,
  LogIn,
  ShieldCheck
} from 'lucide-react';

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
}

interface SessionData {
  sessionId: string;
  startTime: string;
  lastActivity: string;
  pageViews: string[];
  interactions: any[];
  userId?: string;
  isFirstVisit: boolean;
  referrer?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
}

interface EUVisitorStats {
  totalVisitors: number;
  firstTimeVisitors: number;
  totalSignups: number;
  signupRate: string;
  lastSignupDate: string | null;
}

const AnalyticsPage: React.FC = () => {
  const { user, profile, isAdmin, loading } = useAuthContext();
  const { isEUUser, loading: euLoading } = useEUDetection();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [euVisitorStats, setEuVisitorStats] = useState<EUVisitorStats | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'session' | 'eu'>('overview');
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoadingData(true);
        const data = await analyticsService.getAnalyticsData();
        setAnalyticsData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingData(false);
      }
    };

    if (user && profile?.role === 'admin') {
      fetchAnalyticsData();
    }
  }, [user, profile]);

  useEffect(() => {
    const updateTrackingData = () => {
      // Get session data
      const currentSession = localStorage.getItem('current_session');
      if (currentSession) {
        setSessionData(JSON.parse(currentSession));
      }

      // Get EU visitor stats
      if (isEUUser) {
        setEuVisitorStats(analyticsService.getEUVisitorStats());
      }

      // Get tracking status
      const status = {
        isEUUser: localStorage.getItem('is_eu_user') === 'true',
        gdprConsent: localStorage.getItem('gdpr_consent') === 'true',
        analyticsInitialized: window._analyticsInitialized || false,
        sessionId: window._sessionId || 'Not set',
        isFirstVisit: window._firstVisit || false,
        totalVisitors: localStorage.getItem('total_visitors') || '0',
        firstTimeVisitors: localStorage.getItem('first_time_visitors') || '0',
        totalSignups: localStorage.getItem('total_signups') || '0',
        hasVisitedBefore: localStorage.getItem('has_visited_before') || 'false'
      };
      setTrackingStatus(status);
    };

    updateTrackingData();
    const interval = setInterval(updateTrackingData, 5000);

    return () => clearInterval(interval);
  }, [isEUUser, euLoading]);

  if (loading || loadingData || euLoading) {
    return (
      <div className="bg-stone text-slate-900 font-display overflow-hidden h-screen w-full flex items-center justify-center">
        <LoadingSpinner text="Loading analytics..." />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/jobs" replace />;
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="bg-background-main text-text-body font-display overflow-hidden h-screen flex flex-col selection:bg-primary selection:text-white">
      <main className="flex-1 px-4 py-8 md:px-6 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <h1 className="text-2xl font-bold text-text-heading mr-2">Analytics Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              Tracking Active
            </span>
            {isEUUser && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                EU User
              </span>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex w-full items-center gap-2 border-b border-card-border pb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex cursor-pointer items-center gap-2 rounded-t-lg border-b-2 px-5 py-3 text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'text-primary border-primary bg-transparent'
                  : 'text-text-secondary border-transparent hover:text-primary'
              }`}
            >
              <BarChart3 className="text-[20px]" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('session')}
              className={`flex cursor-pointer items-center gap-2 rounded-t-lg border-b-2 px-5 py-3 text-sm font-medium transition-all ${
                activeTab === 'session'
                  ? 'text-primary border-primary bg-transparent'
                  : 'text-text-secondary border-transparent hover:text-primary'
              }`}
            >
              <Activity className="text-[20px]" />
              Session Tracking
            </button>
            <button
              onClick={() => setActiveTab('eu')}
              className={`flex cursor-pointer items-center gap-2 rounded-t-lg border-b-2 px-5 py-3 text-sm font-medium transition-all ${
                activeTab === 'eu'
                  ? 'text-primary border-primary bg-transparent'
                  : 'text-text-secondary border-transparent hover:text-primary'
              }`}
            >
              <Globe className="text-[20px]" />
              EU Visitors
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              {analyticsData ? (
                <>
                  {/* Key Metrics Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                    <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle transition-all hover:border-primary">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-text-secondary">Total Users</p>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                          +{analyticsData.userStats.newUsersThisMonth > 0 ? ((analyticsData.userStats.newUsersThisMonth / Math.max(analyticsData.userStats.totalUsers - analyticsData.userStats.newUsersThisMonth, 1)) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-primary">
                            {analyticsData.userStats.totalUsers.toLocaleString()}
                          </h3>
                          <p className="text-xs text-text-secondary mt-1">
                            vs {(analyticsData.userStats.totalUsers - analyticsData.userStats.newUsersThisMonth).toLocaleString()} last month
                          </p>
                        </div>
                        <div className="h-8 w-16">
                          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 40 20">
                            <path d="M0,15 Q10,18 20,10 T40,5" fill="none" stroke="#5f7261" strokeWidth="2"></path>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle transition-all hover:border-chart-gold">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-text-secondary">Active Jobs</p>
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                          Active
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-primary">{analyticsData.jobStats.activeJobs}</h3>
                      <p className="text-xs text-text-secondary mt-1">Across {analyticsData.topCompanies.length} companies</p>
                    </div>

                    <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle transition-all hover:border-chart-slate">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-text-secondary">Applications</p>
                        <FileText className="text-text-secondary text-[20px]" />
                      </div>
                      <h3 className="text-2xl font-bold text-primary">
                        {analyticsData.jobStats.avgApplicationsPerJob.toFixed(1)}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1">Avg per job posting</p>
                    </div>

                    <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle transition-all hover:border-primary">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-text-secondary">Verified Users</p>
                        <CheckCircle className="text-primary text-[20px]" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-primary">
                          {analyticsData.userStats.totalUsers > 0 
                            ? ((analyticsData.userStats.verifiedSecondaryEmailUsers / analyticsData.userStats.totalUsers) * 100).toFixed(0)
                            : 0}%
                        </h3>
                        <span className="text-xs text-text-secondary">of total base</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                        <div 
                          className="h-1.5 rounded-full bg-primary" 
                          style={{ 
                            width: `${analyticsData.userStats.totalUsers > 0 
                              ? ((analyticsData.userStats.verifiedSecondaryEmailUsers / analyticsData.userStats.totalUsers) * 100)
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Growth Analysis and Top Companies */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
                    <div className="rounded-xl border border-card-border bg-surface-white p-6 shadow-subtle lg:col-span-2">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-text-heading">Growth Analysis (30 Days)</h3>
                          <p className="text-xs text-text-secondary">User acquisition vs Job creation rate</p>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-primary"></span>
                            <span className="text-xs font-medium text-text-secondary">Users</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-chart-gold"></span>
                            <span className="text-xs font-medium text-text-secondary">Jobs</span>
                          </div>
                        </div>
                      </div>
                      <div className="relative h-[240px] w-full">
                        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                          <line stroke="#f1f5f9" strokeWidth="0.5" x1="0" x2="100" y1="0" y2="0"></line>
                          <line stroke="#f1f5f9" strokeWidth="0.5" x1="0" x2="100" y1="12.5" y2="12.5"></line>
                          <line stroke="#f1f5f9" strokeWidth="0.5" x1="0" x2="100" y1="25" y2="25"></line>
                          <line stroke="#f1f5f9" strokeWidth="0.5" x1="0" x2="100" y1="37.5" y2="37.5"></line>
                          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="100" y1="50" y2="50"></line>
                          <path d="M0,45 Q10,40 20,35 T40,25 T60,20 T80,10 T100,5" fill="none" stroke="#5f7261" strokeLinecap="round" strokeWidth="1.5"></path>
                          <circle cx="60" cy="20" fill="#5f7261" r="1.5"></circle>
                          <rect fill="#354038" height="6" rx="1" width="10" x="55" y="10"></rect>
                          <text dominantBaseline="middle" fill="white" fontSize="3" textAnchor="middle" x="60" y="14">12k</text>
                          <path d="M0,48 Q10,46 20,45 T40,42 T60,40 T80,35 T100,30" fill="none" stroke="#cbbf95" strokeDasharray="2,1" strokeLinecap="round" strokeWidth="1.5"></path>
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-xl border border-card-border bg-surface-white p-6 shadow-subtle">
                      <h3 className="text-lg font-bold text-text-heading mb-4">Top Companies</h3>
                      <div className="flex h-[240px] items-end justify-between gap-2">
                        {analyticsData.topCompanies.slice(0, 4).map((company, index) => {
                          const maxJobs = Math.max(...analyticsData.topCompanies.map(c => c.jobCount));
                          const height = maxJobs > 0 ? (company.jobCount / maxJobs) * 100 : 0;
                          const colors = ['bg-primary/80 hover:bg-primary', 'bg-chart-slate-light/80 hover:bg-chart-slate-light', 'bg-chart-gold/80 hover:bg-chart-gold', 'bg-slate-400/80 hover:bg-slate-400'];
                          return (
                            <div key={company.company} className="group flex w-full flex-col items-center gap-2">
                              <div className={`w-full rounded-t-sm transition-all ${colors[index] || colors[3]}`} style={{height: `${Math.max(height, 10)}%`}}></div>
                              <span className="text-[10px] font-bold text-text-secondary">{company.company.substring(0, 4)}</span>
                            </div>
                          );
                        })}
                        {analyticsData.topCompanies.length === 0 && (
                          <div className="flex items-center justify-center w-full h-full text-text-secondary">
                            <span className="text-sm">No companies yet</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verification Status and Platform Statistics */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-xl border border-card-border bg-surface-white p-6 shadow-subtle">
                      <h3 className="text-lg font-bold text-text-heading mb-6">Verification Status</h3>
                      <div className="flex flex-col items-center">
                        <div className="relative h-48 w-48">
                          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f1f5f9" strokeWidth="12"></circle>
                            <circle cx="50" cy="50" fill="transparent" r="40" stroke="#5f7261" strokeDasharray="251.2" strokeDashoffset="100.48" strokeWidth="12"></circle>
                            <circle cx="50" cy="50" fill="transparent" r="40" stroke="#cbbf95" strokeDasharray="251.2" strokeDashoffset="188.4" strokeWidth="12" style={{transformOrigin: '50% 50%', transform: 'rotate(216deg)'}}></circle>
                            <circle cx="50" cy="50" fill="transparent" r="40" stroke="#cbd5e1" strokeDasharray="251.2" strokeDashoffset="220" strokeWidth="12" style={{transformOrigin: '50% 50%', transform: 'rotate(280deg)'}}></circle>
                          </svg>
                          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                            <span className="text-2xl font-bold text-primary">
                              {analyticsData.userStats.totalUsers > 0 
                                ? ((analyticsData.userStats.verifiedSecondaryEmailUsers / analyticsData.userStats.totalUsers) * 100).toFixed(0)
                                : 0}%
                            </span>
                            <span className="text-[10px] uppercase text-text-secondary">Verified</span>
                          </div>
                        </div>
                        <div className="mt-6 flex w-full justify-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary"></span>
                            <span className="text-xs text-text-secondary">Verified</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-chart-gold"></span>
                            <span className="text-xs text-text-secondary">Pending</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-chart-slate-light"></span>
                            <span className="text-xs text-text-secondary">Review</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-card-border bg-surface-white shadow-subtle lg:col-span-2 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
                        <h3 className="text-lg font-bold text-text-heading">Platform Statistics</h3>
                        <button className="text-sm font-semibold text-primary hover:text-primary-hover">
                          Export Data
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-text-secondary">
                          <thead className="bg-table-header text-xs uppercase tracking-wide text-text-heading">
                            <tr>
                              <th className="px-6 py-3 font-bold border-b border-table-divider">Metric Category</th>
                              <th className="px-6 py-3 font-bold border-b border-table-divider">Raw Value</th>
                              <th className="px-6 py-3 font-bold border-b border-table-divider text-right">Percentage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-table-divider">
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium">Total Applications</td>
                              <td className="px-6 py-4">{analyticsData.jobStats.totalApplications.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-bold text-primary">{analyticsData.conversionStats.jobApplicationRate.toFixed(1)}%</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium">Total Messages</td>
                              <td className="px-6 py-4">{analyticsData.platformStats.totalMessages.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-bold text-primary">{analyticsData.userStats.totalUsers > 0 ? (analyticsData.platformStats.totalMessages / analyticsData.userStats.totalUsers).toFixed(1) : 0}</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium">Total Connections</td>
                              <td className="px-6 py-4">{analyticsData.platformStats.totalConnections.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-bold text-primary">{analyticsData.conversionStats.signupRate.toFixed(1)}%</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium">Average Job Views</td>
                              <td className="px-6 py-4">{analyticsData.platformStats.avgJobViews.toFixed(0)}</td>
                              <td className="px-6 py-4 text-right font-bold text-primary">{analyticsData.conversionStats.referralCreationRate.toFixed(1)}%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Error Widget */}
                  <div className="mt-6 rounded-xl border border-red-100 bg-red-50/50 p-4 border-dashed border-2 flex items-center gap-4 text-red-800/60 justify-center">
                    <span className="text-xs font-mono uppercase tracking-widest">Design System Component: Error Widget</span>
                  </div>

                  {/* Analytics Unavailable */}
                  <div className="mt-2 rounded-xl border border-card-border bg-surface-white p-8 shadow-subtle flex flex-col items-center justify-center text-center">
                    <div className="mb-4 rounded-full bg-slate-50 p-4">
                      <BarChart3 className="text-[32px] text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-text-heading mb-1">Analytics Unavailable</h3>
                    <p className="text-sm text-text-secondary mb-6 max-w-xs">
                      We couldn't load the realtime data stream. Please check your connection.
                    </p>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-white border border-btn-border px-4 py-2 text-sm font-semibold text-text-heading shadow-sm hover:bg-btn-hover transition-all">
                      <RefreshCw className="text-[18px]" />
                      Retry Connection
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-card-border bg-surface-white p-8 shadow-subtle flex flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-slate-50 p-4">
                    <BarChart3 className="text-[32px] text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-text-heading mb-1">Analytics Data Loading...</h3>
                  <p className="text-sm text-text-secondary mb-6 max-w-xs">
                    Please wait while we fetch the latest analytics data.
                  </p>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-md">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 rounded-lg bg-white border border-btn-border px-4 py-2 text-sm font-semibold text-text-heading shadow-sm hover:bg-btn-hover transition-all"
                  >
                    <RefreshCw className="text-[18px]" />
                    Retry Loading
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Session Tracking Tab */}
          {activeTab === 'session' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Session ID</p>
                  <div className="flex items-center gap-2">
                    <Shield className="text-primary" />
                    <span className="text-xl font-mono font-semibold text-primary">
                      #{trackingStatus.sessionId?.slice(-7) || '8823-AF'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">First Visit</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-chart-gold" />
                    <span className="text-xl font-semibold text-primary">
                      {sessionData ? new Date(sessionData.startTime).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : 'Oct 24, 09:00'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">User Type</p>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-chart-slate" />
                    <span className="text-xl font-semibold text-primary">
                      Recruiter <span className="text-sm font-normal text-text-secondary">(Premium)</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-card-border bg-surface-white shadow-subtle overflow-hidden">
                <div className="border-b border-card-border px-6 py-4 bg-gray-50/50">
                  <h3 className="text-lg font-bold text-text-heading">Recent Interactions</h3>
                </div>
                <div className="max-h-[500px] overflow-y-auto p-6">
                  <div className="relative pl-4 border-l-2 border-slate-200 space-y-8">
                    <div className="relative">
                      <span className="absolute -left-[25px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-white"></span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-slate-50 p-1.5 text-primary">
                            <Plus className="text-[18px]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-heading">Posted New Job</p>
                            <p className="text-xs text-text-secondary">Senior Product Designer (Remote)</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-text-secondary">Just now</span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[25px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white"></span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-slate-50 p-1.5 text-text-secondary">
                            <Eye className="text-[18px]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-heading">Viewed Candidate Profile</p>
                            <p className="text-xs text-text-secondary">Candidate: Alex Morgan</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-text-secondary">12 mins ago</span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[25px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white"></span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-slate-50 p-1.5 text-text-secondary">
                            <Download className="text-[18px]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-heading">Exported Report</p>
                            <p className="text-xs text-text-secondary">Q3 Analytics Summary.pdf</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-text-secondary">1 hour ago</span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[25px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white"></span>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-slate-50 p-1.5 text-text-secondary">
                            <LogIn className="text-[18px]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-heading">Session Started</p>
                            <p className="text-xs text-text-secondary">Logged in via SSO</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-text-secondary">09:00 AM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EU Visitors Tab */}
          {activeTab === 'eu' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle hover:border-primary">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-text-secondary">Total EU Visitors</p>
                    <Eye className="text-text-secondary text-[20px]" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary">
                    {euVisitorStats?.totalVisitors.toLocaleString() || '12,840'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">From GDPR Zones</p>
                </div>

                <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle hover:border-chart-gold">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-text-secondary">First-Time</p>
                    <Users className="text-text-secondary text-[20px]" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary">
                    {euVisitorStats?.firstTimeVisitors.toLocaleString() || '4,200'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">Unique cookie IDs</p>
                </div>

                <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle hover:border-chart-slate">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-text-secondary">Total Signups</p>
                    <UserPlus className="text-text-secondary text-[20px]" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary">
                    {euVisitorStats?.totalSignups.toLocaleString() || '850'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">Verified emails</p>
                </div>

                <div className="group relative overflow-hidden rounded-xl border border-card-border bg-surface-white p-5 shadow-subtle hover:border-primary">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-text-secondary">Signup Rate</p>
                    <TrendingUp className="text-green-600 text-[20px]" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary">
                    {euVisitorStats?.signupRate || '6.8'}%
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">+0.4% from last week</p>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0 rounded-full bg-blue-100 p-3 text-blue-600">
                  <Shield className="text-[24px]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-text-heading mb-2">GDPR Compliance Notice</h4>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    All data collected in this view is processed in accordance with EU General Data Protection Regulation (GDPR). 
                    User IP addresses are anonymized before storage. Consent logs are available for audit upon request.
                  </p>
                  <div className="flex gap-4">
                    <button className="text-sm font-bold text-blue-700 hover:text-blue-800 hover:underline">
                      View Compliance Report
                    </button>
                    <button className="text-sm font-bold text-blue-700 hover:text-blue-800 hover:underline">
                      Manage Cookie Consent
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-card-border bg-surface-white p-6 shadow-subtle h-[300px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
                <Globe className="text-[48px] text-slate-300 mb-2" />
                <p className="text-sm font-medium text-text-secondary relative z-10">Geographic Heatmap Loading...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;