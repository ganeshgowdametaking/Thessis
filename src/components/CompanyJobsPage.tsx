import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Eye, Edit, Trash2, Filter } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  status: 'active' | 'draft' | 'closed';
  applications_count: number;
  created_at: string;
}

const CompanyJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'closed'>('all');

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user, filter]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = () => {
    navigate('/company-hiring/new');
  };

  const handleViewJob = (jobId: string) => {
    navigate(`/company-hiring/jobs/${jobId}`);
  };

  const handleEditJob = (jobId: string) => {
    navigate(`/company-hiring/jobs/${jobId}/edit`);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        const { error } = await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId);
        
        if (error) throw error;
        loadJobs(); // Reload the list
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredJobs = jobs.filter(job => filter === 'all' || job.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
            <p className="text-gray-600 mt-2">Manage your job postings</p>
          </div>
          <button
            onClick={handleCreateJob}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Post New Job</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'all', label: 'All Jobs', count: jobs.length },
            { key: 'active', label: 'Active', count: jobs.filter(j => j.status === 'active').length },
            { key: 'draft', label: 'Drafts', count: jobs.filter(j => j.status === 'draft').length },
            { key: 'closed', label: 'Closed', count: jobs.filter(j => j.status === 'closed').length },
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
          <p className="text-gray-600 mt-4">Loading jobs...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? "You haven't posted any jobs yet." 
              : `No ${filter} jobs found.`
            }
          </p>
          {filter === 'all' && (
            <button
              onClick={handleCreateJob}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Post Your First Job
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{job.company} • {job.location} • {job.job_type}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{job.applications_count || 0} applications</span>
                    <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewJob(job.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View Job"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditJob(job.id)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Edit Job"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Job"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyJobsPage; 