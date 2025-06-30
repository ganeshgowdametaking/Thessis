import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveChoropleth } from '@nivo/geo';
import worldCountries from './world_countries.json';
import { useAuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

// Mock data for the world map (country codes and user counts)
const mapData = [
  { id: 'USA', value: 1200 },
  { id: 'IND', value: 900 },
  { id: 'BRA', value: 400 },
  { id: 'FRA', value: 300 },
  { id: 'RUS', value: 200 },
  { id: 'AUS', value: 100 },
  { id: 'ZAF', value: 80 },
  { id: 'CAN', value: 500 },
  { id: 'GBR', value: 350 },
  // ...add more as needed
];

// Mock data for line charts
const usersLineData = [
  {
    id: 'All Users',
    color: 'hsl(210, 70%, 50%)',
    data: [
      { x: 'May 28', y: 1600 },
      { x: 'May 31', y: 1400 },
      { x: 'Jun 3', y: 1200 },
      { x: 'Jun 6', y: 1800 },
      { x: 'Jun 9', y: 1500 },
      { x: 'Jun 12', y: 1700 },
      { x: 'Jun 15', y: 1300 },
      { x: 'Jun 18', y: 1600 },
      { x: 'Jun 21', y: 1700 },
      { x: 'Jun 24', y: 1500 },
      { x: 'Jun 27', y: 1400 },
    ],
  },
  {
    id: 'New Users',
    color: 'hsl(280, 70%, 50%)',
    data: [
      { x: 'May 28', y: 400 },
      { x: 'May 31', y: 300 },
      { x: 'Jun 3', y: 200 },
      { x: 'Jun 6', y: 600 },
      { x: 'Jun 9', y: 500 },
      { x: 'Jun 12', y: 700 },
      { x: 'Jun 15', y: 300 },
      { x: 'Jun 18', y: 600 },
      { x: 'Jun 21', y: 700 },
      { x: 'Jun 24', y: 500 },
      { x: 'Jun 27', y: 400 },
    ],
  },
];

const bounceLineData = [
  {
    id: 'Bounce Rate (Base)',
    color: 'hsl(160, 70%, 50%)',
    data: [
      { x: 'May 28', y: 20 },
      { x: 'May 31', y: 25 },
      { x: 'Jun 3', y: 30 },
      { x: 'Jun 6', y: 22 },
      { x: 'Jun 9', y: 28 },
      { x: 'Jun 12', y: 35 },
      { x: 'Jun 15', y: 40 },
      { x: 'Jun 18', y: 32 },
      { x: 'Jun 21', y: 38 },
      { x: 'Jun 24', y: 30 },
      { x: 'Jun 27', y: 25 },
    ],
  },
  {
    id: 'Bounce Rate (Comparison)',
    color: 'hsl(200, 70%, 50%)',
    data: [
      { x: 'May 28', y: 25 },
      { x: 'May 31', y: 30 },
      { x: 'Jun 3', y: 35 },
      { x: 'Jun 6', y: 50 },
      { x: 'Jun 9', y: 28 },
      { x: 'Jun 12', y: 45 },
      { x: 'Jun 15', y: 60 },
      { x: 'Jun 18', y: 32 },
      { x: 'Jun 21', y: 48 },
      { x: 'Jun 24', y: 40 },
      { x: 'Jun 27', y: 35 },
    ],
  },
];

const AnalyticsPage: React.FC = () => {
  const { user, profile, isAdmin, loading } = useAuthContext();

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* User Distribution Map */}
        <div className="bg-[#23272f] rounded-xl p-6 mb-8 shadow">
          <h2 className="text-2xl font-bold mb-4">User Distribution by Country</h2>
          <div className="h-72">
            <ResponsiveChoropleth
              data={mapData}
              features={worldCountries.features}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              colors="YlOrBr"
              domain={[0, 1200]}
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

        {/* Audience Overview */}
        <div className="bg-[#23272f] rounded-xl p-6 mb-8 shadow">
          <h2 className="text-2xl font-bold mb-4">Audience Overview</h2>
          <div className="flex flex-wrap gap-8 mb-6">
            <div>
              <div className="text-3xl font-bold">23.1k <span className="text-green-400 text-lg">▲13%</span></div>
              <div className="text-gray-400">Total Sessions</div>
            </div>
            <div>
              <div className="text-3xl font-bold">5,898 <span className="text-red-400 text-lg">▼1%</span></div>
              <div className="text-gray-400">New Visitors</div>
            </div>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="px-4 py-2">Channel</th>
                  <th className="px-4 py-2">Users</th>
                  <th className="px-4 py-2">Sessions</th>
                  <th className="px-4 py-2">New User %</th>
                  <th className="px-4 py-2">Pages/Session</th>
                  <th className="px-4 py-2">Bounce Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2">Direct</td>
                  <td className="px-4 py-2">8,928</td>
                  <td className="px-4 py-2">5,608</td>
                  <td className="px-4 py-2">17%</td>
                  <td className="px-4 py-2">5.3</td>
                  <td className="px-4 py-2">22%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Unassigned</td>
                  <td className="px-4 py-2">5,331</td>
                  <td className="px-4 py-2">3,413</td>
                  <td className="px-4 py-2">18%</td>
                  <td className="px-4 py-2">4.2</td>
                  <td className="px-4 py-2">14%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Paid Social</td>
                  <td className="px-4 py-2">4,397</td>
                  <td className="px-4 py-2">1,802</td>
                  <td className="px-4 py-2">13%</td>
                  <td className="px-4 py-2">3.5</td>
                  <td className="px-4 py-2">16%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Paid Search</td>
                  <td className="px-4 py-2">4,082</td>
                  <td className="px-4 py-2">1,073</td>
                  <td className="px-4 py-2">12%</td>
                  <td className="px-4 py-2">6.7</td>
                  <td className="px-4 py-2">36%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Organic Search</td>
                  <td className="px-4 py-2">3,603</td>
                  <td className="px-4 py-2">2,619</td>
                  <td className="px-4 py-2">18%</td>
                  <td className="px-4 py-2">4.7</td>
                  <td className="px-4 py-2">14%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Organic Social</td>
                  <td className="px-4 py-2">2,552</td>
                  <td className="px-4 py-2">2,975</td>
                  <td className="px-4 py-2">27%</td>
                  <td className="px-4 py-2">2.2</td>
                  <td className="px-4 py-2">16%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#23272f] rounded-xl p-6 shadow">
            <h2 className="text-lg font-bold mb-4">Users New vs Returning</h2>
            <div className="h-56">
              <ResponsiveLine
                data={usersLineData}
                margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: '', legendOffset: 36, legendPosition: 'middle', tickValues: 'every 2 days' }}
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
            <h2 className="text-lg font-bold mb-4">Bounce Rate</h2>
            <div className="h-56">
              <ResponsiveLine
                data={bounceLineData}
                margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                xScale={{ type: 'point' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: '', legendOffset: 36, legendPosition: 'middle', tickValues: 'every 2 days' }}
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
      </div>
    </div>
  );
};

export default AnalyticsPage;
