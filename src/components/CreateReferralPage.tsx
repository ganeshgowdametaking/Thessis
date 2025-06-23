import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building, MapPin, Clock, Users, Briefcase, Star, Plus, X, Eye, Share2, Trash2, Calendar, CheckCircle } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CreateReferralPageProps {
  onBack: () => void;
  onViewApplications: (referralId: number, referralTitle: string) => void;
}

const CreateReferralPage: React.FC<CreateReferralPageProps> = ({ onBack, onViewApplications }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [userReferrals, setUserReferrals] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    department: '',
    location: '',
    jobType: 'Full-time',
    description: '',
    remoteAvailable: false,
    urgentHiring: false,
    experienceLevel: 'Mid Level',
    applicationDeadline: '',
    contactEmail: '',
    benefits: ''
  });

  useEffect(() => {
    loadUserReferrals();
  }, []);

  const loadUserReferrals = async () => {
    try {
      setLoadingReferrals(true);
      if (!user) return;
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', user.id);
      if (error) throw error;
      const jobsWithCounts = data.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        posted: formatTimeAgo(job.created_at),
        applications: job.applications_count || 0,
        status: job.status,
        type: job.job_type,
        urgent: job.urgent_hiring
      }));
      console.log('Fetched user referrals:', jobsWithCounts); // Debug
      setUserReferrals(jobsWithCounts);
    } catch (error) {
      console.error('Error loading user referrals:', error);
      setUserReferrals([]);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    
    if (!user) {
      setError('You must be logged in to create a referral');
      return;
    }

    if (!formData.jobTitle.trim()) {
      setError('Job title is required');
      return;
    }
    
    if (!formData.company.trim()) {
      setError('Company name is required');
      return;
    }
    
    if (!formData.location.trim()) {
      setError('Location is required');
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Job description is required');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Starting job creation process...');

      const jobData = {
        title: formData.jobTitle.trim(),
        company: formData.company.trim(),
        department: formData.department.trim() || null,
        location: formData.location.trim(),
        job_type: formData.jobType,
        description: formData.description.trim(),
        skills: [],
        benefits: formData.benefits ? formData.benefits.split(',').map(s => s.trim()).filter(Boolean) : [],
        remote_available: formData.remoteAvailable,
        urgent_hiring: formData.urgentHiring,
        experience_level: formData.experienceLevel,
        application_deadline: formData.applicationDeadline || null,
        contact_email: formData.contactEmail.trim() || null,
        status: 'open',
        created_by: user.id,
        applications_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Prepared job data:', jobData); // Enhanced logging

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Job created successfully:', data); // Enhanced logging

      setShowSuccess(true);
      
      setFormData({
        jobTitle: '',
        company: '',
        department: '',
        location: '',
        jobType: 'Full-time',
        description: '',
        remoteAvailable: false,
        urgentHiring: false,
        experienceLevel: 'Mid Level',
        applicationDeadline: '',
        contactEmail: '',
        benefits: ''
      });

      await loadUserReferrals();
      window.dispatchEvent(new CustomEvent('refresh-jobs'));

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('❌ Error creating referral:', error);
      
      if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to create referral. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplications = (referralId: number, referralTitle: string) => {
    onViewApplications(referralId, referralTitle);
  };

  const handleShareReferral = (referralId: number) => {
    const jobUrl = `${window.location.origin}/jobs/${referralId}`;
    navigator.clipboard.writeText(jobUrl).then(() => {
      alert('Job link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link. Please try again.');
    });
  };

  const handleDeleteReferral = async (referralId: number) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', referralId.toString());
      if (error) throw error;
      await loadUserReferrals();
      window.dispatchEvent(new CustomEvent('refresh-jobs'));
    } catch (error) {
      console.error('Error deleting referral:', error);
      alert('Failed to delete referral. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const activeReferrals = userReferrals.filter(r => r.status === 'open').length;
  const totalApplications = userReferrals.reduce((sum, r) => sum + r.applications, 0);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg z-50 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Referral created successfully! 🎉</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">Referral Management</h1>
              <p className="text-slate-600 mt-1 truncate">
                Create new referrals and manage your existing ones
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{activeReferrals}</div>
              <div className="text-xs sm:text-sm text-slate-600">Active Referrals</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalApplications}</div>
              <div className="text-xs sm:text-sm text-slate-600">Total Applications</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                      <X className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-red-800 font-medium text-sm sm:text-base">{error}</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">Basic Information</h2>
                    <p className="text-slate-600 text-sm sm:text-base">Tell us about the position you're referring</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Your company name"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      placeholder="e.g. Engineering, Product, Design"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Job Type</label>
                    <select
                      value={formData.jobType}
                      onChange={(e) => handleInputChange('jobType', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">Job Details</h2>
                    <p className="text-slate-600 text-sm sm:text-base">Provide detailed information about the role</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Job Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={6}
                      placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity special..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none text-sm sm:text-base"
                      required
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.remoteAvailable}
                        onChange={(e) => handleInputChange('remoteAvailable', e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="font-medium text-slate-900 text-sm sm:text-base">Remote work available</div>
                        <div className="text-xs sm:text-sm text-slate-600">Position offers remote work options</div>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.urgentHiring}
                        onChange={(e) => handleInputChange('urgentHiring', e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="font-medium text-slate-900 text-sm sm:text-base">Urgent hiring</div>
                        <div className="text-xs sm:text-sm text-slate-600">Position needs to be filled quickly</div>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Experience Level</label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                    >
                      <option value="Entry Level">Entry Level</option>
                      <option value="Mid Level">Mid Level</option>
                      <option value="Senior Level">Senior Level</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Application Deadline</label>
                    <input
                      type="date"
                      value={formData.applicationDeadline}
                      onChange={(e) => handleInputChange('applicationDeadline', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      placeholder="e.g. hr@company.com"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Benefits (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.benefits}
                      onChange={(e) => handleInputChange('benefits', e.target.value)}
                      placeholder="e.g. Health insurance, Remote work, Bonuses"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors font-medium text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>Create Referral</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 h-[calc(100vh-200px)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">My Referrals</h2>
                <span className="bg-slate-100 text-slate-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  {userReferrals.length} total
                </span>
              </div>

              {loadingReferrals ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-slate-600 text-sm">Loading referrals...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
                  {userReferrals.length > 0 ? (
                    userReferrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="border border-slate-200 rounded-lg p-3 sm:p-4 hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-bold text-slate-900 text-sm truncate">{referral.title}</h3>
                              {referral.urgent && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium truncate">{referral.company}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-xs text-slate-500 mt-1 space-y-1 sm:space-y-0">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{referral.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span>{referral.posted}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(referral.status)}`}>
                            {referral.status}
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-slate-700 font-medium mb-3">{referral.type}</div>

                        <div className="grid grid-cols-1 gap-3 mb-4">
                          <div className="text-center p-2 bg-slate-50 rounded-lg">
                            <div className="text-base sm:text-lg font-bold text-slate-900">{referral.applications}</div>
                            <div className="text-xs text-slate-600">Applications</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewApplications(referral.id, referral.title)}
                            className="flex-1 bg-slate-900 text-white px-2 sm:px-3 py-2 rounded-lg text-xs hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Applications</span>
                          </button>
                          <button
                            onClick={() => handleShareReferral(referral.id)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Share"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReferral(referral.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">No referrals yet</h3>
                      <p className="text-slate-600 text-sm">
                        Create your first referral to help your network discover opportunities
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateReferralPage;