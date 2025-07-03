import React, { useState, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveChoropleth } from '@nivo/geo';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import worldCountries from './world_countries.json';
import { useAuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { analyticsService } from '../services/analyticsService';

interface AnalyticsData {
  userStats: {
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsers: number;
    verifiedUsers: number;
    euUsers: number;
  };
  jobStats: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    avgApplicationsPerJob: number;
    topCompanies: Array<{ company: string; count: number }>;
  };
  engagementStats: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalConnections: number;
    avgLikesPerPost: number;
  };
  geographicData: Array<{ country: string; count: number }>;
  timeSeriesData: {
    users: Array<{ date: string; count: number }>;
    jobs: Array<{ date: string; count: number }>;
    applications: Array<{ date: string; count: number }>;
  };
}

const AnalyticsPage: React.FC = () => {
  const { user, profile, isAdmin, loading } = useAuthContext();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoadingData(true);
        const data = await analyticsService.getAnalyticsData();
        setAnalyticsData(data);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error('Analytics data error:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (user && profile?.role === 'admin') {
      fetchAnalyticsData();
    }
  }, [user, profile]);

  if (loading || loadingData) {
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

  if (!analyticsData) {
    return (
      <div className="text-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-xl p-6">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">No Data Available</h2>
            <p className="text-yellow-300">Analytics data is not available yet.</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const userGrowthData = [
    {
      id: 'New Users',
      color: 'hsl(210, 70%, 50%)',
      data: analyticsData.timeSeriesData.users.map(item => ({
        x: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        y: item.count
      }))
    }
  ];

  const jobGrowthData = [
    {
      id: 'New Jobs',
      color: 'hsl(160, 70%, 50%)',
      data: analyticsData.timeSeriesData.jobs.map(item => ({
        x: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        y: item.count
      }))
    }
  ];

  const geographicMapData = analyticsData.geographicData.map(item => ({
    id: item.country,
    value: item.count
  }));

  const companyData = analyticsData.jobStats.topCompanies.map(item => ({
    company: item.company,
    jobs: item.count
  }));

  const userDistributionData = [
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
  ];

  return (
    <div className="text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

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
            <div className="text-3xl font-bold text-purple-400">{analyticsData.engagementStats.totalPosts.toLocaleString()}</div>
            <div className="text-gray-400">Total Posts</div>
            <div className="text-sm text-yellow-400 mt-2">
              {analyticsData.engagementStats.avgLikesPerPost} avg likes
            </div>
          </div>
          
          <div className="bg-[#23272f] rounded-xl p-6 shadow">
            <div className="text-3xl font-bold text-orange-400">{analyticsData.jobStats.totalApplications.toLocaleString()}</div>
            <div className="text-gray-400">Applications</div>
            <div className="text-sm text-green-400 mt-2">
              {analyticsData.jobStats.avgApplicationsPerJob} per job
            </div>
          </div>
        </div>

        {/* User Distribution Map */}
        <div className="bg-[#23272f] rounded-xl p-6 mb-8 shadow">
          <h2 className="text-2xl font-bold mb-4">User Distribution by Country</h2>
          <div className="h-72">
            <ResponsiveChoropleth
              data={geographicMapData}
              features={worldCountries.features}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              colors="YlOrBr"
              domain={[0, Math.max(...geographicMapData.map(d => d.value))]}
              unknownColor="#22223b"
              label="properties.name"
              valueFormat=".0f"
              projectionScale={90}
              projectionTranslation={[0.5, 0.5]}
              projectionRotation={[0, 0, 0]}
              borderWidth={0.5}
              borderColor="#18181b"
              legends={[]}
            />
          </div>
        </div>

        {/* Growth Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-[#23272f] rounded-xl p-6 shadow">
            <h2 className="text-lg font-bold mb-4">User Growth (Last 30 Days)</h2>
            <div className="h-56">
              <ResponsiveLine
                data={userGrowthData}
                margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                axisBottom={{ 
                  tickSize: 5, 
                  tickPadding: 5, 
                  tickRotation: 0, 
                  legend: '', 
                  legendOffset: 36, 
                  legendPosition: 'middle',
                  tickValues: 'every 5 days'
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
                margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                axisBottom={{ 
                  tickSize: 5, 
                  tickPadding: 5, 
                  tickRotation: 0, 
                  legend: '', 
                  legendOffset: 36, 
                  legendPosition: 'middle',
                  tickValues: 'every 5 days'
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

          {/* Engagement Metrics */}
          <div className="bg-[#23272f] rounded-xl p-6 shadow">
            <h2 className="text-lg font-bold mb-4">Engagement Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Likes</span>
                <span className="text-xl font-bold text-pink-400">{analyticsData.engagementStats.totalLikes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Comments</span>
                <span className="text-xl font-bold text-blue-400">{analyticsData.engagementStats.totalComments.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Connections</span>
                <span className="text-xl font-bold text-green-400">{analyticsData.engagementStats.totalConnections.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">EU Users</span>
                <span className="text-xl font-bold text-yellow-400">{analyticsData.userStats.euUsers.toLocaleString()}</span>
              </div>
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
                  <td className="px-4 py-2">{analyticsData.userStats.verifiedUsers.toLocaleString()}</td>
                  <td className="px-4 py-2">{((analyticsData.userStats.verifiedUsers / analyticsData.userStats.totalUsers) * 100).toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-4 py-2">Active Jobs</td>
                  <td className="px-4 py-2">{analyticsData.jobStats.activeJobs.toLocaleString()}</td>
                  <td className="px-4 py-2">{((analyticsData.jobStats.activeJobs / analyticsData.jobStats.totalJobs) * 100).toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-4 py-2">EU Users</td>
                  <td className="px-4 py-2">{analyticsData.userStats.euUsers.toLocaleString()}</td>
                  <td className="px-4 py-2">{((analyticsData.userStats.euUsers / analyticsData.userStats.totalUsers) * 100).toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="px-4 py-2">New Users This Month</td>
                  <td className="px-4 py-2">{analyticsData.userStats.newUsersThisMonth.toLocaleString()}</td>
                  <td className="px-4 py-2">{((analyticsData.userStats.newUsersThisMonth / analyticsData.userStats.totalUsers) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Avg Applications per Job</td>
                  <td className="px-4 py-2">{analyticsData.jobStats.avgApplicationsPerJob}</td>
                  <td className="px-4 py-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
