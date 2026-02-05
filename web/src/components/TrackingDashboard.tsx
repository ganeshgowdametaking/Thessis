import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { useEUDetection } from '../hooks/useEUDetection';
import LoadingSpinner from './LoadingSpinner';
import { 
  Users, 
  Eye, 
  MousePointer, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Activity,
  Calendar,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';

interface TrackingData {
  sessionData: any;
  allSessions: any[];
  analyticsData: any;
  isTrackingEnabled: boolean;
}

const TrackingDashboard: React.FC = () => {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isEUUser, loading: euLoading } = useEUDetection();

  useEffect(() => {
    const loadTrackingData = async () => {
      try {
        const sessionData = analyticsService.getSessionData();
        const allSessions = JSON.parse(localStorage.getItem('all_sessions') || '[]');
        const analyticsData = await analyticsService.getAnalyticsData();
        
        setTrackingData({
          sessionData,
          allSessions,
          analyticsData,
          isTrackingEnabled: !isEUUser || localStorage.getItem('gdpr_consent') === 'true'
        });
      } catch (error) {
        console.error('Error loading tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!euLoading) {
      loadTrackingData();
    }
  }, [isEUUser, euLoading]);

  if (loading || euLoading) {
    return <LoadingSpinner text="Loading tracking data..." />;
  }

  if (!trackingData?.isTrackingEnabled) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <Globe className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Tracking Disabled</h2>
          <p className="text-slate-600">
            {isEUUser 
              ? 'Analytics tracking is disabled for EU users without consent.'
              : 'Analytics tracking is not available.'
            }
          </p>
        </div>
      </div>
    );
  }

  const { sessionData, allSessions, analyticsData } = trackingData;

  // Calculate session statistics
  const totalSessions = allSessions.length;
  const currentSession = sessionData;
  const averageSessionDuration = allSessions.length > 0 
    ? allSessions.reduce((acc: number, session: any) => {
        const duration = new Date(session.lastActivity).getTime() - new Date(session.startTime).getTime();
        return acc + duration;
      }, 0) / allSessions.length / 1000 // Convert to seconds
    : 0;

  const averagePageViews = allSessions.length > 0
    ? allSessions.reduce((acc: number, session: any) => acc + session.pageViews.length, 0) / allSessions.length
    : 0;

  // Calculate interaction statistics
  const totalInteractions = allSessions.reduce((acc: number, session: any) => 
    acc + (session.interactions?.length || 0), 0
  );

  const interactionTypes = allSessions.reduce((acc: any, session: any) => {
    session.interactions?.forEach((interaction: any) => {
      acc[interaction.type] = (acc[interaction.type] || 0) + 1;
    });
    return acc;
  }, {});

  const topInteractions = Object.entries(interactionTypes)
    .map(([type, count]) => ({ type, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
          <p className="text-slate-600">
            Comprehensive tracking data for website optimization and user experience analysis.
          </p>
        </div>

        {/* Current Session */}
        {currentSession && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Current Session
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Session Duration</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {Math.round((Date.now() - new Date(currentSession.startTime).getTime()) / 1000)}s
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Pages Viewed</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {currentSession.pageViews?.length || 0}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <MousePointer className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-800">Interactions</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {currentSession.interactions?.length || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Session Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Session Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Sessions</span>
                <span className="font-semibold">{totalSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Average Duration</span>
                <span className="font-semibold">{Math.round(averageSessionDuration)}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Average Page Views</span>
                <span className="font-semibold">{averagePageViews.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Interactions</span>
                <span className="font-semibold">{totalInteractions}</span>
              </div>
            </div>
          </div>

          {/* User Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Users</span>
                <span className="font-semibold">{analyticsData.userStats.totalUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">New This Month</span>
                <span className="font-semibold">{analyticsData.userStats.newUsersThisMonth}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Active Users</span>
                <span className="font-semibold">{analyticsData.userStats.activeUsers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Verified Users</span>
                <span className="font-semibold">{analyticsData.userStats.verifiedUsers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interaction Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <MousePointer className="h-5 w-5 mr-2" />
            Top Interactions
          </h3>
          <div className="space-y-3">
            {topInteractions.map((interaction, index) => (
              <div key={interaction.type} className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {index + 1}
                  </span>
                  <span className="text-slate-700 capitalize">{interaction.type.replace('_', ' ')}</span>
                </div>
                <span className="font-semibold">{interaction.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Information */}
        {currentSession && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Device Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-700 mb-2">Screen Resolution</h4>
                <p className="text-slate-600">{currentSession.screenResolution}</p>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2">Timezone</h4>
                <p className="text-slate-600">{currentSession.timezone}</p>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2">Referrer</h4>
                <p className="text-slate-600">{currentSession.referrer || 'Direct'}</p>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-2">First Visit</h4>
                <p className="text-slate-600">{currentSession.isFirstVisit ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Conversion Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analyticsData.conversionStats.signupRate.toFixed(1)}%
              </div>
              <div className="text-sm text-slate-600">Signup Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analyticsData.conversionStats.jobApplicationRate.toFixed(1)}%
              </div>
              <div className="text-sm text-slate-600">Job Application Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {analyticsData.conversionStats.referralCreationRate.toFixed(1)}%
              </div>
              <div className="text-sm text-slate-600">Referral Creation Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingDashboard; 