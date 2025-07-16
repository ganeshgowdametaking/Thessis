import React, { useState, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import worldCountriesRaw from './world_countries.json';
import { useAuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { analyticsService } from '../services/analyticsService';
import { useEUDetection } from '../hooks/useEUDetection';
import type { Feature, FeatureCollection } from 'geojson';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  Eye,
  Calendar,
  Globe,
  Activity,
  BarChart3,
  TestTube,
  Settings,
  RefreshCw
} from 'lucide-react';
import { countryCodeToName } from '../utils/countryMapping';
import { supabase } from '../lib/supabase';

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

// Debug logs to diagnose blank map
console.log('worldCountries', worldCountriesRaw);
console.log('worldCountries.features', (worldCountriesRaw as any).features?.length);

const worldCountries = worldCountriesRaw as FeatureCollection;

const AnalyticsPage: React.FC = () => {
  const { user, profile, isAdmin, loading } = useAuthContext();
  const { isEUUser, loading: euLoading } = useEUDetection();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [euVisitorStats, setEuVisitorStats] = useState<EUVisitorStats | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'eu-visitors'>('overview');
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
    const interval = setInterval(updateTrackingData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isEUUser, euLoading]);

  // Test functions
  const testNonEUTracking = () => {
    localStorage.removeItem('is_eu_user');
    localStorage.removeItem('gdpr_consent');
    analyticsService.init();
    analyticsService.trackPageView('/test-page');
    analyticsService.trackEvent('test_event', { test: 'data' });
    alert('Non-EU tracking test completed! Check console for logs.');
  };

  const testEUTracking = () => {
    localStorage.setItem('is_eu_user', 'true');
    localStorage.setItem('gdpr_consent', 'true');
    analyticsService.trackEUVisitor();
    alert('EU tracking test completed! Check console for logs.');
  };

  const testEUSignup = () => {
    analyticsService.trackEUSignup();
    alert('EU signup tracking test completed!');
  };

  const clearAllData = () => {
    localStorage.clear();
    alert('All tracking data cleared!');
  };

  if (loading || loadingData || euLoading) {
    return <LoadingSpinner text="Loading analytics..." />;
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/jobs" replace />;
  }

  if (error) {
    return (
      <div className="text-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-xl p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Analytics</h2>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const userGrowthData = analyticsData ? [
    {
      id: 'Users',
      color: 'hsl(210, 70%, 50%)',
      data: analyticsData.timeSeriesData.users.map(item => ({
        x: item.date,
        y: item.count
      }))
    }
  ] : [];

  const jobGrowthData = analyticsData ? [
    {
      id: 'Jobs',
      color: 'hsl(160, 70%, 50%)',
      data: analyticsData.timeSeriesData.jobs.map(item => ({
        x: item.date,
        y: item.count
      }))
    }
  ] : [];

  const geographicMapData = analyticsData && analyticsData.geographicData ? 
    analyticsData.geographicData.map((item: { country: string; count: number }) => ({
      id: item.country,
      value: item.count
    })) : [];

  const companyData = analyticsData && analyticsData.topCompanies ? analyticsData.topCompanies.map(item => ({
    company: item.company,
    jobs: item.jobCount
  })) : [];

  const userDistributionData = analyticsData && analyticsData.userStats ? [
    {
      id: 'Verified Users',
      label: 'Verified Users',
      value: analyticsData.userStats.verifiedUsers,
      color: 'hsl(160, 70%, 50%)'
    },
    {
      id: 'Unverified Users',
      label: 'Unverified Users',
      value: analyticsData.userStats.totalUsers - analyticsData.userStats.verifiedUsers,
      color: 'hsl(0, 70%, 50%)'
    }
  ] : [];

  return (
    <div className="text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs ${trackingStatus.analyticsInitialized ? 'bg-green-600' : 'bg-red-600'}`}>
              {trackingStatus.analyticsInitialized ? 'Tracking Active' : 'Tracking Inactive'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs ${trackingStatus.isEUUser ? 'bg-blue-600' : 'bg-gray-600'}`}>
              {trackingStatus.isEUUser ? 'EU User' : 'Non-EU User'}
            </span>
          </div>
        </div>



        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-[#23272f] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tracking' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Session Tracking</span>
          </button>
          <button
            onClick={() => setActiveTab('eu-visitors')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'eu-visitors' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>EU Visitors</span>
          </button>
            </div>

                {/* Overview Tab */}
        {activeTab === 'overview' && (
          analyticsData ? (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <div className="text-3xl font-bold text-blue-400">{analyticsData.userStats.totalUsers.toLocaleString()}</div>
                  <div className="text-gray-400">Total Users</div>
                  <div className="text-sm text-green-400 mt-2">
                    +{analyticsData.userStats.newUsersThisMonth} this month
            </div>
          </div>
                
                <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <div className="text-3xl font-bold text-green-400">{analyticsData.jobStats.totalJobs.toLocaleString()}</div>
                  <div className="text-gray-400">Total Jobs</div>
                  <div className="text-sm text-blue-400 mt-2">
                    {analyticsData.jobStats.activeJobs} active
          </div>
        </div>

                <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <div className="text-3xl font-bold text-orange-400">{analyticsData.jobStats.totalApplications.toLocaleString()}</div>
                  <div className="text-gray-400">Applications</div>
                  <div className="text-sm text-green-400 mt-2">
                    {analyticsData.jobStats.totalJobs > 0 ? Math.round(analyticsData.jobStats.totalApplications / analyticsData.jobStats.totalJobs) : 0} per job
                  </div>
                </div>

                <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <div className="text-3xl font-bold text-yellow-400">{analyticsData.userStats.verifiedSecondaryEmailUsers.toLocaleString()}</div>
                  <div className="text-gray-400">Verified Users</div>
                  <div className="text-sm text-blue-400 mt-2">
                    {analyticsData.userStats.totalUsers > 0 ? ((analyticsData.userStats.verifiedSecondaryEmailUsers / analyticsData.userStats.totalUsers) * 100).toFixed(1) : 0}% of total
                  </div>
                </div>
              </div>

              {/* User Distribution by Country */}
              <div className="bg-[#181b23] rounded-xl p-6 mb-8 shadow">
                <h2 className="text-2xl font-bold mb-4">User Distribution by Country</h2>
                <div className="h-[500px] w-full">
                  {geographicMapData.length === 0 ? (
                    <div className="text-gray-400 text-center mt-20">No country data available.</div>
                  ) : (
                                      <ResponsiveBar
                    data={geographicMapData.sort((a: any, b: any) => b.value - a.value)}
                      keys={["value"]}
                      indexBy="id"
                      layout="horizontal"
                      margin={{ top: 20, right: 40, bottom: 40, left: 80 }}
                      padding={0.3}
                      colors={{ scheme: 'category10' }}
                      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                      axisTop={null}
                      axisRight={null}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Users',
                        legendPosition: 'middle',
                        legendOffset: 32
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Country',
                        legendPosition: 'middle',
                        legendOffset: -60
                      }}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                      theme={{
                        axis: { ticks: { text: { fill: '#fff' } } },
                        tooltip: { container: { background: '#23272f', color: '#fff' } },
                        labels: { text: { fill: '#fff' } },
                      }}
                      tooltip={({ id, value }) => (
                        <div style={{ background: '#23272f', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 14 }}>
                          <strong>{id}</strong>: {value} user{value !== 1 ? 's' : ''}
                        </div>
                      )}
                    />
                  )}
                </div>
              </div>







              {/* Growth Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <h2 className="text-lg font-bold mb-4">User Growth (Last 30 Days)</h2>
            <div className="h-56">
              <ResponsiveLine
                      data={userGrowthData}
                      margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: '',
                        legendOffset: 40,
                        legendPosition: 'middle',
                        tickValues: userGrowthData[0]?.data.filter((_, i) => i % 4 === 0).map(d => d.x) || [],
                        format: (value) => value,
                      }}
                axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: '', legendOffset: -40, legendPosition: 'middle' }}
                colors={{ scheme: 'category10' }}
                pointSize={8}
                pointColor={{ theme: 'background' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                enableGridX={false}
                enableGridY={true}
                theme={{
                  axis: { ticks: { text: { fill: '#fff' } } },
                  grid: { line: { stroke: '#444', strokeDasharray: '2 2' } },
                  tooltip: { container: { background: '#23272f', color: '#fff' } },
                }}
                useMesh={true}
                legends={[]}
              />
            </div>
          </div>
                
          <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <h2 className="text-lg font-bold mb-4">Job Growth (Last 30 Days)</h2>
            <div className="h-56">
              <ResponsiveLine
                      data={jobGrowthData}
                      margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: '',
                        legendOffset: 40,
                        legendPosition: 'middle',
                        tickValues: jobGrowthData[0]?.data.filter((_, i) => i % 4 === 0).map(d => d.x) || [],
                        format: (value) => value,
                      }}
                axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: '', legendOffset: -40, legendPosition: 'middle' }}
                colors={{ scheme: 'category10' }}
                pointSize={8}
                pointColor={{ theme: 'background' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                enableGridX={false}
                enableGridY={true}
                theme={{
                  axis: { ticks: { text: { fill: '#fff' } } },
                  grid: { line: { stroke: '#444', strokeDasharray: '2 2' } },
                  tooltip: { container: { background: '#23272f', color: '#fff' } },
                }}
                useMesh={true}
                legends={[]}
              />
            </div>
          </div>
        </div>

              {/* Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* User Distribution */}
                <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <h2 className="text-lg font-bold mb-4">User Verification Status</h2>
                  <div className="h-48">
                    <ResponsivePie
                      data={userDistributionData}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      innerRadius={0.5}
                      padAngle={0.7}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      colors={{ scheme: 'category10' }}
                      borderWidth={1}
                      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                      arcLinkLabelsSkipAngle={10}
                      arcLinkLabelsTextColor="#fff"
                      arcLinkLabelsThickness={2}
                      arcLinkLabelsColor={{ from: 'color' }}
                      arcLabelsSkipAngle={10}
                      arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                      theme={{
                        tooltip: { container: { background: '#23272f', color: '#fff' } },
                      }}
                    />
                  </div>
                </div>

                {/* Top Companies */}
                <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <h2 className="text-lg font-bold mb-4">Top Companies by Job Posts</h2>
                  <div className="h-48">
                    <ResponsiveBar
                      data={companyData}
                      keys={['jobs']}
                      indexBy="company"
                      margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                      padding={0.3}
                      colors={{ scheme: 'category10' }}
                      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                      axisTop={null}
                      axisRight={null}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: 'Company',
                        legendPosition: 'middle',
                        legendOffset: 40
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Jobs',
                        legendPosition: 'middle',
                        legendOffset: -40
                      }}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                      theme={{
                        axis: { ticks: { text: { fill: '#fff' } } },
                        tooltip: { container: { background: '#23272f', color: '#fff' } },
                      }}
                    />
                  </div>
                </div>

                {/* EU Users */}
                <div className="bg-[#23272f] rounded-xl p-6 shadow">
                  <h2 className="text-lg font-bold mb-4">EU Users</h2>
                  <div className="flex flex-col items-center justify-center h-48">
                    <span className="text-4xl font-bold text-yellow-400">{analyticsData.userStats.euUsers.toLocaleString()}</span>
                    <span className="text-gray-400 mt-2">EU Users</span>
                    <span className="text-sm text-gray-500 mt-1">{((analyticsData.userStats.euUsers / analyticsData.userStats.totalUsers) * 100).toFixed(1)}% of all users</span>
                  </div>
                </div>
              </div>

              {/* Detailed Statistics Table */}
              <div className="bg-[#23272f] rounded-xl p-6 shadow">
                <h2 className="text-2xl font-bold mb-4">Platform Statistics</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="px-4 py-2 text-left">Metric</th>
                        <th className="px-4 py-2 text-left">Value</th>
                        <th className="px-4 py-2 text-left">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-700">
                        <td className="px-4 py-2">Verified Users</td>
                        <td className="px-4 py-2">{analyticsData.userStats.verifiedSecondaryEmailUsers.toLocaleString()}</td>
                        <td className="px-4 py-2">{analyticsData.userStats.totalUsers > 0 ? ((analyticsData.userStats.verifiedSecondaryEmailUsers / analyticsData.userStats.totalUsers) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="px-4 py-2">Active Jobs</td>
                        <td className="px-4 py-2">{analyticsData.jobStats.activeJobs.toLocaleString()}</td>
                        <td className="px-4 py-2">{analyticsData.jobStats.totalJobs > 0 ? ((analyticsData.jobStats.activeJobs / analyticsData.jobStats.totalJobs) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="px-4 py-2">EU Users</td>
                        <td className="px-4 py-2">{analyticsData.userStats.euUsers.toLocaleString()}</td>
                        <td className="px-4 py-2">{analyticsData.userStats.totalUsers > 0 ? ((analyticsData.userStats.euUsers / analyticsData.userStats.totalUsers) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr className="border-b border-gray-700">
                        <td className="px-4 py-2">New Users This Month</td>
                        <td className="px-4 py-2">{analyticsData.userStats.newUsersThisMonth.toLocaleString()}</td>
                        <td className="px-4 py-2">{analyticsData.userStats.totalUsers > 0 ? ((analyticsData.userStats.newUsersThisMonth / analyticsData.userStats.totalUsers) * 100).toFixed(1) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Avg Applications per Job</td>
                        <td className="px-4 py-2">{analyticsData.jobStats.avgApplicationsPerJob.toFixed(1)}</td>
                        <td className="px-4 py-2">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#23272f] rounded-xl p-8 shadow">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-300 mb-2">Analytics Data Unavailable</h2>
                <p className="text-gray-400 mb-4">
                  {loadingData ? 'Loading analytics data...' : 'Unable to load analytics data. Please try again later.'}
                </p>
                {error && (
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          )
        )}

        {/* Session Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            {/* Tracking Status */}
            <div className="bg-[#23272f] rounded-xl p-6 shadow">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Activity className="w-6 h-6 mr-2" />
                Session Tracking Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#181b23] rounded-lg p-4">
                  <div className="text-sm text-gray-400">Analytics Status</div>
                  <div className={`text-lg font-semibold ${trackingStatus.analyticsInitialized ? 'text-green-400' : 'text-red-400'}`}>
                    {trackingStatus.analyticsInitialized ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="bg-[#181b23] rounded-lg p-4">
                  <div className="text-sm text-gray-400">Session ID</div>
                  <div className="text-lg font-semibold text-blue-400 font-mono">
                    {trackingStatus.sessionId}
                  </div>
                </div>
                <div className="bg-[#181b23] rounded-lg p-4">
                  <div className="text-sm text-gray-400">First Visit</div>
                  <div className={`text-lg font-semibold ${trackingStatus.isFirstVisit ? 'text-green-400' : 'text-gray-400'}`}>
                    {trackingStatus.isFirstVisit ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="bg-[#181b23] rounded-lg p-4">
                  <div className="text-sm text-gray-400">User Type</div>
                  <div className={`text-lg font-semibold ${trackingStatus.isEUUser ? 'text-blue-400' : 'text-orange-400'}`}>
                    {trackingStatus.isEUUser ? 'EU User' : 'Non-EU User'}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Session Data */}
            {sessionData && (
              <div className="bg-[#23272f] rounded-xl p-6 shadow">
                <h3 className="text-xl font-bold mb-4">Current Session</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-300 mb-2">Session Info</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Start Time:</span> {new Date(sessionData.startTime).toLocaleString()}</div>
                      <div><span className="text-gray-400">Last Activity:</span> {new Date(sessionData.lastActivity).toLocaleString()}</div>
                      <div><span className="text-gray-400">Page Views:</span> {sessionData.pageViews.length}</div>
                      <div><span className="text-gray-400">Interactions:</span> {sessionData.interactions.length}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-300 mb-2">Device Info</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">Screen:</span> {sessionData.screenResolution}</div>
                      <div><span className="text-gray-400">Timezone:</span> {sessionData.timezone}</div>
                      <div><span className="text-gray-400">Referrer:</span> {sessionData.referrer || 'Direct'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Interactions */}
            {sessionData && sessionData.interactions.length > 0 && (
              <div className="bg-[#23272f] rounded-xl p-6 shadow">
                <h3 className="text-xl font-bold mb-4">Recent Interactions</h3>
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {sessionData.interactions.slice(-10).map((interaction: any, index: number) => (
                      <div key={index} className="bg-[#181b23] rounded-lg p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-blue-400">{interaction.type}</span>
                            {interaction.elementId && (
                              <span className="text-gray-400 ml-2">({interaction.elementId})</span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs">
                            {new Date(interaction.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {interaction.page && (
                          <div className="text-gray-400 text-xs mt-1">Page: {interaction.page}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!sessionData && (
              <div className="bg-[#23272f] rounded-xl p-6 shadow">
                <div className="text-center text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No session data available</p>
                  <p className="text-sm mt-2">Session tracking will appear here when active</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EU Visitors Tab */}
        {activeTab === 'eu-visitors' && (
          <div className="space-y-6">
            <div className="bg-[#23272f] rounded-xl p-6 shadow">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Globe className="w-6 h-6 mr-2" />
                EU Visitor Analytics
              </h2>
              <p className="text-gray-400 mb-6">
                GDPR-compliant visitor statistics for EU users with consent.
              </p>

              {euVisitorStats ? (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#181b23] rounded-lg p-6">
                      <div className="flex items-center">
                        <Eye className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-400">Total Visitors</p>
                          <p className="text-2xl font-bold text-blue-400">{euVisitorStats.totalVisitors}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#181b23] rounded-lg p-6">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-400">First-Time Visitors</p>
                          <p className="text-2xl font-bold text-green-400">{euVisitorStats.firstTimeVisitors}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#181b23] rounded-lg p-6">
                      <div className="flex items-center">
                        <UserPlus className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-400">Total Signups</p>
                          <p className="text-2xl font-bold text-purple-400">{euVisitorStats.totalSignups}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#181b23] rounded-lg p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-400">Signup Rate</p>
                          <p className="text-2xl font-bold text-orange-400">{euVisitorStats.signupRate}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Statistics */}
                  <div className="bg-[#181b23] rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Visitor Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">Visitor Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Visitors:</span>
                            <span className="font-semibold">{euVisitorStats.totalVisitors}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">First-Time Visitors:</span>
                            <span className="font-semibold">{euVisitorStats.firstTimeVisitors}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Returning Visitors:</span>
                            <span className="font-semibold">{euVisitorStats.totalVisitors - euVisitorStats.firstTimeVisitors}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">Conversion Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Signups:</span>
                            <span className="font-semibold">{euVisitorStats.totalSignups}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Signup Rate:</span>
                            <span className="font-semibold">{euVisitorStats.signupRate}%</span>
                          </div>
                          {euVisitorStats.lastSignupDate && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Signup:</span>
                              <span className="font-semibold">
                                {new Date(euVisitorStats.lastSignupDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GDPR Compliance Notice */}
                  <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-400 mb-2">GDPR Compliance</h3>
                    <p className="text-blue-300 text-sm">
                      This dashboard shows aggregate visitor statistics only. No individual user data is collected or stored. 
                      All tracking is GDPR-compliant and respects user privacy preferences.
                    </p>
                    <ul className="text-blue-200 text-sm mt-2 space-y-1">
                      <li>• No personal data is collected</li>
                      <li>• No individual user tracking</li>
                      <li>• Only aggregate statistics are shown</li>
                      <li>• Data is stored locally in the browser</li>
                      <li>• Users can clear data at any time</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="bg-[#181b23] rounded-lg p-8 text-center">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No EU Visitor Data</h3>
                  <p className="text-gray-400">
                    No EU visitor statistics available yet. Data will appear as EU users with consent visit the site.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
