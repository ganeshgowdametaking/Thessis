import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Briefcase, FileText, UserCheck, RefreshCw, TrendingUp, TrendingDown, Shield, Activity, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, Cell, LabelList } from 'recharts';
import { useAuthContext } from '../contexts/AuthContext';
import {
    analyticsDataService,
    DashboardStats,
    RecentUser,
    RecentApplication,
    GrowthData,
    AcquisitionChannel,
    FunnelStage,
    EUComplianceData,
    ConversionData,
} from '../services/analyticsDataService';
import LoadingSpinner from './LoadingSpinner';

// Compliance audit log entries (static for now)
const COMPLIANCE_ACTIONS = [
    { date: '2026-02-08', action: 'Consent Check', status: 'Passed', details: 'All EU users have valid consent' },
    { date: '2026-02-07', action: 'Data Retention Audit', status: 'Passed', details: 'No expired data found' },
    { date: '2026-02-06', action: 'GDPR Data Export', status: 'Completed', details: 'User request fulfilled' },
    { date: '2026-02-05', action: 'Cookie Compliance', status: 'Passed', details: 'Banner functioning correctly' },
];

// Tab definitions
type TabId = 'overview' | 'growth' | 'funnel' | 'compliance';
const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'growth', label: 'User Growth', icon: TrendingUp },
    { id: 'funnel', label: 'Referral Flywheel', icon: Activity },
    { id: 'compliance', label: 'EU Compliance', icon: Shield },
];

// Format time ago
function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Timeout wrapper for async operations
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), ms);
    });
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch {
        clearTimeout(timeoutId!);
        return null;
    }
}

