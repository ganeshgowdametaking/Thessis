import { supabase } from '../lib/supabase';

export interface DashboardStats {
    totalUsers: number;
    activeJobs: number;
    totalApplications: number;
    totalConnections: number;
    verifiedUsers: number;
    usersWithJobs: number;
}

export interface RecentUser {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    created_at: string;
}

export interface RecentApplication {
    id: string;
    applied_at: string;
    job: {
        title: string;
        company: string;
    } | null;
    applicant: {
        full_name: string | null;
    } | null;
}

export interface GrowthData {
    currentWeekSignups: number;
    previousWeekSignups: number;
    growthRate: number; // Percentage
}

export interface AcquisitionChannel {
    name: string;
    count: number;
    color: string;
}

export interface FunnelStage {
    name: string;
    value: number;
    fill: string;
}

export interface EUComplianceData {
    euUserCount: number;
    euPercentage: number;
    totalUsers: number;
}

// Acquisition source data for dashboard visualization
export interface AcquisitionSourceData {
    source: string;
    count: number;
    percentage: number;
    color: string;
}

// Conversion tracking data - signups to applications by source
export interface ConversionData {
    source: string;
    totalSignups: number;
    applications: number;
    conversionRate: number;  // applications / signups * 100
}

// EU member state codes
const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    // Country names for matching
    'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
    'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
    'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
    'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
    'Spain', 'Sweden'
];

// Channel colors for charts
const CHANNEL_COLORS: Record<string, string> = {
    'Organic': '#10B981',  // Green for organic
    'Direct': '#3B82F6',   // Blue for direct
    'Google': '#EA4335',   // Google red
    'LinkedIn': '#0A66C2', // LinkedIn blue
    'Twitter': '#1DA1F2',  // Twitter blue
    'Facebook': '#1877F2', // Facebook blue
    'Referral': '#F59E0B', // Amber for referrals
    'Newsletter': '#8B5CF6', // Purple
    'Other': '#6B7280',    // Gray for other
    'Organic/direct': '#10B981', // Alias
};

