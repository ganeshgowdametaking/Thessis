import React, { useState, useEffect } from 'react';
// Cache buster: 2025-01-25-15:30
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, MapPin, Briefcase, X, CheckCircle, Copy, SlidersHorizontal, CheckCircle2, Upload, BadgeCheck, Loader2, Clock, Check } from 'lucide-react';
import shareIcon from '../assets/share-icon.png';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { jobService } from '../services/jobService';
import { Database } from '../lib/database.types';
import { useMediaQuery } from 'react-responsive';
import './JobsPage.css';
import MobileDialog from './MobileDialog';
import debounce from 'lodash.debounce';
import SecondaryEmailVerificationModal from './SecondaryEmailVerificationModal';
import CompanyAvatar from './CompanyAvatar';
import { getCompanyLogoUrl } from '../utils/companyLogo';
import { Modal, Button, Skeleton, SkeletonRow } from './ui';

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

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

const SORT_OPTIONS = [
  { value: '', label: 'Most relevant' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const JOB_TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Freelance', label: 'Freelance' },
];

// Jobs store free-text levels like "Mid Level (2-4 yrs)", "Senior (5+ yrs)" or
// "Lead / Manager", so the filter matches on a keyword rather than the full string.
const EXPERIENCE_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'intern', label: 'Internship' },
  { value: 'entry', label: 'Entry' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];

const pillClass = (active: boolean) =>
  `px-3.5 py-2 rounded-full text-[12.5px] font-bold border transition-colors ${active
    ? 'bg-primary text-white border-primary'
    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
  }`;

