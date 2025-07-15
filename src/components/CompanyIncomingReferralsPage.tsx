import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Users, Eye, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Referral {
  id: string;
  referrer_id: string;
  candidate_id: string;
  job_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  referrer: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  candidate: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  job: {
    title: string;
  };
}

const CompanyIncomingReferralsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    if (user) {
      loadReferrals();
    }
  }, [user, filter]);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('referrals')
        .select(`
          *,
          referrer:profiles!referrals_referrer_id_fkey(full_name, email, avatar_url),
          candidate:profiles!referrals_candidate_id_fkey(full_name, email, avatar_url),
          job:jobs!referrals_job_id_fkey(title)
        `)
        .eq('job.created_by', user?.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReferrals(data || []);
    } catch (error) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (referralId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ status: newStatus })
        .eq('id', referralId);

      if (error) throw error;
      loadReferrals(); // Reload the list
    } catch (error) {
      console.error('Error updating referral status:', error);
    }
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleMessage = (referralId: string) => {
    navigate('/messages', { state: { selectedReferral: referralId } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReferrals = referrals.filter(referral => 
    filter === 'all' || referral.status === filter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Incoming Referrals</h1>
            <p className="text-gray-600 mt-2">Review and manage employee referrals</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all', label: 'All', count: referrals.length },
            { key: 'pending', label: 'Pending', count: referrals.filter(r => r.status === 'pending').length },
            { key: 'accepted', label: 'Accepted', count: referrals.filter(r => r.status === 'accepted').length },
            { key: 'rejected', label: 'Rejected', count: referrals.filter(r => r.status === 'rejected').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading referrals...</p>
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="text-center py-12">
          <Share2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No referrals found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You haven't received any referrals yet." 
              : `No ${filter} referrals found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReferrals.map((referral) => (
            <div key={referral.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      {referral.referrer.avatar_url ? (
                        <img 
                          src={referral.referrer.avatar_url} 
                          alt={referral.referrer.full_name}
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {referral.referrer.full_name?.charAt(0) || 'R'}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="h-3 w-3 text-green-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {referral.candidate.full_name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                        {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-1">
                      Referred by {referral.referrer.full_name} for {referral.job.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      Referred {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewProfile(referral.candidate_id)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View Candidate Profile"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMessage(referral.id)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Message"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  
                  {/* Status Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleStatusChange(referral.id, 'accepted')}
                      className={`p-1 rounded ${referral.status === 'accepted' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                      title="Accept Referral"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(referral.id, 'rejected')}
                      className={`p-1 rounded ${referral.status === 'rejected' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                      title="Reject Referral"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyIncomingReferralsPage; 