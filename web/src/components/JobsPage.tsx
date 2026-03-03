import React, { useState, useEffect } from 'react';
// Cache buster: 2025-01-25-15:30
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MapPin, Calendar, Briefcase, Building, Clock, Users, ChevronDown, X, CheckCircle, User, Copy, ArrowUpRight, List, School, DollarSign, CheckCircle2, Upload } from 'lucide-react';
import shareIcon from '../assets/share-icon.png';
import { useAuthContext } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';
import { blockingService } from '../services/blockingService';
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

interface LocationSuggestion {
  place_id?: number | string;
  display_name?: string;
  place_name?: string;
  address?: Record<string, string>;
  label?: string;
}

const JobsPage: React.FC = () => {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();

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
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationQuery, setLocationQuery] = useState(filters.location);
  const [locationError, setLocationError] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showJobTypeDropdown, setShowJobTypeDropdown] = useState(false);
  const [showExperienceDropdown, setShowExperienceDropdown] = useState(false);
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);
  const jobTypeDropdownRef = React.useRef<HTMLDivElement>(null);
  const locationDropdownRef = React.useRef<HTMLDivElement>(null);

  const [showVerificationModal, setShowVerificationModal] = useState(false);


  const jobUrl = selectedJob ? `${window.location.origin}/jobs/${selectedJob.id}` : '';

  // Ref to prevent double-fetching on mount
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    loadData();
    hasFetched.current = true;
  }, []); // Logic stable, only run once on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        showSortDropdown &&
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setShowSortDropdown(false);
      }

      if (
        showJobTypeDropdown &&
        jobTypeDropdownRef.current &&
        !jobTypeDropdownRef.current.contains(target)
      ) {
        setShowJobTypeDropdown(false);
      }

      if (
        locationSuggestions.length > 0 &&
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(target)
      ) {
        setLocationSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown, showJobTypeDropdown, locationSuggestions.length]);

  // Separate effect to load user-specific data when user ID changes
  const lastUserIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = user?.id || null;

    // Skip if user ID hasn't actually changed
    if (currentUserId === lastUserIdRef.current) return;
    lastUserIdRef.current = currentUserId;

    if (user) {
      loadUserJobs();
      loadUserApplications();
    } else {
      setUserJobs([]);
      setAppliedJobs([]);
      setApplicationsCount(0);
    }
  }, [user?.id]); // Use user.id, not the full object

  const loadData = async () => {
    setLoading(true);
    // Removed debugCheckApplicationsTable call to prevent spam

    try {
      await Promise.all([
        loadJobs(),
        loadUserJobs(),
        loadUserApplications()
      ]);
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      setError(null);
      // Removed debugGetAllJobs call to prevent overload

      const data = await jobService.getJobs(filters);
      setJobs(data || []);

      if (!selectedJob && data && data.length > 0 && !isMobile) {
        setSelectedJob(data[0]);
      }
    } catch (error: any) {
      console.error('Failed to load jobs:', error);
      // Don't show full error UI for a temporary network blip if we can help it
      // But if it fails completely, set the error state
      setError(error.message || 'Failed to load jobs.');
    }
  };
  const
    loadUserJobs = async () => {
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

  const formatLocationSuggestion = (suggestion: LocationSuggestion): string => {
    const address = suggestion.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state_district ||
      '';
    const state = address.state || '';
    const country = address.country || '';

    const compact = [city, state, country].filter(Boolean).join(', ');
    return compact || suggestion.display_name || suggestion.place_name || '';
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
        const normalized = Array.isArray(data)
          ? data
            .map((item: any) => ({
              ...item,
              label: formatLocationSuggestion(item),
            }))
            .filter((item: LocationSuggestion) => Boolean(item.label))
          : [];

        setLocationSuggestions(normalized);
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

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    const displayName = suggestion.label || formatLocationSuggestion(suggestion);
    setFilters(prev => ({ ...prev, location: displayName }));
    setLocationQuery(displayName);
    setLocationSuggestions([]);
    setLocationError('');
  };

  const validateLocation = () => {
    const typedLocation = locationQuery.trim();

    // Location is optional. If user typed free text without picking a suggestion,
    // still use it as a valid filter value.
    if (!typedLocation) {
      setFilters(prev => ({ ...prev, location: '' }));
      setLocationError('');
      return true;
    }

    if (!filters.location || filters.location !== typedLocation) {
      setFilters(prev => ({ ...prev, location: typedLocation }));
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
  }; const
    filteredJobs = jobs.filter(job => {
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

  const handleNavigateToSettings = () => {
    setShowVerificationModal(false);
    navigate('/settings');
  };

  const handleCreateReferralClick = () => {
    if (!user) {
      navigate('/create-referral');
      return;
    }
    const canPostReferral = Boolean((profile as any)?.work_email_verified || profile?.secondary_email_verified);
    if (!canPostReferral) {
      setShowVerificationModal(true);
      return;
    }
    navigate('/create-referral');
  };

  const renderSelectedJobDetails = () => {
    if (!selectedJob) return null;

    return (
      <div className="max-w-4xl mx-auto p-8 lg:p-12 pb-24">
        {/* Job Header */}
        <div className="flex flex-col gap-6 border-b border-stone-divider pb-8 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="bg-center bg-no-repeat bg-contain bg-white rounded-xl size-20 shadow-sm border border-slate-100 p-2">
              {/* Company logo placeholder */}
              <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center">
                <Building className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="group flex items-center justify-center h-10 w-10 transition-colors"
              >
                <img
                  src={shareIcon}
                  alt="Share"
                  className="h-6 w-6 object-contain transition-all duration-200 group-hover:scale-110"
                />
              </button>
            </div>
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
              {selectedJob.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg text-slate-900 font-bold">{selectedJob.company}</span>
                {selectedJob && (selectedJob as any).created_by_profile?.response_metric && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${['24h', '3d'].includes((selectedJob as any).created_by_profile?.response_metric)
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`} title="Median Response Time">
                    ⚡️ Responds in {(selectedJob as any).created_by_profile?.response_metric}
                  </span>
                )}
              </div>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1">
                <MapPin className="text-[18px]" />
                {selectedJob.location}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>Posted {formatTimeAgo(selectedJob.created_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedJob.benefits && selectedJob.benefits.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <DollarSign className="text-[16px]" />
                {selectedJob.benefits[0]}
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Clock className="text-[16px]" />
              {selectedJob.job_type}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <School className="text-[16px]" />
              {selectedJob.experience_level}
            </div>
          </div>
          <div className="pt-2">
            {appliedJobs.includes(selectedJob.id) ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto px-8 h-12 rounded-lg bg-slate-300 text-slate-500 font-bold text-sm tracking-wide cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Applied</span>
              </button>
            ) : (
              <button
                onClick={handleApplyToJob}
                disabled={!user}
                className="w-full sm:w-auto px-8 h-12 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                <span>Apply Now</span>
                <ArrowUpRight className="text-[18px]" />
              </button>
            )}
          </div>
        </div>
        {/* Job Content */}
        <div className="space-y-10 text-slate-700 leading-relaxed">
          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4">About the Role</h3>
            <div className="text-slate-700 leading-relaxed whitespace-pre-line text-justify">
              {selectedJob.description || "We are looking for a talented professional to join our team. In this role, you will be responsible for delivering high-quality work and collaborating with cross-functional teams to achieve our goals."}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Responsibilities</h3>
            <ul className="space-y-3 list-none">
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="text-primary mt-0.5 text-[20px]" />
                <span>Lead projects across the entire product lifecycle and multiple product launches.</span>
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="text-primary mt-0.5 text-[20px]" />
                <span>Set the vision for the user experience and create the space for others to collaborate.</span>
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="text-primary mt-0.5 text-[20px]" />
                <span>Work with small multi-disciplinary teams. You'll partner closely with engineering, product, and business folks.</span>
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="text-primary mt-0.5 text-[20px]" />
                <span>Rapidly produce multiple concepts and prototypes; knowing when to apply pixel-perfect attention to detail.</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Skills & Requirements</h3>
            <div className="flex flex-wrap gap-2">
              {selectedJob.skills && selectedJob.skills.length > 0 ? (
                selectedJob.skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-md bg-stone-50 text-slate-700 text-sm font-semibold border border-stone-divider"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <>
                  <span className="px-3 py-1.5 rounded-md bg-stone-50 text-slate-700 text-sm font-semibold border border-stone-divider">Figma</span>
                  <span className="px-3 py-1.5 rounded-md bg-stone-50 text-slate-700 text-sm font-semibold border border-stone-divider">System Design</span>
                  <span className="px-3 py-1.5 rounded-md bg-stone-50 text-slate-700 text-sm font-semibold border border-stone-divider">Prototyping</span>
                  <span className="px-3 py-1.5 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-200">HTML/CSS</span>
                  <span className="px-3 py-1.5 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-200">User Research</span>
                  <span className="px-3 py-1.5 rounded-md bg-white text-slate-700 text-sm font-medium border border-slate-200">React</span>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  };



  if (loading) {
    return (
      <div className="bg-stone text-slate-700 font-display overflow-hidden min-h-[calc(100dvh-4rem)] md:h-screen flex flex-col selection:bg-primary selection:text-white">
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner text="Loading jobs..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-stone text-slate-700 font-display overflow-hidden min-h-[calc(100dvh-4rem)] md:h-screen flex flex-col selection:bg-primary selection:text-white">
        <div className="flex items-center justify-center h-full">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Jobs</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={loadData}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone text-slate-700 font-display overflow-hidden min-h-[calc(100dvh-4rem)] md:h-screen flex flex-col selection:bg-primary selection:text-white">
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:max-w-[480px] flex flex-col border-r border-stone-divider bg-stone-sidebar relative z-10">
          {/* Sidebar Header */}
          <div className="flex flex-col gap-4 p-5 border-b border-stone-divider bg-stone-sidebar">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Referrals</h1>
              </div>
              <button
                onClick={handleCreateReferralClick}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 h-10 rounded-lg transition-colors shadow-lg shadow-primary/20"
              >
                <Plus className="text-[20px]" />
                <span className="hidden sm:inline">Referral</span>
              </button>
            </div>
            <div className="flex gap-3 mt-2">
              <div className="flex flex-1 items-center rounded-lg bg-white border border-stone-divider focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
                <Search className="text-slate-500 pl-3" />
                <input
                  className="w-full bg-transparent border-none text-base md:text-sm px-3 py-2.5 placeholder:text-slate-500 text-slate-900 focus:ring-0"
                  placeholder="Search role, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                />
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center justify-center bg-white border border-stone-divider hover:bg-slate-50 rounded-lg size-[42px] transition-colors shrink-0 text-slate-500 hover:text-primary shadow-sm"
              >
                <List className="text-[20px]" />
              </button>
            </div>
          </div>
          {/* Jobs List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job, index) => {
                const isSelected = selectedJob?.id === job.id;
                const isFirstJob = index === 0;

                return (
                  <div
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={`group relative flex gap-4 p-4 rounded-xl cursor-pointer transition-all ${isSelected || isFirstJob
                      ? 'bg-white border border-slate-100 border-l-primary shadow-sm'
                      : 'border border-transparent hover:bg-white hover:border-slate-100 hover:border-l-primary hover:shadow-sm'
                      }`}
                  >
                    <div className="shrink-0">
                      <div className="bg-center bg-no-repeat bg-contain bg-white rounded-lg size-12 shadow-sm border border-slate-100 p-1">
                        {/* Company logo placeholder */}
                        <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center">
                          <Building className="h-6 w-6 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-center min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={`text-base font-bold truncate pr-2 ${isSelected || isFirstJob ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                          }`}>
                          {job.title}
                        </h3>
                        {job.urgent_hiring && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-slate-900 px-2 py-0.5 rounded-full shrink-0">
                            Urgent
                          </span>
                        )}
                        {isFirstJob && !job.urgent_hiring && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-olive px-2 py-0.5 rounded-full shrink-0">
                            New
                          </span>
                        )}
                        {userJobs.includes(job.id) && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-olive px-2 py-0.5 rounded-full shrink-0">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-slate-500 truncate">{job.company}</p>
                        {(job as any).created_by_profile?.response_metric && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${['24h', '3d'].includes((job as any).created_by_profile?.response_metric)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                            ⚡️ {(job as any).created_by_profile?.response_metric}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="text-[14px]" />
                          {job.location.includes(',') ? job.location.split(',')[0] : job.location}
                        </span>
                        <span>•</span>
                        <span>{job.job_type}</span>
                        {job.experience_level && (
                          <>
                            <span>•</span>
                            <span>{job.experience_level.replace(' Level', '').replace(' ', '').toLowerCase()}+</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
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
        </aside>
        {/* Main Content (Desktop only) */}
        <section className="hidden md:block flex-1 overflow-y-auto bg-white scroll-smooth">
          {selectedJob ? (
            renderSelectedJobDetails()
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No Job Selected</h3>
                <p className="text-slate-600">Select a job from the list to view details.</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Mobile Full-Screen Job Details */}
      {isMobile && selectedJob && (
        <div className="fixed inset-0 z-50 bg-white md:hidden slide-up-drawer">
          <div className="h-full flex flex-col">
            <div className="shrink-0 h-14 px-3 border-b border-stone-divider flex items-center justify-between bg-white">
              <button
                onClick={() => setSelectedJob(null)}
                className="h-10 w-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-stone-100"
                aria-label="Back to jobs list"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>
              <h2 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Job Details</h2>
              <span className="h-10 w-10" aria-hidden="true"></span>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              {renderSelectedJobDetails()}
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {
        showFilters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowFilters(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto relative" onClick={e => e.stopPropagation()}>
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Filter Jobs</h3>
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setShowFilters(false)}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Sort By</label>
                    <div className="relative" ref={sortDropdownRef}>
                      <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className={`w-full px-4 py-3 text-left border-2 rounded-lg transition-colors flex items-center justify-between ${filters.sortBy
                          ? 'bg-green-50 text-green-700 font-semibold border-[#5F7261]'
                          : 'bg-white text-gray-700 border-slate-200 hover:bg-gray-50'
                          }`}
                      >
                        <span>
                          {filters.sortBy === 'newest' ? 'Newest First' :
                            filters.sortBy === 'oldest' ? 'Oldest First' :
                              'Most Relevant'}
                        </span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showSortDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
                          <button
                            onClick={() => {
                              handleFilterChange('sortBy', '');
                              setShowSortDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 border-b border-slate-100"
                          >
                            Most Relevant
                          </button>
                          <button
                            onClick={() => {
                              handleFilterChange('sortBy', 'newest');
                              setShowSortDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 border-b border-slate-100"
                          >
                            Newest First
                          </button>
                          <button
                            onClick={() => {
                              handleFilterChange('sortBy', 'oldest');
                              setShowSortDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700"
                          >
                            Oldest First
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Job Type</label>
                    <div className="relative" ref={jobTypeDropdownRef}>
                      <button
                        onClick={() => setShowJobTypeDropdown(!showJobTypeDropdown)}
                        className={`w-full px-4 py-3 text-left border-2 rounded-lg transition-colors flex items-center justify-between ${filters.jobType
                          ? 'bg-green-50 text-green-700 font-semibold border-[#5F7261]'
                          : 'bg-white text-gray-700 border-slate-200 hover:bg-gray-50'
                          }`}
                      >
                        <span>{filters.jobType || 'Any Job Type'}</span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${showJobTypeDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showJobTypeDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <button
                            onClick={() => {
                              handleFilterChange('jobType', '');
                              setShowJobTypeDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 border-b border-slate-100"
                          >
                            Any Job Type
                          </button>
                          {['Full-time', 'Part-time', 'Contract'].map((type) => (
                            <button
                              key={type}
                              onClick={() => {
                                handleFilterChange('jobType', type);
                                setShowJobTypeDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 text-slate-700 border-b border-slate-100 last:border-0"
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Location</label>
                  <div className="relative" ref={locationDropdownRef}>
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={handleLocationInput}
                      placeholder="Enter city, state, or country"
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-lg focus:ring-0 transition-colors ${locationError
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-slate-200 focus:border-[#5F7261]'
                        }`}
                    />
                    {locationSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.place_id || index}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none text-slate-800"
                            onClick={() => handleLocationSelect(suggestion)}
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {locationError && (
                    <p className="mt-1 text-sm text-red-500">{locationError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Experience Level</label>
                  <div className="relative">
                    <select
                      value={filters.experienceLevel || ''}
                      onChange={e => handleFilterChange('experienceLevel', e.target.value)}
                      data-filter-select="true"
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors bg-green-50 text-gray-900 font-medium appearance-none cursor-pointer"
                      style={{
                        borderColor: '#5F7261',
                        minHeight: '48px'
                      }}
                    >
                      <option value="">All Levels</option>
                      <option value="Internship">Internship</option>
                      <option value="Entry Level">Entry Level (0-2 years)</option>
                      <option value="Mid Level">Mid Level (3-5 years)</option>
                      <option value="Senior Level">Senior Level (5+ years)</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center gap-4">
                  <button
                    onClick={handleClearFilters}
                    className="px-6 py-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors hover:bg-gray-100 rounded-lg"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => { handleApplyFilters(); setShowFilters(false); }}
                    className="px-8 py-2 text-white font-semibold rounded-lg transition-colors shadow-sm"
                    style={{
                      backgroundColor: '#5F7261'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a5c4d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5F7261'}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Share Modal */}
      {
        showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowShareModal(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Share Job</h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 break-all text-sm text-slate-600">
                  {jobUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className={`w-full h-12 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${copied
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-white hover:bg-primary-hover'
                    }`}
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Application Modal */}
      {
        showApplicationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowApplicationModal(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              {applicationStep === 1 ? (
                <>
                  <div className="px-6 py-4 border-b border-stone-divider flex items-center justify-between bg-stone-50">
                    <h3 className="text-xl font-bold text-slate-900">Apply for {selectedJob?.title}</h3>
                    <button onClick={() => setShowApplicationModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    {applicationError && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {applicationError}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                        <input
                          disabled
                          value={user?.user_metadata?.full_name || ''}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Email *</label>
                        <input
                          type="email"
                          value={applicationForm.email}
                          onChange={(e) => handleApplicationInputChange('email', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Resume *</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleApplicationInputChange('resume', e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center gap-2">
                            {applicationForm.resume ? (
                              <>
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                <span className="font-medium text-slate-900">{applicationForm.resume.name}</span>
                                <span className="text-xs text-slate-500">Click to change</span>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                  <Upload className="w-5 h-5 text-slate-500" />
                                </div>
                                <span className="font-medium text-primary">Click to upload resume</span>
                                <span className="text-xs text-slate-500">PDF, DOC, DOCX (Max 5MB)</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleApplicationSubmit}
                        className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                      >
                        <span>Submit Application</span>
                        <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Sent!</h3>
                  <p className="text-slate-600 mb-8">
                    Thanks for applying. The hiring team has been notified and will review your application shortly.
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Secondary Email Verification Modal */}
      <SecondaryEmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onNavigateToSettings={handleNavigateToSettings}
      />
    </div >
  );
};

export default JobsPage;
