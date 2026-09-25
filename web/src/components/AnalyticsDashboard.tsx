import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Briefcase, FileText, Globe, Link2, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import {
    analyticsDataService,
    DashboardStats,
    RecentUser,
    RecentApplication,
    GrowthData,
    FunnelStage,
    EUComplianceData,
    ConversionData,
} from '../services/analyticsDataService';
import LoadingSpinner from './LoadingSpinner';

// Tab definitions
type TabId = 'overview' | 'growth' | 'funnel' | 'compliance';
const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'growth', label: 'Growth & acquisition' },
    { id: 'funnel', label: 'Referral funnel' },
    { id: 'compliance', label: 'EU members' },
];

// Chart colours from the style guide, used in order for acquisition sources.
const SOURCE_COLORS = ['#4353FF', '#2F39C7', '#7C86FF', '#C7CCFF', '#F59E0B', '#059669', '#14142B'];

const sourceLabel = (source: string) => (source === 'Organic' ? 'Organic / unknown' : source);

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

    // Memoized funnel data
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

    // Load growth data (lazy, on tab click). Where signups come from is already
    // loaded with the base data, so only the week-over-week numbers load here.
    const loadGrowthData = useCallback(async () => {
        if (hasFetchedGrowth.current) return;
        hasFetchedGrowth.current = true;
        setGrowthLoading(true);
        setGrowthError(false);

        try {
            const growth = await withTimeout(analyticsDataService.getGrowthData(), 4000);
            if (growth) setGrowthData(growth);
            else setGrowthError(true);
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
        setEUData(null);
        loadBaseData();
        // Reload whichever lazy tab is open, since its data was just cleared.
        if (activeTab === 'growth') loadGrowthData();
        if (activeTab === 'compliance') loadEUData();
    };

    // Show loading while auth is checking
    if (authLoading) {
        return (
            <div className="min-h-screen bg-parchment flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // Redirect if not authorized
    if (!user || !hasAccess) {
        return <Navigate to="/jobs" replace />;
    }

    return (
        <div className="min-h-screen bg-parchment text-slate-900 font-display">
            <main className="max-w-[1180px] mx-auto px-4 md:px-6 py-5 md:py-9 flex flex-col gap-4 md:gap-5">
                {/* Header */}
                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[11px] md:text-[11.5px] font-bold uppercase tracking-wider text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Admins only
                        </span>
                        <h1 className="font-display text-2xl md:text-[30px] font-extrabold text-ink mt-0.5">Analytics</h1>
                        <p className="hidden sm:block text-sm text-slate-500 mt-0.5">How Thessis is growing and how referrals are flowing.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {lastUpdated && (
                            <span className="hidden sm:inline text-[12.5px] text-slate-500">Updated {formatTimeAgo(lastUpdated.toISOString())}</span>
                        )}
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading}
                            aria-label="Refresh"
                            className="h-10 w-10 sm:w-auto sm:px-3.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-ink hover:bg-parchment-sunken transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>
                {lastUpdated && <p className="sm:hidden -mt-3 text-xs text-slate-500">Updated {formatTimeAgo(lastUpdated.toISOString())}</p>}

                {/* Error State */}
                {error && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-danger-tint px-4 py-3" role="alert">
                        <div className="flex gap-2.5 min-w-0">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                            <div className="text-[12.5px]">
                                <p className="font-bold text-red-600">Couldn't load analytics</p>
                                <p className="text-slate-600">{error}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="shrink-0 h-9 px-3.5 rounded-lg border border-red-200 bg-white text-red-600 text-[12.5px] font-bold hover:bg-red-50 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Headline numbers */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3.5">
                    <StatCard
                        title="Members"
                        value={stats?.totalUsers ?? 0}
                        detail={<><strong className="text-ink">{(stats?.verifiedUsers ?? 0).toLocaleString()}</strong> with a verified work email</>}
                        icon={Users}
                        tone="bg-ink-wash text-primary"
                        loading={loading}
                    />
                    <StatCard
                        title="Jobs posted"
                        value={stats?.activeJobs ?? 0}
                        detail={<>By <strong className="text-ink">{(stats?.usersWithJobs ?? 0).toLocaleString()}</strong> different members · all time</>}
                        icon={Briefcase}
                        tone="bg-success-tint text-success-ink"
                        loading={loading}
                    />
                    <StatCard
                        title="Applications"
                        value={stats?.totalApplications ?? 0}
                        detail="All time, across every job"
                        icon={FileText}
                        tone="bg-amber-tint text-amber-ink"
                        loading={loading}
                    />
                    <StatCard
                        title="Connections"
                        value={stats?.totalConnections ?? 0}
                        detail="Accepted connection requests"
                        icon={Link2}
                        tone="bg-violet-50 text-violet-700"
                        loading={loading}
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-5 md:gap-6 border-b border-slate-200 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0" role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`shrink-0 py-3 text-[13px] md:text-[13.5px] font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-ink' : 'border-transparent text-slate-500 hover:text-ink'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[360px]">
                    {activeTab === 'overview' && (
                        <OverviewTab recentUsers={recentUsers} recentApplications={recentApplications} loading={loading} />
                    )}
                    {activeTab === 'growth' && (
                        <GrowthTab
                            growthData={growthData}
                            growthLoading={growthLoading}
                            growthError={growthError}
                            sources={acquisitionSources}
                            conversionData={conversionData}
                            sourcesLoading={acquisitionLoading}
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

// === SHARED PIECES ===
function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={`bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col gap-3.5 ${className}`}>
            <div>
                <h2 className="font-display text-[15.5px] font-extrabold text-ink">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

function Unavailable({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-tint/60 px-4 py-6 text-center">
            <p className="text-sm font-bold text-ink">{title}</p>
            <p className="text-[12.5px] text-slate-600 mt-1">{body}</p>
        </div>
    );
}

// === STAT CARD COMPONENT ===
interface StatCardProps {
    title: string;
    value: number;
    detail: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    loading: boolean;
}

function StatCard({ title, value, detail, icon: Icon, tone, loading }: StatCardProps) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 md:px-5 md:py-[18px] flex flex-col gap-2 md:gap-2.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] md:text-[12.5px] font-semibold text-slate-500">{title}</span>
                <span className={`size-7 md:size-[34px] shrink-0 rounded-lg md:rounded-[10px] flex items-center justify-center ${tone}`}>
                    <Icon className="h-3.5 w-3.5 md:h-[18px] md:w-[18px]" />
                </span>
            </div>
            {loading ? (
                <>
                    <div className="h-7 md:h-8 w-20 rounded bg-parchment-sunken animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-parchment-sunken animate-pulse" />
                </>
            ) : (
                <>
                    <p className="font-display text-[22px] md:text-[30px] leading-none font-extrabold text-ink">{value.toLocaleString()}</p>
                    <p className="text-[10.5px] md:text-xs leading-snug text-slate-500">{detail}</p>
                </>
            )}
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
    const skeletonRows = [0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 animate-pulse">
            <div className="size-9 rounded-full bg-parchment-sunken" />
            <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3 w-32 rounded bg-parchment-sunken" />
                <div className="h-2.5 w-44 rounded bg-slate-100" />
            </div>
        </div>
    ));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 items-start">
            <Card title="Recent signups" subtitle="The 5 newest members">
                <div className="flex flex-col divide-y divide-slate-100">
                    {loading ? skeletonRows : recentUsers.length > 0 ? (
                        recentUsers.map((member) => {
                            const name = member.full_name || 'Unnamed member';
                            const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                            return (
                                <div key={member.id} className="flex items-center gap-3 py-2.5">
                                    {member.avatar_url ? (
                                        <img src={member.avatar_url} alt="" className="size-9 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <span className="size-9 shrink-0 rounded-full bg-ink-wash text-primary-hover text-xs font-extrabold flex items-center justify-center">{initials}</span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13.5px] font-bold text-ink truncate">{name}</p>
                                        <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                    </div>
                                    <span className="text-[11.5px] text-slate-500 shrink-0">{formatTimeAgo(member.created_at)}</span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="py-8 text-center text-sm text-slate-500">No recent signups</p>
                    )}
                </div>
            </Card>

            <Card title="Recent applications" subtitle="The 5 newest applications">
                <div className="flex flex-col divide-y divide-slate-100">
                    {loading ? skeletonRows : recentApplications.length > 0 ? (
                        recentApplications.map((app) => (
                            <div key={app.id} className="flex items-center gap-3 py-2.5">
                                <span className="size-9 shrink-0 rounded-[10px] bg-amber-tint text-amber-ink flex items-center justify-center">
                                    <FileText className="h-4 w-4" />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13.5px] text-ink truncate"><strong>{app.applicant?.full_name || 'Someone'}</strong> applied</p>
                                    <p className="text-xs text-slate-500 truncate">{app.job?.title} at {app.job?.company}</p>
                                </div>
                                <span className="text-[11.5px] text-slate-500 shrink-0">{formatTimeAgo(app.applied_at)}</span>
                            </div>
                        ))
                    ) : (
                        <p className="py-8 text-center text-sm text-slate-500">No recent applications</p>
                    )}
                </div>
            </Card>
        </div>
    );
}

// === GROWTH & ACQUISITION TAB ===
function SourcesDonut({ sources, total }: { sources: { source: string; count: number }[]; total: number }) {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return (
        <div className="relative size-[150px] md:size-[170px] shrink-0">
            <svg viewBox="0 0 160 160" className="size-full" aria-hidden="true">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="22" />
                {sources.map((item, index) => {
                    const length = total > 0 ? (circumference * item.count) / total : 0;
                    const segment = (
                        <circle
                            key={item.source}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                            strokeWidth="22"
                            strokeDasharray={`${Math.max(0, length - (sources.length > 1 ? 2 : 0))} ${circumference}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 80 80)"
                        />
                    );
                    offset += length;
                    return segment;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-extrabold text-ink">{total.toLocaleString()}</span>
                <span className="text-[11px] text-slate-500">signups</span>
            </div>
        </div>
    );
}

function GrowthTab({
    growthData,
    growthLoading,
    growthError,
    sources,
    conversionData,
    sourcesLoading,
}: {
    growthData: GrowthData | null;
    growthLoading: boolean;
    growthError: boolean;
    sources: { source: string; count: number; percentage: number; color: string }[];
    conversionData: ConversionData[];
    sourcesLoading: boolean;
}) {
    const totalSignups = useMemo(() => sources.reduce((sum, item) => sum + item.count, 0), [sources]);
    const perSignupRows = useMemo(
        () => conversionData.map((row) => ({ ...row, perSignup: row.totalSignups > 0 ? row.applications / row.totalSignups : 0 })),
        [conversionData]
    );
    const maxPerSignup = Math.max(1, ...perSignupRows.map((row) => row.perSignup));

    // Dev-only debug button for UTM localStorage
    const handleDebugUTM = () => {
        const utmData = localStorage.getItem('platform_attribution_data');
        console.log('[UTM Debug] Current localStorage data:', utmData ? JSON.parse(utmData) : 'No UTM data stored');
    };
    const isDev = import.meta.env.DEV;

    const weekMax = growthData ? Math.max(1, growthData.currentWeekSignups, growthData.previousWeekSignups) : 1;

    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col lg:flex-row gap-4 md:gap-5 items-stretch">
                <Card title="Signups this week" className="lg:w-[340px] shrink-0">
                    {growthError ? (
                        <Unavailable title="Growth numbers are taking too long" body="They didn't load within 4 seconds. Refresh to try again." />
                    ) : growthLoading || !growthData ? (
                        <div className="flex flex-col gap-3 animate-pulse">
                            <div className="h-9 w-24 rounded bg-parchment-sunken" />
                            <div className="h-2.5 w-full rounded bg-slate-100" />
                            <div className="h-2.5 w-3/4 rounded bg-slate-100" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2.5">
                                <span className="font-display text-[34px] leading-none font-extrabold text-ink">{growthData.currentWeekSignups.toLocaleString()}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-bold ${growthData.growthRate >= 0 ? 'bg-success-tint text-success-ink' : 'bg-danger-tint text-red-600'}`}>
                                    {growthData.growthRate >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                    {growthData.growthRate >= 0 ? '+' : ''}{growthData.growthRate}%
                                </span>
                            </div>
                            <div className="flex flex-col gap-2 text-xs">
                                {[
                                    { label: 'This week', value: growthData.currentWeekSignups, color: 'bg-primary' },
                                    { label: 'Last week', value: growthData.previousWeekSignups, color: 'bg-indigo-200' },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center gap-2.5">
                                        <span className="w-[70px] text-slate-500">{row.label}</span>
                                        <div className="flex-1 h-2.5 rounded-full bg-parchment-sunken overflow-hidden">
                                            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.value / weekMax) * 100}%` }} />
                                        </div>
                                        <span className="w-8 text-right font-bold text-ink">{row.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11.5px] text-slate-500">Last 7 days compared with the 7 days before.</p>
                        </>
                    )}
                </Card>

                <Card
                    title="Where members come from"
                    subtitle={<>From the sign-up link's UTM source · all time{isDev && (
                        <button type="button" onClick={handleDebugUTM} className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-parchment-sunken">Debug UTM</button>
                    )}</>}
                    className="flex-1 min-w-0"
                >
                    {sourcesLoading ? (
                        <div className="flex items-center gap-6 animate-pulse">
                            <div className="size-[150px] rounded-full border-[22px] border-parchment-sunken" />
                            <div className="flex-1 flex flex-col gap-3">
                                {[0, 1, 2].map((i) => <div key={i} className="h-3 rounded bg-parchment-sunken" />)}
                            </div>
                        </div>
                    ) : sources.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-5 md:gap-7">
                            <SourcesDonut sources={sources} total={totalSignups} />
                            <ul className="w-full flex-1 flex flex-col gap-2.5">
                                {sources.map((item, index) => (
                                    <li key={item.source} className="flex items-center gap-2.5 text-[13px]">
                                        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} />
                                        <span className="flex-1 font-semibold text-ink truncate">{sourceLabel(item.source)}</span>
                                        <span className="text-slate-500">{item.count.toLocaleString()}</span>
                                        <span className="w-10 text-right font-bold text-ink">{item.percentage}%</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="py-10 text-center text-sm text-slate-500">No acquisition data yet</p>
                    )}
                </Card>
            </div>

            {!sourcesLoading && perSignupRows.length > 0 && (
                <Card title="Applications per signup, by source" subtitle="Total applications from members of each source, divided by how many signed up">
                    <div className="overflow-x-auto -mx-1 px-1">
                        <table className="w-full min-w-[520px] text-[13px]">
                            <thead>
                                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="text-left font-bold pb-2">Source</th>
                                    <th className="text-right font-bold pb-2">Signups</th>
                                    <th className="text-right font-bold pb-2">Applications</th>
                                    <th className="text-left font-bold pb-2 pl-6 w-[40%]">Per signup</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {perSignupRows.map((row) => (
                                    <tr key={row.source}>
                                        <td className="py-2.5 font-bold text-ink">{sourceLabel(row.source)}</td>
                                        <td className="py-2.5 text-right text-slate-600">{row.totalSignups.toLocaleString()}</td>
                                        <td className="py-2.5 text-right text-slate-600">{row.applications.toLocaleString()}</td>
                                        <td className="py-2.5 pl-6">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex-1 h-2 rounded-full bg-parchment-sunken overflow-hidden">
                                                    <div className="h-full rounded-full bg-primary" style={{ width: `${(row.perSignup / maxPerSignup) * 100}%` }} />
                                                </div>
                                                <strong className="w-9 text-ink">{row.perSignup.toFixed(1)}</strong>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}

// === FUNNEL TAB ===
const FUNNEL_STEPS = [
    { label: 'Signed up', note: 'Everyone with a Thessis account', color: 'bg-primary' },
    { label: 'Verified a work email', note: 'Confirmed where they work', color: 'bg-primary-hover' },
    { label: 'Posted a job', note: 'Different members who have posted at least one role', color: 'bg-success' },
];

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
    const base = funnelData[0]?.value ?? 0;

    return (
        <div className="flex flex-col lg:flex-row gap-4 md:gap-5 items-start">
            <Card title="Referral funnel" subtitle="How many members reach each step" className="w-full flex-1 min-w-0">
                {loading ? (
                    <div className="flex flex-col gap-4 animate-pulse">
                        {[0, 1, 2].map((i) => <div key={i} className="h-9 rounded-[10px] bg-parchment-sunken" />)}
                    </div>
                ) : funnelData.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {funnelData.map((stage, index) => {
                            const step = FUNNEL_STEPS[index] ?? { label: stage.name, note: '', color: 'bg-primary' };
                            const share = base > 0 ? (stage.value / base) * 100 : 0;
                            return (
                                <div key={stage.name} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between gap-3 text-[12.5px]">
                                        <span className="font-bold text-ink">{step.label}</span>
                                        {index > 0 && <span className="font-bold text-slate-500">{Math.round(share)}% of members</span>}
                                    </div>
                                    <div className="h-[34px] rounded-[10px] bg-parchment-sunken overflow-hidden">
                                        <div
                                            className={`h-full rounded-[10px] ${step.color} flex items-center pl-3 font-display text-sm font-extrabold text-white`}
                                            style={{ width: `${Math.max(share, stage.value > 0 ? 9 : 0)}%` }}
                                        >
                                            {stage.value.toLocaleString()}
                                        </div>
                                    </div>
                                    {step.note && <span className="text-[11.5px] text-slate-500">{step.note}</span>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="py-10 text-center text-sm text-slate-500">No funnel data yet</p>
                )}
            </Card>

            <Card title="Jobs per verified member" className="w-full lg:w-[340px] shrink-0">
                {loading ? (
                    <div className="flex flex-col gap-2 animate-pulse">
                        <div className="h-9 w-20 rounded bg-parchment-sunken" />
                        <div className="h-10 rounded-xl bg-slate-100" />
                    </div>
                ) : (
                    <>
                        <p className="font-display text-[34px] leading-none font-extrabold text-ink">{liquidityRatio}</p>
                        <p className="rounded-xl bg-parchment px-3 py-2.5 text-[12.5px] text-slate-600">
                            {(stats?.activeJobs ?? 0).toLocaleString()} jobs posted ÷ {(stats?.verifiedUsers ?? 0).toLocaleString()} members with a verified work email
                        </p>
                        <p className="text-[11.5px] text-slate-500">Counts every job ever posted, including closed ones.</p>
                    </>
                )}
            </Card>
        </div>
    );
}

// === EU MEMBERS TAB ===
function ComplianceTab({
    euData,
    loading,
    error,
}: {
    euData: EUComplianceData | null;
    loading: boolean;
    error: boolean;
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 items-start">
            <Card title="EU members" subtitle="Members who appear to be in the EU">
                {error ? (
                    <Unavailable title="EU numbers are taking too long" body="They didn't load within 4 seconds. Refresh to try again." />
                ) : loading || !euData ? (
                    <div className="flex flex-col gap-3 animate-pulse">
                        <div className="h-9 w-20 rounded bg-parchment-sunken" />
                        <div className="h-2.5 w-full rounded-full bg-slate-100" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-baseline gap-2.5">
                            <span className="font-display text-[34px] leading-none font-extrabold text-ink">{euData.euUserCount.toLocaleString()}</span>
                            <span className="text-[13px] text-slate-500">{euData.euPercentage}% of all members</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-parchment-sunken overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(euData.euPercentage, 100)}%` }} />
                        </div>
                        <p className="text-[11.5px] leading-relaxed text-slate-500">
                            Estimated from the location and country members typed on their profile, so it may miss some people.
                        </p>
                    </>
                )}
            </Card>

            <Card title="Compliance audit log">
                <div className="rounded-xl border-[1.5px] border-dashed border-slate-200 px-5 py-7 flex flex-col items-center gap-1.5 text-center">
                    <span className="size-11 rounded-full bg-parchment-sunken text-slate-500 flex items-center justify-center mb-1">
                        <Globe className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-bold text-ink">Not connected yet</p>
                    <p className="text-[12.5px] leading-relaxed text-slate-500 max-w-xs">
                        Consent checks, data-retention audits and export requests aren't recorded anywhere yet, so there's nothing to show.
                    </p>
                </div>
            </Card>
        </div>
    );
}
