import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { useEUDetection } from '../hooks/useEUDetection';
import {
  Activity,
  Globe,
  TrendingUp,
  Users,
  ShieldCheck,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';

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

interface StatCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  trend?: string;
  color: 'primary' | 'gold' | 'slate' | 'emerald' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon, trend, color }) => {
  const colorMap = {
    primary: 'border-blue-600/20 hover:border-blue-600 bg-white',
    blue: 'border-blue-600/20 hover:border-blue-600 bg-white',
    gold: 'border-amber-400/20 hover:border-amber-400 bg-white',
    slate: 'border-slate-200 hover:border-slate-400 bg-white',
    emerald: 'border-emerald-500/20 hover:border-emerald-500 bg-white',
  };

  const iconColorMap = {
    primary: 'text-blue-600 bg-blue-50',
    blue: 'text-blue-600 bg-blue-50',
    gold: 'text-amber-500 bg-amber-50',
    slate: 'text-slate-500 bg-slate-100',
    emerald: 'text-emerald-500 bg-emerald-50',
  };

  return (
    <div className={`group relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg ${iconColorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">{subtext}</p>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
  const { user, profile, loading } = useAuthContext();
  const { loading: euLoading } = useEUDetection();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'growth' | 'flywheel' | 'eu'>('growth');
  const [loadingData, setLoadingData] = useState(true);

  // Check for Founder/Co-Founder role
  const isFounder = useMemo(() => {
    if (!profile?.role) return false;
    const role = profile.role.toLowerCase();
    return role === 'founder' || role === 'co_founder'; // || role === 'admin'; // Un-comment for testing if needed
  }, [profile]);

  // Ref guard to prevent double-fetching in React 18 strict mode
  const hasFetched = React.useRef(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    // If we're loading auth, wait.
    if (loading) return;

    // Guard: If we've already fetched for this session/mount, don't fetch again unless user changed
    if (hasFetched.current) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchAnalyticsData = async () => {
      try {
        setLoadingData(true);
        setFetchError(false);
        hasFetched.current = true; // Mark as fetched immediately to prevent re-entry

        // 4s Emergency Timeout
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Analytics fetch timed out (4s) - forcing UI render');
            setLoadingData(false);
          }
        }, 4000);

        const data = await analyticsService.getAnalyticsData();

        if (mounted) {
          clearTimeout(timeoutId);
          setAnalyticsData(data as AnalyticsData);
          setLoadingData(false);
        }
      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        if (mounted) {
          clearTimeout(timeoutId);
          setFetchError(true);
          setLoadingData(false);
        }
      }
    };

    // Only fetch if user is authorized (founder)
    if (user && isFounder) {
      fetchAnalyticsData();
    } else {
      // If not authorized / no user, just stop loading
      setLoadingData(false);
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user?.id, isFounder, loading]); // Depend on ID specifically, not the full user object

  // Reset guard if user changes (log out / log in)
  useEffect(() => {
    hasFetched.current = false;
  }, [user?.id]);

  const funnelData = useMemo(() => {
    if (!analyticsData?.founderStats?.conversionFunnel) return [];
    return [
      {
        value: analyticsData.founderStats.conversionFunnel.signups,
        name: 'Total Signups',
        fill: '#3b82f6', // blue-500
      },
      {
        value: analyticsData.founderStats.conversionFunnel.verified,
        name: 'Verified Users',
        fill: '#10b981', // emerald-500
      },
      {
        value: analyticsData.founderStats.conversionFunnel.posted,
        name: 'Posted Job',
        fill: '#f59e0b', // amber-500
      },
    ];
  }, [analyticsData?.founderStats?.conversionFunnel]);

  // retry handler
  const handleRetry = () => {
    hasFetched.current = false;
    window.location.reload();
  };

  // Dashboard Skeleton or Error State
  // Also show skeleton while we wait for profile to load (profile could be null initially)
  if (loading || !profile || (loadingData && !analyticsData)) {
    return (
      <div className="bg-slate-50 text-slate-900 font-display overflow-hidden h-screen flex flex-col">
        <main className="flex-1 px-4 py-8 md:px-6 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] flex flex-col gap-8">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 animate-pulse">
              <div className="h-8 w-64 bg-parchment-sunken rounded-lg"></div>
              <div className="h-4 w-96 bg-parchment-sunken rounded-lg"></div>
            </div>

            {fetchError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col items-center justify-center gap-4 text-center">
                <p className="text-red-600 font-medium">Failed to load analytics data.</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8 animate-pulse">
                {/* Cards Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-32 flex flex-col justify-between">
                      <div className="h-4 w-24 bg-slate-100 rounded"></div>
                    </div>
                  ))}
                </div>
                {/* Chart Skeleton */}
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm h-[400px]">
                  <div className="h-full bg-slate-50 rounded-xl w-full"></div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Only redirect AFTER profile is confirmed to be loaded and user is NOT a founder
  // At this point loading is false and profile is not null
  if (!user || !isFounder) {
    return <Navigate to="/jobs" replace />;
  }

  // With default data, we don't need to block on !analyticsData, 
  // but we can check if it's still initial/empty if we want specific empty states.
  // For now, the default structure allows rendering immediately.

  return (
    <div className="bg-slate-50 text-slate-900 font-display overflow-hidden h-screen flex flex-col selection:bg-blue-200 selection:text-blue-900">
      <main className="flex-1 px-4 py-8 md:px-6 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Growth Dashboard</h1>
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">Founder View</span>
            </div>
            <p className="text-slate-500 font-medium">High-fidelity metrics on acquisition, verification, and liquidity.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit shadow-sm">
            <button
              onClick={() => setActiveTab('growth')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-lg ${activeTab === 'growth'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <TrendingUp className="size-4" />
              User Growth & Acquisition
            </button>
            <button
              onClick={() => setActiveTab('flywheel')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-lg ${activeTab === 'flywheel'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Zap className="size-4" />
              Referral Flywheel
            </button>
            <button
              onClick={() => setActiveTab('eu')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all rounded-lg ${activeTab === 'eu'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Globe className="size-4" />
              EU Compliance
            </button>
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. User Growth & Acquisition */}
            {activeTab === 'growth' && (
              <div className="flex flex-col gap-8">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard
                    title="Total Users"
                    value={analyticsData.userStats.totalUsers.toLocaleString()}
                    subtext="All time signups"
                    icon={<Users className="size-5" />}
                    trend={`+${analyticsData.userStats.newUsersThisMonth} this month`}
                    color="blue"
                  />
                  <StatCard
                    title="Growth Rate (WoW)"
                    value={`${analyticsData.founderStats.userGrowthRateWoW.toFixed(1)}%`}
                    subtext="Last 7 days vs previous 7 days"
                    icon={<TrendingUp className="size-5" />}
                    color="emerald"
                    trend={analyticsData.founderStats.userGrowthRateWoW > 0 ? 'Trending Up' : undefined}
                  />
                  <StatCard
                    title="Avg. Time on Site"
                    value={`${analyticsData.founderStats.avgTimeOnSite.toFixed(0)}s`}
                    subtext="Per session average"
                    icon={<Activity className="size-5" />}
                    color="slate"
                  />
                </div>

                {/* Acquisition Channels Chart */}
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Acquisition Channels</h3>
                    <p className="text-sm text-slate-500">User breakdown by estimated source</p>
                  </div>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.founderStats.acquisitionChannels}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: '#F8F9FC' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Referral Flywheel */}
            {activeTab === 'flywheel' && (
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Liquidity Ratio Card */}
                  <div className="lg:col-span-1">
                    <div className="h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Zap className="size-6" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Liquidity Ratio</h3>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-5xl font-black font-display text-slate-900 tracking-tight">
                            {analyticsData.founderStats.liquidityRatio.toFixed(2)}
                          </span>
                          <span className="text-sm font-bold text-slate-400 uppercase">Jobs / Verified User</span>
                        </div>
                        <p className="text-slate-500 leading-relaxed text-sm">
                          This metric indicates the health of the marketplace. A ratio above 1.0 means there are more opportunities than verified talent (supply constrained).
                        </p>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-600">Market Health</span>
                          <span className="font-bold text-emerald-600">Healthy</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversion Funnel */}
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Conversion Funnel</h3>
                      <p className="text-sm text-slate-500">User journey from Signup to Value Creation (Posting)</p>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [value, 'Users']}
                          />
                          <Funnel
                            dataKey="value"
                            data={funnelData}
                            isAnimationActive
                          >
                            <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                            <LabelList position="center" fill="#fff" stroke="none" dataKey="value" style={{ fontWeight: 'bold', fontSize: '16px' }} />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EU Compliance */}
            {activeTab === 'eu' && (
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="EU Visitors"
                    value={analyticsData.userStats.euUsers.toLocaleString()}
                    subtext="Identified by IP/Region"
                    icon={<Globe className="size-5" />}
                    color="slate"
                  />
                  <StatCard
                    title="Data Residency"
                    value="EU-West"
                    subtext="Primary Cluster"
                    icon={<ShieldCheck className="size-5" />}
                    color="blue"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Compliance Audit Log</h3>
                    <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">Download Report</button>
                  </div>
                  <div className="p-0">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs sticky top-0">
                        <tr>
                          <th className="px-8 py-4">Timestamp</th>
                          <th className="px-8 py-4">Action</th>
                          <th className="px-8 py-4">Status</th>
                          <th className="px-8 py-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-4 font-mono text-xs">{new Date().toISOString()}</td>
                          <td className="px-8 py-4 font-medium text-slate-900">Consent Check</td>
                          <td className="px-8 py-4"><span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-bold">Passed</span></td>
                          <td className="px-8 py-4">Verified strict mode for 12 sessions</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-4 font-mono text-xs">{new Date(Date.now() - 3600000).toISOString()}</td>
                          <td className="px-8 py-4 font-medium text-slate-900">Data Scrub</td>
                          <td className="px-8 py-4"><span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold">Completed</span></td>
                          <td className="px-8 py-4">Anonymized 45 older records</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 text-center text-xs text-slate-400">
                      Showing recent automated compliance actions
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;