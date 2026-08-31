import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Filter, Eye, MessageSquare, CheckCircle, XCircle, Download } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Applicant {
  id: string;
  user_id: string;
  job_id: string;
  status: 'pending' | 'shortlisted' | 'rejected' | 'hired';
  created_at: string;
  user: {
    full_name: string;
    email: string;
    avatar_url?: string;
    location?: string;
  };
  job: {
    title: string;
  };
}

const CompanyApplicantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'shortlisted' | 'rejected' | 'hired'>('all');
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadJobs();
      loadApplicants();
    }
  }, [user, filter, selectedJob]);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadApplicants = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('applications')
        .select(`
          *,
          user:profiles!applications_user_id_fkey(full_name, email, avatar_url, location),
          job:jobs!applications_job_id_fkey(title)
        `)
        .eq('job.created_by', user?.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      if (selectedJob !== 'all') {
        query = query.eq('job_id', selectedJob);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplicants(data || []);
    } catch (error) {
      console.error('Error loading applicants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicantId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicantId);

      if (error) throw error;
      loadApplicants(); // Reload the list
    } catch (error) {
      console.error('Error updating applicant status:', error);
    }
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const handleMessage = (applicantId: string) => {
    navigate('/messages', { state: { selectedApplicant: applicantId } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const filteredApplicants = applicants.filter(applicant => 
    filter === 'all' || applicant.status === filter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Applicants</h1>
            <p className="text-slate-600 mt-2">Manage job applications</p>
          </div>
          <button
            onClick={() => {/* Export functionality */}}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {[
              { key: 'all', label: 'All', count: applicants.length },
              { key: 'pending', label: 'Pending', count: applicants.filter(a => a.status === 'pending').length },
              { key: 'shortlisted', label: 'Shortlisted', count: applicants.filter(a => a.status === 'shortlisted').length },
              { key: 'rejected', label: 'Rejected', count: applicants.filter(a => a.status === 'rejected').length },
              { key: 'hired', label: 'Hired', count: applicants.filter(a => a.status === 'hired').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading applicants...</p>
        </div>
      ) : filteredApplicants.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No applicants found</h3>
          <p className="text-slate-600">
            {filter === 'all' 
              ? "You haven't received any applications yet." 
              : `No ${filter} applicants found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplicants.map((applicant) => (
            <div key={applicant.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src={applicant.user.avatar_url || '/default-avatar.svg'}
                      alt={applicant.user.full_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{applicant.user.full_name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(applicant.status)}`}>
                        {applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-1">{applicant.user.email}</p>
                    <p className="text-sm text-slate-500">
                      Applied for {applicant.job.title} • {applicant.user.location || 'Location not specified'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Applied {new Date(applicant.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewProfile(applicant.user_id)}
                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    title="View Profile"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMessage(applicant.id)}
                    className="p-2 text-slate-400 hover:text-green-600 transition-colors"
                    title="Message"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  
                  {/* Status Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleStatusChange(applicant.id, 'shortlisted')}
                      className={`p-1 rounded ${applicant.status === 'shortlisted' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}
                      title="Shortlist"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(applicant.id, 'rejected')}
                      className={`p-1 rounded ${applicant.status === 'rejected' ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-red-600'}`}
                      title="Reject"
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

export default CompanyApplicantsPage; 