export const analyticsDataService = {
    /**
     * Get aggregate statistics for the dashboard (basic + extended)
     * verifiedUsers = users who have verified their secondary company domain email
     */
    async getStats(): Promise<DashboardStats> {
        const [usersResult, jobsResult, applicationsResult, connectionsResult, verifiedResult, usersWithJobsResult] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('jobs').select('*', { count: 'exact', head: true }),
            supabase.from('applications').select('*', { count: 'exact', head: true }),
            supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
            // Count users who verified their secondary company email
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('secondary_email_verified', true),
            supabase.from('jobs').select('created_by', { count: 'exact', head: false }),
        ]);

        // Count unique users who have posted jobs
        const uniqueJobPosters = new Set((usersWithJobsResult.data || []).map((j: { created_by: string }) => j.created_by)).size;

        return {
            totalUsers: usersResult.count ?? 0,
            activeJobs: jobsResult.count ?? 0,
            totalApplications: applicationsResult.count ?? 0,
            totalConnections: connectionsResult.count ?? 0,
            verifiedUsers: verifiedResult.count ?? 0, // Users with verified company email
            usersWithJobs: uniqueJobPosters,
        };
    },

    /**
     * Get recently joined users
     */
    async getRecentUsers(limit: number = 5): Promise<RecentUser[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent users:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get recent applications
     */
    async getRecentApplications(limit: number = 5): Promise<RecentApplication[]> {
        const { data, error } = await supabase
            .from('applications')
            .select(`
                id,
                applied_at,
                job:jobs!applications_job_id_fkey(title, company),
                applicant:profiles!applications_applicant_id_fkey(full_name)
            `)
            .order('applied_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent applications:', error);
            return [];
        }

        return (data as unknown as RecentApplication[]) || [];
    },

    /**
     * Get Week-over-Week growth data
     */
    async getGrowthData(): Promise<GrowthData> {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const [currentWeekResult, previousWeekResult] = await Promise.all([
            supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', oneWeekAgo.toISOString()),
            supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', twoWeeksAgo.toISOString())
                .lt('created_at', oneWeekAgo.toISOString()),
        ]);

        const currentWeekSignups = currentWeekResult.count ?? 0;
        const previousWeekSignups = previousWeekResult.count ?? 0;

        // Calculate growth rate
        let growthRate = 0;
        if (previousWeekSignups > 0) {
            growthRate = ((currentWeekSignups - previousWeekSignups) / previousWeekSignups) * 100;
        } else if (currentWeekSignups > 0) {
            growthRate = 100; // 100% growth from 0
        }

        return {
            currentWeekSignups,
            previousWeekSignups,
            growthRate: Math.round(growthRate * 10) / 10, // Round to 1 decimal
        };
    },

    /**
     * Get acquisition channel distribution from UTM source data
     */
    async getAcquisitionChannels(): Promise<AcquisitionChannel[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('utm_source');

        if (error) {
            console.error('Error fetching acquisition channels:', error);
            return [];
        }

        // Count by UTM source
        const counts: Record<string, number> = {};
        (data || []).forEach((profile: { utm_source: string | null }) => {
            // Display "Organic/Direct" for null values
            const source = profile.utm_source || 'Organic/Direct';
            // Normalize source names (capitalize first letter)
            const normalized = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
            counts[normalized] = (counts[normalized] || 0) + 1;
        });

        return Object.entries(counts).map(([name, count]) => ({
            name,
            count,
            color: CHANNEL_COLORS[name] || CHANNEL_COLORS['Other'],
        })).sort((a, b) => b.count - a.count);
    },

    /**
     * Get EU compliance data
     */
    async getEUComplianceData(): Promise<EUComplianceData> {
        // Get all users with their location/country data
        const { data, error, count: totalCount } = await supabase
            .from('profiles')
            .select('location, country', { count: 'exact' });

        if (error) {
            console.error('Error fetching EU compliance data:', error);
            return { euUserCount: 0, euPercentage: 0, totalUsers: 0 };
        }

        const totalUsers = totalCount ?? 0;

        // Count EU users by matching location or country against EU countries
        let euUserCount = 0;
        (data || []).forEach((profile: { location: string | null; country: string | null }) => {
            const location = (profile.location || '').toLowerCase();
            const country = (profile.country || '').toLowerCase();

            const isEU = EU_COUNTRIES.some(ec => {
                const euLower = ec.toLowerCase();
                return location.includes(euLower) || country.includes(euLower);
            });

            if (isEU) euUserCount++;
        });

        const euPercentage = totalUsers > 0 ? Math.round((euUserCount / totalUsers) * 100) : 0;

        return {
            euUserCount,
            euPercentage,
            totalUsers,
        };
    },

    /**
     * Build funnel data (client-side helper using base stats)
     */
    buildFunnelData(stats: DashboardStats): FunnelStage[] {
        return [
            { name: 'Total Signups', value: stats.totalUsers, fill: '#3B82F6' },
            { name: 'Verified Users', value: stats.verifiedUsers, fill: '#10B981' },
            { name: 'Posted a Job', value: stats.usersWithJobs, fill: '#8B5CF6' },
        ];
    },

    /**
     * Calculate liquidity ratio (client-side helper)
     */
    calculateLiquidityRatio(stats: DashboardStats): number {
        if (stats.verifiedUsers === 0) return 0;
        return Math.round((stats.activeJobs / stats.verifiedUsers) * 100) / 100;
    },

    /**
     * Get acquisition stats grouped by utm_source for charts
     * Returns data formatted for PieChart/BarChart display
     */
    async getAcquisitionStats(): Promise<{ source: string; count: number; color: string; percentage: number }[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('utm_source');

        if (error) {
            console.error('Error fetching acquisition stats:', error);
            return [];
        }

        // Count by UTM source
        const counts: Record<string, number> = {};
        let total = 0;

        (data || []).forEach((profile: { utm_source: string | null }) => {
            // Default to 'Organic' for null/empty values (matches SQL defaults)
            const source = profile.utm_source || 'Organic';
            // Capitalize first letter for display
            const normalized = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
            counts[normalized] = (counts[normalized] || 0) + 1;
            total++;
        });

        // Convert to array with colors and percentages
        return Object.entries(counts)
            .map(([source, count]) => ({
                source,
                count,
                color: CHANNEL_COLORS[source] || CHANNEL_COLORS['Other'],
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count);
    },

    /**
     * Get conversion data: signups to applications by UTM source
     * Shows which marketing sources produce the highest quality users
     */
    async getConversionData(): Promise<ConversionData[]> {
        // Fetch all profiles with their utm_source
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, utm_source');

        if (profilesError) {
            console.error('Error fetching profiles for conversion:', profilesError);
            return [];
        }

        // Fetch all applications with applicant_id
        const { data: applications, error: applicationsError } = await supabase
            .from('applications')
            .select('applicant_id');

        if (applicationsError) {
            console.error('Error fetching applications for conversion:', applicationsError);
            return [];
        }

        // Build a map of user_id -> application count
        const appCountByUser: Record<string, number> = {};
        (applications || []).forEach((app: { applicant_id: string }) => {
            appCountByUser[app.applicant_id] = (appCountByUser[app.applicant_id] || 0) + 1;
        });

        // Aggregate by UTM source
        const sourceStats: Record<string, { signups: number; applications: number }> = {};

        (profiles || []).forEach((profile: { id: string; utm_source: string | null }) => {
            const source = profile.utm_source || 'Organic';
            const normalized = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();

            if (!sourceStats[normalized]) {
                sourceStats[normalized] = { signups: 0, applications: 0 };
            }

            sourceStats[normalized].signups += 1;
            sourceStats[normalized].applications += appCountByUser[profile.id] || 0;
        });

        // Convert to array with conversion rates
        return Object.entries(sourceStats)
            .map(([source, stats]) => ({
                source,
                totalSignups: stats.signups,
                applications: stats.applications,
                conversionRate: stats.signups > 0
                    ? Math.round((stats.applications / stats.signups) * 100)
                    : 0,
            }))
            .sort((a, b) => b.applications - a.applications);
    },
};