const tagClass = 'job-tag text-[11px] font-semibold text-slate-600 bg-parchment-sunken px-2.5 py-0.5 rounded-full';

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
  const [firstViewedMap, setFirstViewedMap] = useState<Record<string, string>>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormData>({
    resume: null,
    email: '',
    phone: '',
    customFields: {},
  });
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [completenessScore, setCompletenessScore] = useState<number | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [applicationStep, setApplicationStep] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 767 });

  // Give native Back the same behavior as the visible mobile Back buttons.
  useEffect(() => {
    if (!(isMobile && selectedJob)) return;
    const dialogId = crypto.randomUUID();
    window.history.pushState({ ...window.history.state, jobDetailSheet: dialogId }, '');
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.jobDetailSheet === dialogId) return;
      setSelectedJob(null);
      setShowApplicationModal(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, selectedJob?.id]);

  useEffect(() => {
    if (!(isMobile && showApplicationModal)) return;
    window.history.pushState({ ...window.history.state, applicationForm: true }, '');
    const handlePopState = () => setShowApplicationModal(false);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, showApplicationModal]);

  const dismissJobSheet = () => {
    setSelectedJob(null);
    if (window.history.state?.jobDetailSheet) window.history.back();
  };
  const closeApplication = () => {
    if (isSubmittingApplication) return;
    setShowApplicationModal(false);
    if (isMobile && window.history.state?.applicationForm) window.history.back();
  };
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationQuery, setLocationQuery] = useState(filters.location);
  const [locationError, setLocationError] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
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

  // Close location suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

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
  }, [locationSuggestions.length]);

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

  // Takes the filters to query with, because callers that just called setFilters
  // would otherwise refetch with the previous render's values.
  const loadJobs = async (activeFilters = filters) => {
    try {
      setError(null);
      // Removed debugGetAllJobs call to prevent overload

      const data = await jobService.getJobs(activeFilters);
      setJobs(data || []);

      if (!selectedJob && data && data.length > 0 && !isMobile) {
        setSelectedJob(data[0]);
      }

      if (data && data.length > 0) {
        const jobIds = data.map((job) => job.id);
        jobService.getFirstViewedMap(jobIds).then((map) => {
          setFirstViewedMap((prev) => ({ ...prev, ...map }));
          const unseenIds = jobIds.filter((id) => !map[id]);
          if (unseenIds.length > 0) {
            jobService.recordJobFirstViews(unseenIds);
            const now = new Date().toISOString();
            setFirstViewedMap((prev) => {
              const next = { ...prev };
              unseenIds.forEach((id) => { if (!next[id]) next[id] = now; });
              return next;
            });
          }
        });
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
    const cleared = {
      location: '',
      jobType: '',
      remote: false,
      sortBy: '',
      experienceLevel: ''
    };
    setFilters(cleared);
    setLocationQuery('');
    setSearchQuery(''); // Clear search query when clearing filters

    // Clear selected job on mobile when clearing filters
    if (isMobile) {
      setSelectedJob(null);
    }

    loadJobs(cleared);
    setShowFilters(false);
  };

  const handleRemoveFilter = (key: keyof typeof filters) => {
    const next = { ...filters, [key]: key === 'remote' ? false : '' };
    setFilters(next);
    if (key === 'location') setLocationQuery('');
    loadJobs(next);
  };

  const activeFilterChips = [
    filters.jobType && { key: 'jobType' as const, label: filters.jobType },
    filters.experienceLevel && {
      key: 'experienceLevel' as const,
      label: EXPERIENCE_OPTIONS.find((o) => o.value === filters.experienceLevel)?.label || filters.experienceLevel,
    },
    filters.location && { key: 'location' as const, label: filters.location.split(',')[0] },
    filters.remote && { key: 'remote' as const, label: 'Remote only' },
    filters.sortBy && { key: 'sortBy' as const, label: filters.sortBy === 'newest' ? 'Newest first' : 'Oldest first' },
  ].filter(Boolean) as { key: keyof typeof filters; label: string }[];

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
    setCompletenessScore(null);
    supabase
      .rpc('calculate_profile_completeness', { p_profile_id: user.id })
      .then(({ data, error }) => {
        if (!error && typeof data === 'number') setCompletenessScore(data);
      });
  };

  const handleApplicationInputChange = (field: string, value: string | File | null) => {
    if (field === 'resume' && value instanceof File && value.size > MAX_RESUME_SIZE_BYTES) {
      setApplicationError('Resume file is too large. Please upload a file under 5MB.');
      return;
    }
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
      setIsSubmittingApplication(true);
      const file = applicationForm.resume as File;
      const resumeUrl = await jobService.uploadResume(file, user.id);

      const applicationData = {
        job_id: selectedJob.id,
        applicant_id: user.id,
        resume: resumeUrl,
        email: applicationForm.email
      };

      // Call jobService to save the application
      await jobService.createApplication(applicationData);
      setApplicationStep(2); // Go to success step
      setIsSubmittingApplication(false);
      loadUserApplications();
      loadJobs();
      setTimeout(() => {
        if (isMobile && window.history.state?.applicationForm) window.history.back();
        else setShowApplicationModal(false);
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
      setIsSubmittingApplication(false);
    }
  };

  const isRecentPosting = (dateString: string) => {
    const days = (Date.now() - new Date(dateString).getTime()) / 86400000;
    return days <= 30;
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

  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase());
      // filters.location is a full "City, State, Country" string from the
      // geocoding suggestion, but job.location is usually just the city (or
      // city + country) — match on the city portion, not the whole string.
      const filterCity = filters.location.split(',')[0].trim().toLowerCase();
      const matchesFilters =
        (!filterCity || job.location.toLowerCase().includes(filterCity)) &&
        (!filters.jobType || job.job_type === filters.jobType) &&
        (!filters.remote || job.remote_available) &&
        (!filters.experienceLevel || (job.experience_level || '').toLowerCase().includes(filters.experienceLevel));
      return matchesSearch && matchesFilters;
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (filters.sortBy === 'oldest') return diff;
      if (filters.sortBy === 'newest') return -diff;
      return 0;
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

    const isApplied = appliedJobs.includes(selectedJob.id);
    const locationLabel = (() => {
      const parts = selectedJob.location.split(',').map(p => p.trim()).filter(Boolean);
      return parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : selectedJob.location;
    })();

    const applyControl = isApplied ? (
      <span className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl bg-success-tint text-success-ink font-bold text-sm">
        <Check className="h-4 w-4" strokeWidth={3} />
        Applied
      </span>
    ) : (
      <button
        onClick={handleApplyToJob}
        disabled={!user}
        className="px-7 h-12 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-colors flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
      >
        Apply Now
      </button>
    );

    const shareControl = (
      <button
        onClick={() => setShowShareModal(true)}
        aria-label="Share job"
        className="group flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white transition-colors hover:bg-parchment-sunken shrink-0"
      >
        <img
          src={shareIcon}
          alt=""
          className="h-5 w-5 object-contain transition-transform duration-200 group-hover:scale-110"
        />
      </button>
    );

    return (
      <div className="w-full min-h-full flex flex-col">
        {/* Job Header */}
        <div className="job-detail-header px-6 pt-6 pb-6 md:px-12 md:pt-10 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="rounded-2xl size-14 border border-slate-100 overflow-hidden shrink-0">
                <CompanyAvatar company={selectedJob.company} logoUrl={((selectedJob as any).created_by_profile?.account_type === 'company' ? (selectedJob as any).created_by_profile?.avatar_url : undefined) || getCompanyLogoUrl(selectedJob.company)} size="sm" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-bold text-primary truncate">{selectedJob.company}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{locationLabel}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Posted {formatTimeAgo(selectedJob.created_at)}</span>
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              {shareControl}
              {applyControl}
            </div>
          </div>

          <h1 className="font-display text-2xl lg:text-[30px] leading-tight font-extrabold text-ink">
            {selectedJob.title}
          </h1>

          <div className="flex flex-wrap gap-2">
            {selectedJob.urgent_hiring && (
              <span className="text-[10.5px] font-bold uppercase tracking-wider bg-danger-tint text-red-600 border border-red-200 px-2.5 py-1 rounded-full">
                Urgent hiring
              </span>
            )}
            {selectedJob.job_type && <span className="px-3 py-1 rounded-full bg-parchment-sunken text-xs font-semibold text-slate-600">{selectedJob.job_type}</span>}
            <span className="px-3 py-1 rounded-full bg-parchment-sunken text-xs font-semibold text-slate-600">{selectedJob.remote_available ? 'Remote' : 'Onsite'}</span>
            {selectedJob.experience_level && <span className="px-3 py-1 rounded-full bg-parchment-sunken text-xs font-semibold text-slate-600">{selectedJob.experience_level}</span>}
          </div>
        </div>

        {/* Job Content */}
        <div className="job-detail-content flex-1 px-6 py-7 md:px-12 md:py-8 space-y-8">
          <section>
            <h3 className="font-display text-[17px] font-bold text-ink mb-2.5">About the role</h3>
            {selectedJob.description ? (
              <div className="text-[14.5px] text-slate-600 leading-relaxed whitespace-pre-line max-w-[70ch]">
                {selectedJob.description}
              </div>
            ) : (
              <p className="text-sm text-slate-400">The person who posted this role didn't add a description.</p>
            )}
          </section>

          {selectedJob.skills && selectedJob.skills.length > 0 && (
            <section>
              <h3 className="font-display text-[17px] font-bold text-ink mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {selectedJob.skills.map((skill: string, index: number) => (
                  <span key={index} className="px-3.5 py-1.5 rounded-full bg-ink-wash text-primary-hover text-[13px] font-semibold">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {selectedJob.benefits && selectedJob.benefits.length > 0 && (
            <section>
              <h3 className="font-display text-[17px] font-bold text-ink mb-3">Benefits</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl">
                {selectedJob.benefits.map((benefit: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-[13.5px] text-slate-600">
                    <Check className="h-4 w-4 text-success shrink-0" strokeWidth={2.5} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Mobile: actions pinned to the bottom of the sheet */}
        <div className="md:hidden sticky bottom-0 flex gap-2.5 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] bg-white border-t border-slate-100">
          {shareControl}
          <div className="flex-1 [&>*]:w-full">{applyControl}</div>
        </div>
      </div>
    );
  };



  const renderApplicationFields = () => (
    <>
      {applicationError && (
        <div role="alert" className="bg-danger-tint text-red-600 p-3.5 rounded-xl border border-red-200 text-sm font-medium flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          {applicationError}
        </div>
      )}

      {completenessScore !== null && completenessScore < 70 && (isMobile ? (
        <p className="mobile-profile-tip">
          Your profile is {completenessScore}% complete. <Link to="/profile">Complete your profile</Link> to help referrers get to know you.
        </p>
      ) : (
        <div className="bg-amber-tint text-amber-ink p-4 rounded-xl border border-amber-200 text-sm">
          <p className="font-bold">Your profile is {completenessScore}% complete</p>
          <div className="mt-2 h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${completenessScore}%` }} />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed">
            Referrers respond better to complete profiles. Add your work experience, education, or skills to stand out.{' '}
            <Link to="/onboarding" className="font-bold underline hover:text-amber-900">
              Finish your profile
            </Link>
          </p>
        </div>
      ))}

      <div className="space-y-4">
        <div>
          <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5" htmlFor="application-name">Full name</label>
          <input
            id="application-name"
            disabled
            value={user?.user_metadata?.full_name || ''}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-parchment-sunken text-slate-500 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5" htmlFor="application-email">Email *</label>
          <input
            id="application-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={applicationForm.email}
            onChange={(e) => handleApplicationInputChange('email', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-primary focus:outline-none transition-colors"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">Resume *</label>
          <div className="border-[1.5px] border-dashed border-indigo-200 bg-ink-wash/60 rounded-xl p-5 hover:bg-ink-wash transition-colors text-center cursor-pointer relative">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleApplicationInputChange('resume', e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload resume"
            />
            <div className="flex flex-col items-center gap-1.5">
              {applicationForm.resume ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-success" />
                  <span className="resume-name text-sm font-bold text-ink">{applicationForm.resume.name}</span>
                  <span className="text-xs text-slate-500">{isMobile ? 'Tap to change' : 'Click to change'}</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Upload className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <span className="text-sm font-bold text-ink">{isMobile ? 'Choose resume' : <>Drop your resume here, or <span className="text-primary">browse</span></>}</span>
                  <span className="text-xs text-slate-500">PDF, DOC or DOCX · up to 5MB</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderApplicationSubmit = () => (
    <button
      onClick={handleApplicationSubmit}
      disabled={isSubmittingApplication}
      className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isSubmittingApplication ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Submitting...
        </>
      ) : (
        'Submit Application'
      )}
    </button>
  );


  if (loading) {
    return (
      <div className="jobs-page bg-parchment text-slate-700 font-display overflow-hidden min-h-[calc(100dvh-4rem)] md:h-screen flex flex-col selection:bg-primary selection:text-white">
        <main className="flex flex-1 min-h-0 overflow-hidden">
          <aside className="w-full md:max-w-[510px] border-r border-hairline bg-parchment p-3 space-y-2">
            <div className="p-2 pb-4 space-y-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} className="rounded-xl border border-slate-100 bg-white" />
            ))}
          </aside>
          <section className="hidden md:block flex-1 bg-white p-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-3">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
              <Skeleton className="h-12 w-40" />
              <div className="space-y-3 pt-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jobs-page bg-parchment text-slate-700 font-display overflow-hidden min-h-[calc(100dvh-4rem)] md:h-screen flex flex-col selection:bg-primary selection:text-white">
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
    <div className="jobs-page bg-parchment text-slate-700 font-display overflow-hidden min-h-[calc(100dvh-4rem)] md:h-screen flex flex-col selection:bg-primary selection:text-white">
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:max-w-[510px] flex flex-col border-r border-hairline bg-parchment relative z-10">
          {/* Sidebar Header */}
          <div className="flex flex-col gap-3.5 px-4 pt-5 pb-3 md:px-5 bg-parchment">
            <div className="mobile-jobs-heading md:hidden">
              <div><h1>Jobs</h1><p>Your next move starts with a referral.</p></div>
              <button onClick={handleCreateReferralClick} className="mobile-post-button" aria-label="Post referral"><Plus size={16} /> Post</button>
            </div>
            {/* Mobile search and filters */}
            <div className="flex flex-col gap-2.5 md:hidden">
              <div className="flex items-center rounded-xl bg-white border border-slate-200 focus-within:border-primary transition-colors">
                <Search className="h-4 w-4 text-slate-400 ml-3.5 shrink-0" />
                <input
                  className="flex-1 min-w-0 bg-transparent border-none text-base px-3 py-2.5 placeholder:text-slate-400 text-slate-900 focus:ring-0"
                  placeholder="Search role, company..." aria-label="Search role or company"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                />
                <div className="w-px self-stretch my-2.5 bg-slate-200 shrink-0" />
                <button
                  onClick={() => setShowFilters(true)}
                  aria-label={activeFilterChips.length > 0 ? `Filters, ${activeFilterChips.length} active` : 'Filters'}
                  className="flex items-center gap-1.5 px-4 h-11 shrink-0 text-slate-900 font-bold text-sm"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterChips.length > 0 ? activeFilterChips.length : 'Filters'}
                </button>
              </div>

            </div>

            {/* Desktop */}
            <div className="hidden md:flex gap-2">
              <div className="flex flex-1 min-w-0 items-center rounded-xl bg-white border border-slate-200 focus-within:border-primary transition-colors">
                <Search className="h-4 w-4 text-slate-400 ml-3.5 shrink-0" />
                <input
                  className="w-full min-w-0 bg-transparent border-none text-sm px-3 py-2.5 placeholder:text-slate-400 text-slate-900 focus:ring-0"
                  placeholder="Search role, company..." aria-label="Search role or company"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                />
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 h-11 transition-colors shrink-0 text-slate-900 font-bold text-[13px]"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterChips.length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10.5px] flex items-center justify-center">
                    {activeFilterChips.length}
                  </span>
                )}
              </button>
              <button
                onClick={handleCreateReferralClick}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-bold px-3.5 h-11 rounded-xl transition-colors shrink-0"
              >
                <Plus className="h-4 w-4" />
                Post referral
              </button>
            </div>

            {activeFilterChips.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => handleRemoveFilter(chip.key)}
                    aria-label={`Remove filter: ${chip.label}`}
                    className="active-job-filter flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-full pl-3 pr-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors"
                  >
                    {chip.label}
                    <X className="h-3 w-3 text-slate-400" />
                  </button>
                ))}
                <button onClick={handleClearFilters} className="text-xs font-bold text-primary hover:underline ml-0.5">
                  Clear all
                </button>
              </div>
            )}

            <p className="text-[12.5px] text-slate-500">
              <span className="font-bold text-ink">{filteredJobs.length} {filteredJobs.length === 1 ? 'role' : 'roles'}</span>
              {activeFilterChips.length > 0 || searchQuery ? ' match your search' : ' open now'}
            </p>
          </div>
          {/* Jobs List */}
          <div className="jobs-list flex-1 overflow-y-auto px-3 pb-3 md:px-3.5 space-y-2.5">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const firstViewedAt = firstViewedMap[job.id];
                const isNewForUser = Boolean(firstViewedAt) && (Date.now() - new Date(firstViewedAt).getTime() < 24 * 60 * 60 * 1000);

                return (
                  <div
                    key={job.id}
                    role={isMobile ? 'button' : undefined}
                    tabIndex={isMobile ? 0 : undefined}
                    aria-label={isMobile ? `View ${job.title} at ${job.company}` : undefined}
                    onKeyDown={isMobile ? event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectJob(job);
                      }
                    } : undefined}
                    onClick={() => handleSelectJob(job)}
                    className={`job-card group relative flex gap-3.5 p-4 rounded-2xl cursor-pointer transition-colors border ${isSelected
                      ? 'bg-ink-wash border-primary'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="shrink-0">
                      <div className="rounded-xl size-11 border border-slate-100 overflow-hidden bg-white">
                        <CompanyAvatar company={job.company} logoUrl={((job as any).created_by_profile?.account_type === 'company' ? (job as any).created_by_profile?.avatar_url : undefined) || getCompanyLogoUrl(job.company)} size="sm" />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col min-w-0 gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-[14.5px] font-bold text-ink leading-snug line-clamp-2">
                          {job.title}
                        </h3>
                        <div className="job-flags flex gap-1 shrink-0">
                          {job.urgent_hiring && isRecentPosting(job.created_at) && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-danger-tint text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                              Urgent
                            </span>
                          )}
                          {isNewForUser && !job.urgent_hiring && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-ink-wash text-primary-hover px-2 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                          {userJobs.includes(job.id) && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-success-tint text-success-ink px-2 py-0.5 rounded-full">
                              Your post
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="job-company text-[12.5px] text-slate-500 truncate">
                        {job.company}
                        {' · '}
                        {job.location.includes(',') ? job.location.split(',')[0] : job.location}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {job.job_type && <span className={tagClass}>{job.job_type}</span>}
                        <span className={tagClass}>{job.remote_available ? 'Remote' : 'Onsite'}</span>
                        {job.experience_level && <span className={tagClass}>{job.experience_level}</span>}
                      </div>
                      <span className="job-age flex items-center gap-1 mt-0.5 text-[11.5px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(job.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 bg-parchment-sunken rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="font-display text-lg font-extrabold text-ink mb-1.5">No roles match that</h3>
                <p className="text-sm text-slate-500 mb-5">Try a different search, or clear your filters to see every open role.</p>
                <button
                  onClick={handleClearFilters}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-ink px-5 h-11 rounded-xl transition-colors inline-flex items-center gap-2 text-sm font-bold"
                >
                  <X className="h-4 w-4" />
                  Clear search &amp; filters
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

      {isMobile && selectedJob && !showApplicationModal && !showShareModal && (
        <MobileDialog title="Job details" onClose={dismissJobSheet} className="job-details-mobile">
          {renderSelectedJobDetails()}
        </MobileDialog>
      )}

      {/* Filter Modal */}
      {
        <Modal
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filters"
          maxWidth="max-w-lg"
          footer={
            <>
              <Button variant="ghost" onClick={handleClearFilters}>
                Clear all
              </Button>
              <Button onClick={handleApplyFilters}>Show results</Button>
            </>
          }
        >
          <div className="space-y-6">
            <div>
              <p className="mb-2.5 text-[12.5px] font-bold text-ink">Sort by</p>
              <div className="flex gap-1 rounded-xl bg-parchment-sunken p-1" role="radiogroup" aria-label="Sort by">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={filters.sortBy === option.value}
                    onClick={() => handleFilterChange('sortBy', option.value)}
                    className={`flex-1 py-2 rounded-lg text-[12.5px] font-bold transition-colors ${filters.sortBy === option.value
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-bold text-ink">Job type</p>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filters.jobType === option.value}
                    onClick={() => handleFilterChange('jobType', option.value)}
                    className={pillClass(filters.jobType === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-bold text-ink">Experience level</p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filters.experienceLevel === option.value}
                    onClick={() => handleFilterChange('experienceLevel', option.value)}
                    className={pillClass(filters.experienceLevel === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2.5 block text-[12.5px] font-bold text-ink">
                Location
              </label>
              <div className="relative" ref={locationDropdownRef}>
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={handleLocationInput}
                  placeholder="City, state, or country"
                  className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none ${locationError
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-slate-300 focus:border-accent'
                    }`}
                />
                {locationSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {locationSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.place_id || index}
                        className="w-full px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-ink-wash"
                        onClick={() => handleLocationSelect(suggestion)}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {locationError && <p className="mt-1 text-xs font-medium text-red-600">{locationError}</p>}
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3.5 cursor-pointer">
              <span className="text-[13.5px] font-bold text-ink">Remote only</span>
              <input
                type="checkbox"
                role="switch"
                checked={filters.remote}
                onChange={(e) => handleFilterChange('remote', e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-6 w-[42px] shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[18px]"
              />
            </label>
          </div>
        </Modal>
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
                    ? 'bg-status-success text-white'
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

      {isMobile && showApplicationModal && (
        <MobileDialog title={applicationStep === 1 ? 'Apply for this role' : 'Application sent'} onClose={closeApplication}
          footer={applicationStep === 1 ? renderApplicationSubmit() : undefined}>
          <div className="mobile-application-content">
            {applicationStep === 1 ? <>
              {selectedJob && <div className="mobile-application-job">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl"><CompanyAvatar company={selectedJob.company} logoUrl={getCompanyLogoUrl(selectedJob.company)} size="sm" /></div>
                <div><h3>{selectedJob.title}</h3><p>{selectedJob.company}</p></div>
              </div>}
              {renderApplicationFields()}
            </> : <div className="py-12 text-center" role="status">
              <CheckCircle2 className="mx-auto mb-5 h-14 w-14 text-success" />
              <h3 className="text-2xl font-extrabold mb-3">Application sent!</h3>
              <p className="text-sm text-slate-500">Your application for {selectedJob?.title} is on its way to a referrer.</p>
            </div>}
          </div>
        </MobileDialog>
      )}

      {/* Application Modal */}
      {
        showApplicationModal && !isMobile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={() => setShowApplicationModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              {applicationStep === 1 ? (
                <>
                  <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
                    {selectedJob ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-xl size-11 border border-slate-100 overflow-hidden shrink-0">
                          <CompanyAvatar company={selectedJob.company} logoUrl={((selectedJob as any).created_by_profile?.account_type === 'company' ? (selectedJob as any).created_by_profile?.avatar_url : undefined) || getCompanyLogoUrl(selectedJob.company)} size="sm" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h2 className="font-display text-[17px] font-extrabold text-ink leading-snug">Apply for {selectedJob.title}</h2>
                          <span className="job-company text-[12.5px] text-slate-500 truncate">{selectedJob.company}</span>
                        </div>
                      </div>
                    ) : <span />}
                    <button
                      onClick={() => setShowApplicationModal(false)}
                      aria-label="Close"
                      className="h-9 w-9 shrink-0 rounded-full bg-parchment-sunken text-slate-500 hover:text-slate-700 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6 space-y-5">
                    {renderApplicationFields()}

                    <div className="pt-1">
                      {renderApplicationSubmit()}
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-9 py-12 text-center" role="status">
                  <div className="w-[76px] h-[76px] bg-success-tint rounded-full flex items-center justify-center mx-auto mb-5 animate-in zoom-in duration-300">
                    <Check className="w-9 h-9 text-success" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-display text-2xl font-extrabold text-ink mb-2">Application sent!</h3>
                  {selectedJob && (
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Your application for {selectedJob.title} at {selectedJob.company} is on its way to a referrer.
                    </p>
                  )}
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
