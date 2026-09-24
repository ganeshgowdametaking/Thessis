import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Users, Briefcase, MessageSquare, Bell, Settings, LogOut, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  status: string;
  applications_count: number;
  created_at: string;
}

const CompanyDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    unreadMessages: 0
  });

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);

      // Load company's job postings
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      setJobPostings(jobs || []);

      // Calculate stats
      const activeJobs = jobs?.filter(job => job.status === 'active').length || 0;
      const totalApplications = jobs?.reduce((sum, job) => sum + (job.applications_count || 0), 0) || 0;

      setStats({
        totalJobs: jobs?.length || 0,
        activeJobs,
        totalApplications,
        unreadMessages: 0 // TODO: Implement message counting
      });
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCreateJob = () => {
    navigate('/create-referral');
  };

  const handleViewApplications = (jobId: string) => {
    navigate(`/applications/${jobId}`);
  };

  const handleEditJob = (jobId: string) => {
    navigate(`/edit-job/${jobId}`);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      try {
        const { error } = await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId);

        if (error) throw error;

        // Reload data
        loadCompanyData();
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job posting');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone flex items-center justify-center relative">
        <LoadingSpinner text="Loading company dashboard..." />
      </div>
    );
  }

  const statusBadgeClass = (status: string) =>
    status === 'active'
      ? 'bg-success-tint text-success-ink'
      : status === 'draft'
        ? 'bg-amber-tint text-amber-ink'
        : 'bg-stone-off text-slate-600';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900">Welcome back{profile?.company ? `, ${profile.company}` : ''}</h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening with your open roles</p>
        </div>
        <button
          onClick={handleCreateJob}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Post a role
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center">
            <div className="bg-ink-wash p-3 rounded-xl">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-slate-500">Total Jobs</p>
              <p className="text-2xl font-bold font-display text-slate-900">{stats.totalJobs}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center">
            <div className="bg-success-tint p-3 rounded-xl">
              <Briefcase className="h-5 w-5 text-success-ink" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-slate-500">Active Jobs</p>
              <p className="text-2xl font-bold font-display text-slate-900">{stats.activeJobs}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center">
            <div className="bg-amber-tint p-3 rounded-xl">
              <Users className="h-5 w-5 text-amber-ink" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-slate-500">Total Applications</p>
              <p className="text-2xl font-bold font-display text-slate-900">{stats.totalApplications}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center">
            <div className="bg-stone-off p-3 rounded-xl">
              <MessageSquare className="h-5 w-5 text-slate-600" />
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium text-slate-500">Unread Messages</p>
              <p className="text-2xl font-bold font-display text-slate-900">{stats.unreadMessages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Postings */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Your job postings</h2>
        </div>
        {jobPostings.length === 0 ? (
          <div className="text-center py-12 px-5">
            <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">You haven't posted any roles yet.</p>
            <button
              onClick={handleCreateJob}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Post your first role
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobPostings.map((job) => (
              <div key={job.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{job.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{job.location} · {job.job_type}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${statusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewApplications(job.id)}
                    title="View applications"
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-stone-off transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditJob(job.id)}
                    title="Edit job"
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-stone-off transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    title="Delete job"
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboardPage; 