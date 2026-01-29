import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MapPin, Calendar, Briefcase, Star, Building, Clock, Users, ChevronDown, X, CheckCircle, ArrowLeft, User, Share2, Copy } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';
import { Database } from '../lib/database.types';
import { useMediaQuery } from 'react-responsive';
import './JobsPage.css';
import LoadingSpinner from './LoadingSpinner';
import debounce from 'lodash.debounce';

import SecondaryEmailVerificationModal from './SecondaryEmailVerificationModal';

type Job = Database['public']['Tables']['jobs']['Row'];
type ApplicationInsert = Database['public']['Tables']['applications']['Insert'];

interface ApplicationFormData {
  resume: File | null;
  email: string;
  phone: string;
  customFields: { [key: string]: string };
}

const JobsPage: React.FC = () => {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 DEBUG: User state changed:', user);
    if (user) {
      console.log('🔍 DEBUG: User ID:', user.id);
      console.log('🔍 DEBUG: User email:', user.email);
    }
  }, [user]);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    jobType: '',
    remote: false,
    sortBy: '',
    experienceLevel: ''
  });
  const [userJobs, setUserJobs] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormData>({
    resume: null,
    email: '',
    phone: '',
    customFields: {},
  });
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [applicationStep, setApplicationStep] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [locationQuery, setLocationQuery] = useState(filters.location);
  const [locationError, setLocationError] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Height of the header (adjust if your header height changes)
  const HEADER_HEIGHT = 80; // px (h-20 = 5rem = 80px)

  const jobUrl = selectedJob ? `${window.location.origin}/jobs/${selectedJob.id}` : '';

  useEffect(() => {
    loadData();
  }, []);

  // Separate effect to load user-specific data when user changes
  useEffect(() => {
    if (user) {
      loadUserJobs();
      loadUserApplications();
    } else {
      // Clear user-specific data when user logs out
      setUserJobs([]);
      setAppliedJobs([]);
      setApplicationsCount(0);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // DEBUG: Check applications table schema
    console.log('🔍 DEBUG: Checking applications table schema...');
    try {
      await jobService.debugCheckApplicationsTable();
    } catch (error) {
      console.error('❌ DEBUG: Error checking applications table:', error);
    }
    
    await Promise.all([
      loadJobs(),
      loadUserJobs(),
      loadUserApplications()
    ]);
    setLoading(false);
  };

  const loadJobs = async () => {
    try {
      setError(null);
      
      // TEMPORARY DEBUG - Call debug function first
      console.log('🔍 DEBUG: Calling debug function...');
      await jobService.debugGetAllJobs();
      
      const data = await jobService.getJobs(filters);
      setJobs(data || []);
      
      // Only auto-select first job on desktop (not mobile)
      if (!selectedJob && data && data.length > 0 && !isMobile) {
        setSelectedJob(data[0]);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load jobs.');
    }
  };

  const loadUserJobs = async () => {
    if (!user) {
      setUserJobs([]);
      return;
    }
    try {
      const data = await jobService.getUserJobs();
      setUserJobs(data.map((j: Job) => j.id));
    } catch (error) {
      console.error('Error loading user jobs:', error);
      setUserJobs([]);
    }
  };

  const loadUserApplications = async () => {
    if (!user) {
      setAppliedJobs([]);
      setApplicationsCount(0);
      return;
    }
    try {
      const jobIds = await jobService.getUserApplications();
      setAppliedJobs(jobIds);
      setApplicationsCount(jobIds.length);
      console.log('🔍 DEBUG: Applied jobs loaded:', jobIds);
    } catch (error) {
      console.error('Error loading user applications:', error);
      setAppliedJobs([]);
      setApplicationsCount(0);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear selected job on mobile when searching
    if (isMobile) {
      setSelectedJob(null);
    }
    loadJobs();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Debounced fetch for location suggestions
  const fetchLocationSuggestions = React.useCallback(
    debounce(async (query: string) => {
      if (!query) {
        setLocationSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8`
        );
        const data = await response.json();
        setLocationSuggestions(data);
      } catch (error) {
        setLocationSuggestions([]);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (locationQuery) {
      fetchLocationSuggestions(locationQuery);
    } else {
      setLocationSuggestions([]);
    }
  }, [locationQuery, fetchLocationSuggestions]);

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationTouched(true);
    setLocationQuery(e.target.value);
    setLocationError('');
    setFilters(prev => ({ ...prev, location: '' }));
  };

  const handleLocationSelect = (suggestion: any) => {
    const displayName = suggestion.display_name;
    setFilters(prev => ({ ...prev, location: displayName }));
    setLocationQuery(displayName);
    setLocationSuggestions([]);
    setLocationError('');
  };

  const validateLocation = () => {
    if (!filters.location || !locationQuery || filters.location !== locationQuery) {
      setLocationError('Select a valid location.');
      return false;
    }
    setLocationError('');
    return true;
  };

  const handleApplyFilters = () => {
    setLocationTouched(true);
    if (!validateLocation()) return;
    if (isMobile) setSelectedJob(null);
    loadJobs();
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({
      location: '',
      jobType: '',
      remote: false,
      sortBy: '',
      experienceLevel: ''
    });
    setSearchQuery(''); // Clear search query when clearing filters
    
    // Clear selected job on mobile when clearing filters
    if (isMobile) {
      setSelectedJob(null);
    }
    
    loadJobs();
    setShowFilters(false);
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };

  const handleApplyToJob = () => {
    if (!user) {
      setApplicationError('Please sign in to apply for jobs. Click "Sign In" in the header to get started.');
      return;
    }
    if (!selectedJob) return;
    if (appliedJobs.includes(selectedJob.id)) {
      // Prevent opening modal if already applied
      return;
    }
    setShowApplicationModal(true);
    setApplicationStep(1);
    setApplicationForm({
      resume: null,
      email: '',
      phone: '',
      customFields: {},
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

  const handleApplicationSubmit = async () => {
    if (!selectedJob) {
      setApplicationError('Please select a job.');
      return;
    }

    if (!user) {
      setApplicationError('Please log in to apply for jobs.');
      return;
    }

    if (!applicationForm.email || !applicationForm.resume) {
      setApplicationError('Please fill in all required fields.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(applicationForm.email)) {
      setApplicationError('Please enter a valid email address.');
      return;
    }

    try {
      setApplicationError(null);
      const file = applicationForm.resume as File;
      
      // For development: Convert file to base64 instead of uploading to S3
      const fileReader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.onerror = reject;
        fileReader.readAsDataURL(file);
      });

      // Create application data with base64 file data
      const applicationData = {
        job_id: selectedJob.id,
        applicant_id: user.id,
        resume: fileData, // Store base64 data as resume
        email: applicationForm.email
      };

      // Call jobService to save the application
      await jobService.createApplication(applicationData);
      setApplicationStep(2); // Go to success step
      await loadUserApplications();
      await loadJobs();
      setTimeout(() => {
        setShowApplicationModal(false);
        setApplicationStep(1);
        setApplicationForm({
          resume: null,
          email: '',
          phone: '',
          customFields: {},
        });
        setApplicationError(null);
      }, 3000);
    } catch (error: any) {
      console.error('❌ Application submission error:', error);
      setApplicationError(error.message || 'Failed to submit application.');
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
    const matchesSearch = 
       job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilters = 
      (!filters.location || job.location.toLowerCase().includes(filters.location.toLowerCase())) &&
      (!filters.jobType || job.job_type === filters.jobType) &&
      (!filters.remote || job.remote_available);
    return matchesSearch && matchesFilters;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(jobUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Add the Uiverse.io button styles scoped to .my-button
  const uiverseApplyNowBtnStyles = `
  .my-button {
    background: linear-gradient(90deg, #3b82f6 0%, #00ddeb 100%);
    border: none;
    color: white;
    padding: 10px 20px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    border-radius: 5px;
    box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25);
    position: relative;
    overflow: hidden;
    font-weight: 600;
    letter-spacing: 0.1em;
    transition: all 0.3s;
  }
  .my-button:after {
    content: "";
    background-color: rgba(255, 255, 255, 0.2);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
  }
  .my-button:hover:after {
    animation: ripple_401 1s ease-out;
  }
  @keyframes ripple_401 {
    0% {
      width: 5px;
      height: 5px;
      opacity: 1;
    }
    100% {
      width: 200px;
      height: 200px;
      opacity: 0;
    }
  }
  `;

  // Add the Uiverse.io Send button styles scoped to .uiverse-send-btn
  const uiverseSendBtnStyles = `
  .uiverse-send-btn {
    display: flex;
    align-items: center;
    background-color: #3b82f6;
    color: #fff;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: 600;
    letter-spacing: 0.1em;
    border-radius: 0.375rem;
    transition: all 0.3s;
    font-size: 1rem;
    box-shadow: none;
    border: none;
  }
  .uiverse-send-btn:hover {
    background-color: #60a5fa;
    gap: 0.5rem;
    transform: translateX(0.75rem);
  }
  .uiverse-send-btn:active {
    transform: scale(0.97);
  }
  `;

  const handleNavigateToSettings = () => {
    setShowVerificationModal(false);
    navigate('/settings');
  };

  const handleCreateReferralClick = () => {
    if (!user) {
      navigate('/create-referral');
      return;
    }
    if (!profile?.secondary_email_verified) {
      setShowVerificationModal(true);
      return;
    }
    navigate('/create-referral');
  };

  if (loading) {
    return <LoadingSpinner text="Loading jobs..." />;
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
            onClick={loadData}
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
      <style>{uiverseApplyNowBtnStyles}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={isMobile ? '' : 'grid lg:grid-cols-3 gap-6'}>
          {/* Search, Filters, Job List, Create Referral */}
          <div className={isMobile ? '' : 'lg:col-span-1 space-y-6'}>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-end mb-6 gap-4">
                <button
                  onClick={handleCreateReferralClick}
                  className="bg-slate-900 text-white w-full py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 font-medium text-lg shadow-sm"
                  style={{maxWidth: '100%'}}
                >
                  <Plus className="h-6 w-6" />
                  <span>Create Referral</span>
                </button>
              </div>

              {/* Authentication Notice */}
              {!user && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800">
                        <strong>Sign in required:</strong> You need to sign in to apply for jobs. Click "Sign In" in the header to get started.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  onClick={() => setShowFilters(true)}
                  className={`flex items-center space-x-2 px-6 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700 ${showFilters ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <Filter className="h-5 w-5" />
                  <span>Filter</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Filter Modal Popover */}
              {showFilters && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setShowFilters(false)}>
                  <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                    <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={() => setShowFilters(false)} aria-label="Close">
                      <X className="h-5 w-5" />
                    </button>
                    <h3 className="text-lg font-bold mb-4 text-slate-900">Filter Jobs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Sort By */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                        <select
                          value={filters.sortBy || ''}
                          onChange={e => handleFilterChange('sortBy', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Relevant</option>
                          <option value="newest">Newest</option>
                        </select>
                      </div>
                      {/* Job Type */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Job Type</label>
                        <select
                          value={filters.jobType}
                          onChange={e => handleFilterChange('jobType', e.target.value)}
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
                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={locationQuery}
                          onChange={handleLocationInput}
                          onBlur={() => setLocationTouched(true)}
                          placeholder="City, State, or Country"
                          className={`w-full px-4 py-2 border ${locationError ? 'border-red-500' : 'border-slate-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                          autoComplete="off"
                        />
                        {locationSuggestions.length > 0 && (
                          <ul className="absolute z-10 bg-white border border-slate-200 rounded-md mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
                            {locationSuggestions.map((suggestion, idx) => (
                              <li
                                key={suggestion.place_id}
                                className="px-4 py-2 cursor-pointer hover:bg-blue-100"
                                onMouseDown={() => handleLocationSelect(suggestion)}
                              >
                                {suggestion.display_name}
                              </li>
                            ))}
                          </ul>
                        )}
                        {locationError && locationTouched && (
                          <p className="text-red-600 text-xs mt-1">{locationError}</p>
                        )}
                      </div>
                      {/* Onsite/Remote */}
                      <div className="flex items-center space-x-3 mt-6">
                        <input
                          type="checkbox"
                          checked={filters.remote}
                          onChange={e => handleFilterChange('remote', e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700">Remote Only</span>
                      </div>
                      {/* Experience Level */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Experience Level</label>
                        <select
                          value={filters.experienceLevel || ''}
                          onChange={e => handleFilterChange('experienceLevel', e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">All Levels</option>
                          <option value="Entry Level">Entry Level</option>
                          <option value="Mid Level">Mid Level</option>
                          <option value="Senior Level">Senior Level</option>
                        </select>
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
                        onClick={() => { handleApplyFilters(); setShowFilters(false); }}
                        className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Job List */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => isMobile ? setSelectedJob(job) : handleSelectJob(job)}
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
                      {userJobs.includes(job.id) && (
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

          {/* Job Details: Desktop (split view), Mobile (modal) */}
          {!isMobile && (
            <div className="lg:col-span-2">
              {selectedJob ? (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <div className="mb-6">
                    {/* Job Description Header */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6 flex flex-col gap-2 relative">
                      {/* Share Icon */}
                      <button
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 transition-colors"
                        onClick={() => setShowShareModal(true)}
                        aria-label="Share job"
                      >
                        <Share2 className="h-5 w-5 text-slate-500" />
                      </button>
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
                          <span>{applicationsCount} applications</span>
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
                        {userJobs.includes(selectedJob.id) && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                            Your Referral
                          </span>
                        )}
                      </div>
                      {appliedJobs.includes(selectedJob.id) ? (
                        <button
                          type="button"
                          disabled
                          className="self-start px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 bg-slate-300 text-slate-500 cursor-not-allowed select-none"
                          style={{ width: 'fit-content', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 20px' }}
                        >
                          <span style={{ width: '100%', textAlign: 'center' }}>Applied</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleApplyToJob}
                          disabled={!user}
                          className={
                            !user
                              ? 'self-start px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 bg-slate-400 text-slate-600 cursor-not-allowed'
                              : 'my-button self-start font-medium flex justify-center items-center'
                          }
                          style={{ width: 'fit-content', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        >
                          <span style={{ width: '100%', textAlign: 'center' }}>Apply Now</span>
                        </button>
                      )}
                    </div>
                    {/* Share Modal */}
                    {showShareModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setShowShareModal(false)}>
                        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                          <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={() => setShowShareModal(false)} aria-label="Close">
                            <X className="h-5 w-5" />
                          </button>
                          <h3 className="text-lg font-bold mb-4 text-slate-900">Share this job</h3>
                          <div className="flex items-center space-x-2 mb-4">
                            <input
                              type="text"
                              value={jobUrl}
                              readOnly
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-slate-50 focus:outline-none"
                            />
                            <button
                              onClick={handleCopy}
                              className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                              aria-label="Copy job link"
                            >
                              <Copy className="h-5 w-5 text-slate-600" />
                            </button>
                          </div>
                          {copied && <div className="text-green-600 text-sm font-medium">Copied!</div>}
                          <div className="text-slate-500 text-xs mt-2">Copy and share this link anywhere.</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <h3 className="font-medium text-slate-900 mb-2">Job Description</h3>
                    <div className="text-slate-600 text-sm whitespace-pre-line">{selectedJob.description}</div>
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
          )}
          {/* Mobile: Job Details Drawer */}
          {isMobile && selectedJob && (
            <div
              className="fixed left-0 right-0 bottom-0 z-50 flex justify-center bg-black bg-opacity-40"
              style={{ top: `${HEADER_HEIGHT}px` }}
              onClick={() => setSelectedJob(null)}
            >
              <div
                className="bg-white rounded-t-lg shadow-lg p-6 w-full max-w-lg relative overflow-y-auto max-h-[calc(100vh-80px)] slide-up-drawer"
                onClick={e => e.stopPropagation()}
              >
                <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={() => setSelectedJob(null)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
                <div className="mb-6">
                  {/* Job Description Header */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6 flex flex-col gap-2 relative">
                    {/* Share Icon */}
                    <button
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 transition-colors"
                      onClick={() => setShowShareModal(true)}
                      aria-label="Share job"
                    >
                      <Share2 className="h-5 w-5 text-slate-500" />
                    </button>
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
                        <span>{applicationsCount} applications</span>
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
                      {userJobs.includes(selectedJob.id) && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          Your Referral
                        </span>
                      )}
                    </div>
                    {appliedJobs.includes(selectedJob.id) ? (
                      <button
                        type="button"
                        disabled
                        className="self-start px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 bg-slate-300 text-slate-500 cursor-not-allowed select-none"
                        style={{ width: 'fit-content', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 20px' }}
                      >
                        <span style={{ width: '100%', textAlign: 'center' }}>Applied</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleApplyToJob}
                        disabled={!user}
                        className={
                          !user
                            ? 'self-start px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 bg-slate-400 text-slate-600 cursor-not-allowed'
                            : 'my-button self-start font-medium flex justify-center items-center'
                        }
                        style={{ width: 'fit-content', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <span style={{ width: '100%', textAlign: 'center' }}>Apply Now</span>
                      </button>
                    )}
                  </div>
                  {/* Share Modal */}
                  {showShareModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setShowShareModal(false)}>
                      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={() => setShowShareModal(false)} aria-label="Close">
                          <X className="h-5 w-5" />
                        </button>
                        <h3 className="text-lg font-bold mb-4 text-slate-900">Share this job</h3>
                        <div className="flex items-center space-x-2 mb-4">
                          <input
                            type="text"
                            value={jobUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-slate-50 focus:outline-none"
                          />
                          <button
                            onClick={handleCopy}
                            className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            aria-label="Copy job link"
                          >
                            <Copy className="h-5 w-5 text-slate-600" />
                          </button>
                        </div>
                        {copied && <div className="text-green-600 text-sm font-medium">Copied!</div>}
                        <div className="text-slate-500 text-xs mt-2">Copy and share this link anywhere.</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <h3 className="font-medium text-slate-900 mb-2">Job Description</h3>
                  <div className="text-slate-600 text-sm whitespace-pre-line">{selectedJob.description}</div>
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
            </div>
          )}
        </div>

        {/* Application Modal */}
        {showApplicationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <style>{uiverseSendBtnStyles}</style>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Resume <span className="text-red-500">*</span></label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleApplicationInputChange('resume', e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
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
                      onClick={handleApplicationSubmit}
                      className="uiverse-send-btn"
                    >
                      Send
                      <svg
                        className="w-5 h-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {applicationStep === 2 && (
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

        {/* Secondary Email Verification Modal */}
        <SecondaryEmailVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onNavigateToSettings={handleNavigateToSettings}
        />
      </div>
    </div>
  );
};

export default JobsPage;