export default function AnalyticsDashboard() {
    const { user, profile, loading: authLoading } = useAuthContext();
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    // Base stats (loads immediately)
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Advanced data (loads on-demand)
    const [growthData, setGrowthData] = useState<GrowthData | null>(null);
    const [acquisitionChannels, setAcquisitionChannels] = useState<AcquisitionChannel[]>([]);
    const [euData, setEUData] = useState<EUComplianceData | null>(null);

    // Acquisition sources data (loads with base data)
    const [acquisitionSources, setAcquisitionSources] = useState<{ source: string; count: number; percentage: number; color: string }[]>([]);
    const [conversionData, setConversionData] = useState<ConversionData[]>([]);
    const [acquisitionLoading, setAcquisitionLoading] = useState(true);

    // Loading states for advanced data
    const [growthLoading, setGrowthLoading] = useState(false);
    const [euLoading, setEULoading] = useState(false);
    const [growthError, setGrowthError] = useState(false);
    const [euError, setEUError] = useState(false);

    // Ref guards to prevent duplicate fetches
    const hasFetchedBase = useRef(false);
    const hasFetchedGrowth = useRef(false);
    const hasFetchedEU = useRef(false);

    // Check if user has access (use profile?.role, not profile object)
    const hasAccess = useMemo(() => {
        if (!profile?.role) return false;
        const role = profile.role.toLowerCase();
        return role === 'admin' || role === 'founder' || role === 'co_founder';
    }, [profile?.role]);

    // Memoized funnel data to prevent Recharts re-renders
    const funnelData = useMemo<FunnelStage[]>(() => {
        if (!stats) return [];
        return analyticsDataService.buildFunnelData(stats);
    }, [stats]);

    // Memoized liquidity ratio
    const liquidityRatio = useMemo(() => {
        if (!stats) return 0;
        return analyticsDataService.calculateLiquidityRatio(stats);
    }, [stats]);

    // Load base dashboard data
    const loadBaseData = useCallback(async () => {
        if (hasFetchedBase.current && !loading) return;
        hasFetchedBase.current = true;
        setLoading(true);
        setError(null);

        try {
            const [statsData, usersData, applicationsData] = await Promise.all([
                analyticsDataService.getStats(),
                analyticsDataService.getRecentUsers(5),
                analyticsDataService.getRecentApplications(5),
            ]);

            setStats(statsData);
            setRecentUsers(usersData);
            setRecentApplications(applicationsData);
            setLastUpdated(new Date());

            // Load acquisition sources and conversion data
            setAcquisitionLoading(true);
            try {
                const [acqData, convData] = await Promise.all([
                    analyticsDataService.getAcquisitionStats(),
                    analyticsDataService.getConversionData(),
                ]);
                setAcquisitionSources(acqData);
                setConversionData(convData);
            } catch (err) {
                console.error('Error loading acquisition data:', err);
            } finally {
                setAcquisitionLoading(false);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [loading]);

    // Load growth data (lazy, on tab click)
    const loadGrowthData = useCallback(async () => {
        if (hasFetchedGrowth.current) return;
        hasFetchedGrowth.current = true;
        setGrowthLoading(true);
        setGrowthError(false);

        try {
            const [growth, channels] = await Promise.all([
                withTimeout(analyticsDataService.getGrowthData(), 4000),
                withTimeout(analyticsDataService.getAcquisitionChannels(), 4000),
            ]);

            if (growth) setGrowthData(growth);
            if (channels) setAcquisitionChannels(channels);
            if (!growth && !channels) setGrowthError(true);
        } catch {
            setGrowthError(true);
        } finally {
            setGrowthLoading(false);
        }
    }, []);

    // Load EU compliance data (lazy, on tab click)
    const loadEUData = useCallback(async () => {
        if (hasFetchedEU.current) return;
        hasFetchedEU.current = true;
        setEULoading(true);
        setEUError(false);

        try {
            const data = await withTimeout(analyticsDataService.getEUComplianceData(), 4000);
            if (data) {
                setEUData(data);
            } else {
                setEUError(true);
            }
        } catch {
            setEUError(true);
        } finally {
            setEULoading(false);
        }
    }, []);

    // Load base data on mount
    useEffect(() => {
        if (user && hasAccess) {
            loadBaseData();
        }
    }, [user, hasAccess, loadBaseData]);

    // Lazy load advanced data when tab is clicked
    useEffect(() => {
        if (activeTab === 'growth' && !hasFetchedGrowth.current) {
            loadGrowthData();
        } else if (activeTab === 'compliance' && !hasFetchedEU.current) {
            loadEUData();
        }
    }, [activeTab, loadGrowthData, loadEUData]);

    // Refresh handler (resets refs and reloads)
    const handleRefresh = () => {
        hasFetchedBase.current = false;
        hasFetchedGrowth.current = false;
        hasFetchedEU.current = false;
        setGrowthData(null);
        setAcquisitionChannels([]);
        setEUData(null);
        loadBaseData();
    };

    // Show loading while auth is checking
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // Redirect if not authorized
    if (!user || !hasAccess) {
        return <Navigate to="/jobs" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-display">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold font-display text-slate-900">Dashboard</h1>
                        <p className="text-slate-500 mt-1">Platform analytics and insights</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {lastUpdated && (
                            <span className="text-sm text-slate-500">
                                Updated {formatTimeAgo(lastUpdated.toISOString())}
                            </span>
                        )}
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} loading={loading} color="blue" />
                    <StatCard title="Active Jobs" value={stats?.activeJobs ?? 0} icon={Briefcase} loading={loading} color="green" />
                    <StatCard title="Applications" value={stats?.totalApplications ?? 0} icon={FileText} loading={loading} color="purple" />
                    <StatCard title="Connections" value={stats?.totalConnections ?? 0} icon={UserCheck} loading={loading} color="orange" />
                </div>

                {/* Acquisition Sources Section */}
                <AcquisitionSourcesSection
                    data={acquisitionSources}
                    conversionData={conversionData}
                    loading={acquisitionLoading}
                />

                {/* Tabs */}
                <div className="border-b border-slate-200 mb-6">
                    <nav className="flex gap-8">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && (
                        <OverviewTab recentUsers={recentUsers} recentApplications={recentApplications} loading={loading} />
                    )}
                    {activeTab === 'growth' && (
                        <GrowthTab
                            growthData={growthData}
                            acquisitionChannels={acquisitionChannels}
                            loading={growthLoading}
                            error={growthError}
                        />
                    )}
                    {activeTab === 'funnel' && (
                        <FunnelTab funnelData={funnelData} liquidityRatio={liquidityRatio} stats={stats} loading={loading} />
                    )}
                    {activeTab === 'compliance' && (
                        <ComplianceTab euData={euData} loading={euLoading} error={euError} />
                    )}
                </div>
            </main>
        </div>
    );
}

// === STAT CARD COMPONENT ===
interface StatCardProps {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    loading: boolean;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
};

function StatCard({ title, value, icon: Icon, loading, color }: StatCardProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    {loading ? (
                        <div className="h-7 w-14 bg-parchment-sunken rounded animate-pulse mt-1"></div>
                    ) : (
                        <p className="text-2xl font-bold font-display text-slate-900">{value.toLocaleString()}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// === OVERVIEW TAB ===
function OverviewTab({
    recentUsers,
    recentApplications,
    loading,
}: {
    recentUsers: RecentUser[];
    recentApplications: RecentApplication[];
    loading: boolean;
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        Recent Signups
                    </h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="px-6 py-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-parchment-sunken rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 w-32 bg-parchment-sunken rounded mb-2"></div>
                                        <div className="h-3 w-24 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : recentUsers.length > 0 ? (
                        recentUsers.map((user) => (
                            <div key={user.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-parchment-sunken rounded-full flex items-center justify-center overflow-hidden">
                                        <img src={user.avatar_url || '/default-avatar.svg'} alt="" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">{user.full_name || 'Anonymous User'}</p>
                                        <p className="text-sm text-slate-500 truncate">{user.email}</p>
                                    </div>
                                    <span className="text-xs text-slate-400">{formatTimeAgo(user.created_at)}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-slate-500">No recent signups</div>
                    )}
                </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Recent Applications
                    </h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="px-6 py-4 animate-pulse">
                                <div className="h-4 w-48 bg-parchment-sunken rounded mb-2"></div>
                                <div className="h-3 w-32 bg-slate-100 rounded"></div>
                            </div>
                        ))
                    ) : recentApplications.length > 0 ? (
                        recentApplications.map((app) => (
                            <div key={app.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-slate-900 truncate">
                                            {app.applicant?.full_name || 'Someone'} applied
                                        </p>
                                        <p className="text-sm text-slate-500 truncate">
                                            {app.job?.title} at {app.job?.company}
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-400 ml-4 shrink-0">{formatTimeAgo(app.applied_at)}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-slate-500">No recent applications</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// === GROWTH TAB ===
function GrowthTab({
    growthData,
    acquisitionChannels,
    loading,
    error,
}: {
    growthData: GrowthData | null;
    acquisitionChannels: AcquisitionChannel[];
    loading: boolean;
    error: boolean;
}) {
    // Memoize chart data to prevent re-renders
    const chartData = useMemo(() => acquisitionChannels, [acquisitionChannels]);

    if (error) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                <p className="text-yellow-700 font-medium">Data temporarily unavailable</p>
                <p className="text-yellow-600 text-sm mt-1">Growth metrics could not be loaded. Please try refreshing.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WoW Growth Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Week-over-Week Growth</h3>
                {loading ? (
                    <div className="animate-pulse">
                        <div className="h-10 w-24 bg-parchment-sunken rounded mb-2"></div>
                        <div className="h-4 w-32 bg-slate-100 rounded"></div>
                    </div>
                ) : growthData ? (
                    <>
                        <div className="flex items-center gap-2">
                            {growthData.growthRate >= 0 ? (
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            ) : (
                                <TrendingDown className="h-8 w-8 text-red-500" />
                            )}
                            <span
                                className={`text-3xl font-bold font-display ${growthData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                                {growthData.growthRate >= 0 ? '+' : ''}
                                {growthData.growthRate}%
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-2">
                            {growthData.currentWeekSignups} signups this week vs {growthData.previousWeekSignups} last week
                        </p>
                    </>
                ) : (
                    <p className="text-slate-400">No data available</p>
                )}
            </div>

            {/* Acquisition Channels Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Acquisition Channels</h3>
                {loading ? (
                    <div className="h-64 bg-slate-100 rounded animate-pulse"></div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                            <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400">No acquisition data available</div>
                )}
            </div>

            {/* Acquisition Breakdown Table */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-slate-900">Acquisition Breakdown</h3>
                </div>
                {loading ? (
                    <div className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-10 bg-parchment-sunken rounded"></div>
                            <div className="h-10 bg-slate-100 rounded"></div>
                            <div className="h-10 bg-parchment-sunken rounded"></div>
                        </div>
                    </div>
                ) : chartData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Source</th>
                                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Signups</th>
                                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Share</th>
                                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Distribution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {chartData.map((channel, i) => {
                                    const total = chartData.reduce((sum, c) => sum + c.count, 0);
                                    const percentage = total > 0 ? Math.round((channel.count / total) * 100) : 0;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: channel.color }}
                                                    ></div>
                                                    <span className="font-medium text-slate-900">{channel.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                                {channel.count.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600">
                                                {percentage}%
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-full bg-slate-100 rounded-full h-2 max-w-[200px]">
                                                    <div
                                                        className="h-2 rounded-full transition-all"
                                                        style={{ width: `${percentage}%`, backgroundColor: channel.color }}
                                                    ></div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400">No acquisition data available</div>
                )}
            </div>
        </div>
    );
}

// === FUNNEL TAB ===
function FunnelTab({
    funnelData,
    liquidityRatio,
    stats,
    loading,
}: {
    funnelData: FunnelStage[];
    liquidityRatio: number;
    stats: DashboardStats | null;
    loading: boolean;
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Liquidity Ratio Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Liquidity Ratio</h3>
                {loading ? (
                    <div className="animate-pulse">
                        <div className="h-10 w-20 bg-parchment-sunken rounded mb-2"></div>
                        <div className="h-4 w-40 bg-slate-100 rounded"></div>
                    </div>
                ) : (
                    <>
                        <p className="text-3xl font-bold font-display text-slate-900">{liquidityRatio}</p>
                        <p className="text-slate-500 text-sm mt-2">Active Jobs per Verified User</p>
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-600">
                                {stats?.activeJobs ?? 0} jobs / {stats?.verifiedUsers ?? 0} verified users
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Conversion Funnel Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-medium text-slate-500 mb-4">Conversion Funnel</h3>
                {loading ? (
                    <div className="h-64 bg-slate-100 rounded animate-pulse"></div>
                ) : funnelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <FunnelChart>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                            />
                            <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                                <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={12} />
                                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                                {funnelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400">No funnel data available</div>
                )}
            </div>
        </div>
    );
}

// === COMPLIANCE TAB ===
function ComplianceTab({
    euData,
    loading,
    error,
}: {
    euData: EUComplianceData | null;
    loading: boolean;
    error: boolean;
}) {
    if (error) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
                <p className="text-yellow-700 font-medium">Data temporarily unavailable</p>
                <p className="text-yellow-600 text-sm mt-1">EU compliance data could not be loaded. Please try refreshing.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* EU User Stats */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-500">EU User Base</h3>
                </div>
                {loading ? (
                    <div className="animate-pulse">
                        <div className="h-10 w-20 bg-parchment-sunken rounded mb-2"></div>
                        <div className="h-4 w-32 bg-slate-100 rounded"></div>
                    </div>
                ) : euData ? (
                    <>
                        <p className="text-3xl font-bold font-display text-slate-900">{euData.euUserCount.toLocaleString()}</p>
                        <p className="text-slate-500 text-sm mt-1">{euData.euPercentage}% of total users</p>
                        <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(euData.euPercentage, 100)}%` }}
                            ></div>
                        </div>
                    </>
                ) : (
                    <p className="text-slate-400">No data available</p>
                )}
            </div>

            {/* Compliance Audit Log */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900">Compliance Audit Log</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium">Date</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium">Action</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium">Status</th>
                                <th className="text-left px-6 py-3 text-slate-500 font-medium">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {COMPLIANCE_ACTIONS.map((action, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-600">{action.date}</td>
                                    <td className="px-6 py-4 text-slate-900 font-medium">{action.action}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${action.status === 'Passed'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}
                                        >
                                            {action.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{action.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// === ACQUISITION SOURCES SECTION ===
interface AcquisitionSourcesSectionProps {
    data: { source: string; count: number; percentage: number; color: string }[];
    conversionData: ConversionData[];
    loading: boolean;
}

function AcquisitionSourcesSection({ data, conversionData, loading }: AcquisitionSourcesSectionProps) {
    // Memoize chart data to prevent re-renders
    const chartData = useMemo(() => data, [data]);
    const conversionTableData = useMemo(() => conversionData, [conversionData]);
    const totalSignups = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);

    // Dev-only debug button for UTM localStorage
    const handleDebugUTM = () => {
        const utmData = localStorage.getItem('platform_attribution_data');
        console.log('[UTM Debug] Current localStorage data:', utmData ? JSON.parse(utmData) : 'No UTM data stored');
    };

    const isDev = import.meta.env.DEV;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-lg font-semibold text-slate-900">Acquisition Sources</h2>
                </div>
                <div className="flex items-center gap-3">
                    {isDev && (
                        <button
                            onClick={handleDebugUTM}
                            className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-parchment-sunken transition-colors"
                        >
                            Debug UTM
                        </button>
                    )}
                    <span className="text-sm text-slate-500">
                        {totalSignups.toLocaleString()} total signups
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                ) : chartData.length > 0 ? (
                    <div className="space-y-8">
                        {/* Top Row: Chart + Breakdown Table */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Chart */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-4">Distribution</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={chartData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                                        <YAxis
                                            dataKey="source"
                                            type="category"
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                            width={100}
                                            tickFormatter={(value) => value === 'Organic' ? 'Organic/Unknown' : value}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '8px',
                                                fontSize: '12px'
                                            }}
                                            formatter={(value) => [`${value ?? 0} signups`, 'Count']}
                                        />
                                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Breakdown Table */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-4">Source Breakdown</h3>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left px-4 py-2 text-slate-600 font-medium">Source</th>
                                                <th className="text-right px-4 py-2 text-slate-600 font-medium">Signups</th>
                                                <th className="text-right px-4 py-2 text-slate-600 font-medium">%</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {chartData.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full"
                                                                style={{ backgroundColor: item.color }}
                                                            ></div>
                                                            <span className="font-medium text-slate-800">
                                                                {item.source === 'Organic' ? 'Organic/Unknown' : item.source}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-slate-900 font-semibold">
                                                        {item.count.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-slate-600">
                                                        {item.percentage}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Conversion Tracking Table */}
                        {conversionTableData.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                    <h3 className="text-sm font-medium text-slate-500">Conversion Tracking</h3>
                                </div>
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-slate-600 font-medium">Source</th>
                                                <th className="text-right px-4 py-3 text-slate-600 font-medium">Total Signups</th>
                                                <th className="text-right px-4 py-3 text-slate-600 font-medium">Applications</th>
                                                <th className="text-right px-4 py-3 text-slate-600 font-medium">Conversion Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {conversionTableData.map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium text-slate-800">
                                                            {row.source === 'Organic' ? 'Organic/Unknown' : row.source}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-900">
                                                        {row.totalSignups.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-blue-600">
                                                        {row.applications.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${row.conversionRate > 50
                                                                ? 'bg-green-100 text-green-700'
                                                                : row.conversionRate > 25
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {row.conversionRate}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-12 text-center text-slate-400">
                        No acquisition data available yet
                    </div>
                )}
            </div>
        </div>
    );
}
