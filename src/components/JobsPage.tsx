import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MapPin, Calendar, Briefcase, Star, Building, Clock, Users, ChevronDown, X, CheckCircle } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';

interface JobsPageProps {
  onCreateReferral: (callback: () => void) => void;
}

interface ApplicationFormData {
  email: string;
  phone: string;
  resume: File | null;
  customFields: { [key: string]: string };
}

const JobsPage: React.FC<JobsPageProps> = ({ onCreateReferral }) => {
  const { user } = useAuthContext();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    jobType: '',
    remote: false
  });
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationStep, setApplicationStep] = useState(1);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormData>({
    email: user?.email || '',
    phone: '',
    resume: null,
    customFields: {}
  });
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);

  useEffect(() => {
    loadJobs();
    loadUserJobs();
    loadUserApplications();
  }, []);

  useEffect(() => {
    const handleRefreshJobs = () => {
      loadJobs();
      loadUserJobs();
      loadUserApplications();
    };
    window.addEventListener('refresh-jobs', handleRefreshJobs);
    return () => {
      window.removeEventListener('refresh-jobs', handleRefreshJobs);
    };
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobService.getJobs(filters);
      console.log('Fetched jobs data:', data);
      if (!data || data.length === 0) {
        console.warn('No jobs fetched from Supabase');
      } else {
        console.log('Fetched jobs details:', data.map(job => ({ id: job.id, title: job.title, status: job.status, created_by: job.created_by })));
      }
      setJobs(data || []);
      if (!selectedJob && data && data.length > 0) {
        setSelectedJob(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading jobs:', error.message, error.details);
      setError(error.message || 'Failed to load jobs. Please try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserJobs = async () => {
    try {
      if (!user) return;
      const data = await jobService.getJobs();
      console.log('Fetched user jobs:', data);
      setUserJobs(data || []);
    } catch (error) {
      console.error('Error loading user jobs:', error);
      setUserJobs([]);
    }
  };

  const loadUserApplications = async () => {
    try {
      if (!user) return;
      const jobIds = await jobService.getUserApplications();
      console.log('Fetched user applications:', jobIds);
      setAppliedJobs(jobIds);
    } catch (error) {
      console.error('Error loading user applications:', error);
      setAppliedJobs([]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    loadJobs();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({
      location: '',
      jobType: '',
      remote: false
    });
    setSearchQuery(''); // Clear search query when clearing filters
    loadJobs();
    setShowFilters(false);
  };

  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
  };

  const handleCreateReferral = () => {
    onCreateReferral(() => {
      loadJobs();
      loadUserJobs();
      loadUserApplications();
    });
  };

  const handleApplyToJob = () => {
    if (!user) {
      setApplicationError('You must be logged in to apply.');
      return;
    }
    setShowApplicationModal(true);
    setApplicationStep(1);
    setApplicationForm({
      email: user.email || '',
      phone: '',
      resume: null,
      customFields: {}
    });
    setApplicationError(null);
  };

  const handleApplicationInputChange = (field: string, value: string | File | null) => {
    setApplicationForm(prev => ({
      ...prev,
      [field]: value
    }));
    if (applicationError) {
      setApplicationError(null);
    }
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setApplicationForm(prev => ({
      ...prev,
      customFields: { ...prev.customFields, [key]: value }
    }));
    if (applicationError) {
      setApplicationError(null);
    }
  };

  const handleApplicationNext = async () => {
    if (applicationStep === 1) {
      if (!applicationForm.email.trim() || !applicationForm.phone.trim()) {
        setApplicationError('Email and phone number are required.');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(applicationForm.email)) {
        setApplicationError('Invalid email format.');
        return;
      }
      setApplicationStep(2);
    } else if (applicationStep === 2) {
      if (!applicationForm.resume) {
        setApplicationError('Resume is required.');
        return;
      }
      try {
        if (selectedJob && user) {
          const jobId = await jobService.createApplication({
            job_id: selectedJob.id,
            email: applicationForm.email,
            phone: applicationForm.phone,
            cover_letter: applicationForm.customFields.coverLetter || null,
            resume: applicationForm.resume
          });
          console.log('Application submitted for job:', jobId);
          setAppliedJobs(prev => [...prev, jobId]);
          setApplicationStep(3);
          setTimeout(() => {
            setShowApplicationModal(false);
            setApplicationStep(1);
          }, 2000);
        }
      } catch (error: any) {
        console.error('Error submitting application:', error);
        setApplicationError(error.message || 'Failed to submit application. Please try again.');
      }
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

  const filteredJobs = jobs.filter(job => {
    console.log('Job being filtered:', job); // Debug log
    const matchesSearch = 
      (!searchQuery || // Allow all jobs if no search query
       job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
       job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
       job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (job.department && job.department.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesFilters = 
      (!filters.location || job.location.toLowerCase().includes(filters.location.toLowerCase())) &&
      (!filters.jobType || job.job_type === filters.jobType) &&
      (filters.remote === undefined || filters.remote === job.remote_available);
    console.log('Matches search:', matchesSearch, 'Matches filters:', matchesFilters, 'Job status:', job.status);
    return matchesSearch && matchesFilters;
  });

  console.log('Filtered jobs:', filteredJobs);

  const isUserJob = (jobId: string) => {
    return userJobs.some(job => job.id === jobId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Jobs</h3>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={loadJobs}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Search, Filters, Job List, Create Referral */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-end mb-6 gap-4">
                <button
                  onClick={handleCreateReferral}
                  className="bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-2 font-medium"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Referral</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search jobs, companies, locations..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </form>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-6 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
                >
                  <Filter className="h-5 w-5" />
                  <span>Filter</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showFilters && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        placeholder="City, State, or Country"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Job Type</label>
                      <select
                        value={filters.jobType}
                        onChange={(e) => handleFilterChange('jobType', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Types</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center space-x-3 mt-6">
                        <input
                          type="checkbox"
                          checked={filters.remote}
                          onChange={(e) => handleFilterChange('remote', e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700">Remote Only</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 space-x-3">
                    <button
                      onClick={handleClearFilters}
                      className="px-4 py-2 text-slate-700 hover:text-slate-900 transition-colors"
                    >
                      Clear Filters
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={`p-4 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${selectedJob?.id === job.id ? 'bg-slate-100 border-slate-300' : ''}`}
                  >
                    <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                    <p className="text-slate-600 font-medium">{job.company}</p>
                    <p className="text-sm text-slate-500">{job.location}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {job.urgent_hiring && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                          Urgent
                        </span>
                      )}
                      {job.remote_available && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          Remote
                        </span>
                      )}
                      {isUserJob(job.id) && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          Your Referral
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">No jobs found</h3>
                  <p className="text-slate-600 mb-6">No jobs match your search criteria.</p>
                  <button
                    onClick={handleClearFilters}
                    className="bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 transition-colors inline-flex items-center space-x-2 font-medium"
                  >
                    <X className="h-5 w-5" />
                    <span>Clear Search & Filters</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Job Details */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedJob.title}</h2>
                  <p className="text-slate-600 font-medium mb-2">{selectedJob.company}</p>
                  {selectedJob.department && (
                    <p className="text-slate-500 text-sm mb-2">{selectedJob.department}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mb-2">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedJob.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{selectedJob.job_type}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Posted {formatTimeAgo(selectedJob.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>{selectedJob.experience_level}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{selectedJob.applications_count || 0} applications</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedJob.urgent_hiring && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                        Urgent
                      </span>
                    )}
                    {selectedJob.remote_available && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                        Remote
                      </span>
                    )}
                    {isUserJob(selectedJob.id) && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        Your Referral
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleApplyToJob}
                    disabled={appliedJobs.includes(selectedJob.id)}
                    className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 ${
                      appliedJobs.includes(selectedJob.id)
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Briefcase className="h-4 w-4" />
                    <span>Apply Now</span>
                  </button>
                </div>
                <div className="mb-4">
                  <h3 className="font-medium text-slate-900 mb-2">Job Description</h3>
                  <p className="text-slate-600 text-sm">{selectedJob.description}</p>
                </div>
                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-slate-900 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-slate-900 mb-2">Benefits</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.benefits.map((benefit: string, index: number) => (
                        <span
                          key={index}
                          className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No Job Selected</h3>
                <p className="text-slate-600">Select a job from the list to view details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Application Modal */}
        {showApplicationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Apply for {selectedJob?.title}</h2>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {applicationStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900">Step 1: Contact Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={applicationForm.email}
                      onChange={(e) => handleApplicationInputChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={applicationForm.phone}
                      onChange={(e) => handleApplicationInputChange('phone', e.target.value)}
                      placeholder="+1 (123) 456-7890"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {applicationError && (
                    <p className="text-red-500 text-sm">{applicationError}</p>
                  )}
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => setShowApplicationModal(false)}
                      className="px-6 py-2 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplicationNext}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {applicationStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900">Step 2: Resume and Additional Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Resume <span className="text-red-500">*</span></label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleApplicationInputChange('resume', e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cover Letter (Optional)</label>
                    <textarea
                      value={applicationForm.customFields.coverLetter || ''}
                      onChange={(e) => handleCustomFieldChange('coverLetter', e.target.value)}
                      rows={4}
                      placeholder="Provide a brief cover letter..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  {applicationError && (
                    <p className="text-red-500 text-sm">{applicationError}</p>
                  )}
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => setApplicationStep(1)}
                      className="px-6 py-2 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleApplicationNext}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit Application
                    </button>
                  </div>
                </div>
              )}

              {applicationStep === 3 && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Application Submitted!</h3>
                  <p className="text-slate-600">Your application for {selectedJob?.title} has been submitted successfully.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;