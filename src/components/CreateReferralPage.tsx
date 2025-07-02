import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Share2, Trash2, Briefcase, Users, MapPin, Clock, Calendar, Eye, Edit, X } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../services/jobService';
import LoadingSpinner from './LoadingSpinner';
import SecondaryEmailVerificationModal from './SecondaryEmailVerificationModal';
import debounce from 'lodash.debounce';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];

// Define a referral type that matches your use case
interface Referral {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  status: 'active' | 'closed' | 'draft';
  created_at: string;
  applications_count: number;
}

const CreateReferralPage: React.FC = () => {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [myReferrals, setMyReferrals] = useState<Job[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);

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

  // Add the Uiverse.io checkbox styles
  const uiverseCheckboxStyles = `
  /* From Uiverse.io by SelfMadeSystem */ 
  /* Hide the default checkbox */
  .container input {
    display: none;
  }

  .container {
    display: block;
    position: relative;
    cursor: pointer;
    font-size: 20px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Create a custom checkbox */
  .checkmark {
    position: relative;
    top: 0;
    left: 0;
    height: 1.3em;
    width: 1.3em;
    background-color: #2196F300;
    border-radius: 0.25em;
    transition: all 0.25s;
  }

  /* When the checkbox is checked, add a blue background */
  .container input:checked ~ .checkmark {
    background-color: #2196F3;
  }

  /* Create the checkmark/indicator (hidden when not checked) */
  .checkmark:after {
    content: "";
    position: absolute;
    transform: rotate(0deg);
    border: 0.1em solid black;
    left: 0;
    top: 0;
    width: 1.05em;
    height: 1.05em;
    border-radius: 0.25em;
    transition: all 0.25s, border-width 0.1s;
  }

  /* Show the checkmark when checked */
  .container input:checked ~ .checkmark:after {
    left: 0.45em;
    top: 0.25em;
    width: 0.25em;
    height: 0.5em;
    border-color: #fff0 white white #fff0;
    border-width: 0 0.15em 0.15em 0;
    border-radius: 0em;
    transform: rotate(45deg);
  }
  `;

  // Form state
  const [formData, setFormData] = useState<JobInsert>({
    title: '',
    company: '',
    department: '',
    location: '',
    job_type: 'Full-time',
    description: '',
    skills: [],
    benefits: [],
    remote_available: false,
    urgent_hiring: false,
    experience_level: 'Mid-level',
    application_deadline: '',
    contact_email: '',
    created_by: user?.id || '',
    status: 'active'
  });

  const [skillInput, setSkillInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');

  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);

  // Edit functionality state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<JobInsert>({
    title: '',
    company: '',
    department: '',
    location: '',
    job_type: 'Full-time',
    description: '',
    skills: [],
    benefits: [],
    remote_available: false,
    urgent_hiring: false,
    experience_level: 'Mid-level',
    application_deadline: '',
    contact_email: '',
    created_by: user?.id || '',
    status: 'active'
  });
  const [editSkillInput, setEditSkillInput] = useState('');
  const [editBenefitInput, setEditBenefitInput] = useState('');
  const [editLocationQuery, setEditLocationQuery] = useState('');
  const [editLocationSuggestions, setEditLocationSuggestions] = useState<any[]>([]);
  const [editLocationError, setEditLocationError] = useState('');
  const [editLocationTouched, setEditLocationTouched] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Secondary email verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Fetch user's jobs (acting as referrals)
  const fetchMyReferrals = useCallback(async () => {
    if (!user?.id) return;
    setLoadingReferrals(true);
    try {
      const jobs = await jobService.getUserJobs();
      setMyReferrals(jobs || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoadingReferrals(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMyReferrals();
  }, [fetchMyReferrals]);

  // Debounced fetch for location suggestions
  const fetchLocationSuggestions = useCallback(
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

  const handleInputChange = (field: keyof JobInsert, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills?.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(skill => skill !== skillToRemove)
    }));
  };

  const addBenefit = () => {
    if (benefitInput.trim() && !formData.benefits?.includes(benefitInput.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), benefitInput.trim()]
      }));
      setBenefitInput('');
    }
  };

  const removeBenefit = (benefitToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: (prev.benefits || []).filter(benefit => benefit !== benefitToRemove)
    }));
  };

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationTouched(true);
    setLocationQuery(e.target.value);
    setFormData(prev => ({ ...prev, location: '' }));
    setLocationError('');
  };

  const handleLocationSelect = (suggestion: any) => {
    const displayName = suggestion.display_name;
    setFormData(prev => ({ ...prev, location: displayName }));
    setLocationQuery(displayName);
    setLocationSuggestions([]);
    setLocationError('');
  };

  const validateLocation = () => {
    // Only allow submission if location matches a suggestion
    if (!formData.location || !locationQuery || formData.location !== locationQuery) {
      setLocationError('Select a valid location.');
      return false;
    }
    setLocationError('');
    return true;
  };

  const checkSecondaryEmailVerification = () => {
    if (!profile?.secondary_email_verified) {
      setShowVerificationModal(true);
      return false;
    }
    return true;
  };

  const handleNavigateToSettings = () => {
    setShowVerificationModal(false);
    navigate('/settings');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    // Check secondary email verification
    if (!checkSecondaryEmailVerification()) {
      return;
    }
    
    setLocationTouched(true);
    if (!validateLocation()) return;
    setLoading(true);
    try {
      // Fix experience_level to match database schema
      const experienceLevel = formData.experience_level === 'Mid-level' ? 'Mid Level' : formData.experience_level;
      
      const jobData = {
        title: formData.title.trim(),
        company: formData.company.trim(),
        department: formData.department || null,
        location: formData.location.trim(),
        job_type: formData.job_type,
        description: formData.description.trim(),
        skills: formData.skills || [],
        benefits: formData.benefits || [],
        remote_available: formData.remote_available || false,
        urgent_hiring: formData.urgent_hiring || false,
        experience_level: experienceLevel,
        application_deadline: formData.application_deadline || null,
        contact_email: formData.contact_email || null,
        created_by: user.id,
        status: 'active'
      };

      console.log('Creating job with data:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData as any])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Job created successfully:', data);

      // Reset form
      setFormData({
        title: '',
        company: '',
        department: '',
        location: '',
        job_type: 'Full-time',
        description: '',
        skills: [],
        benefits: [],
        remote_available: false,
        urgent_hiring: false,
        experience_level: 'Mid-level',
        application_deadline: '',
        contact_email: '',
        created_by: user.id,
        status: 'active'
      });

      // Refresh referrals list
      fetchMyReferrals();

      alert('Job referral created successfully!');
    } catch (error: any) {
      console.error('Error creating referral:', error);
      const errorMessage = error.message || 'Failed to create referral. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteReferral = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this referral?')) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId as any);

      if (error) throw error;
      
      fetchMyReferrals();
      alert('Referral deleted successfully!');
    } catch (error) {
      console.error('Error deleting referral:', error);
      alert('Failed to delete referral. Please try again.');
    }
  };

  const handleViewApplications = (jobId: string, jobTitle: string) => {
    navigate(`/applications/${jobId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Edit functionality functions
  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setEditFormData({
      title: job.title,
      company: job.company,
      department: job.department || '',
      location: job.location,
      job_type: job.job_type,
      description: job.description,
      skills: job.skills || [],
      benefits: job.benefits || [],
      remote_available: job.remote_available || false,
      urgent_hiring: job.urgent_hiring || false,
      experience_level: job.experience_level,
      application_deadline: job.application_deadline || '',
      contact_email: job.contact_email || '',
      created_by: user?.id || '',
      status: job.status
    });
    setEditLocationQuery(job.location);
    setShowEditModal(true);
  };

  const handleEditInputChange = (field: keyof JobInsert, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEditSkill = () => {
    if (editSkillInput.trim() && !editFormData.skills?.includes(editSkillInput.trim())) {
      setEditFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), editSkillInput.trim()]
      }));
      setEditSkillInput('');
    }
  };

  const removeEditSkill = (skillToRemove: string) => {
    setEditFormData(prev => ({
      ...prev,
      skills: prev.skills?.filter(skill => skill !== skillToRemove) || []
    }));
  };

  const addEditBenefit = () => {
    if (editBenefitInput.trim() && !editFormData.benefits?.includes(editBenefitInput.trim())) {
      setEditFormData(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), editBenefitInput.trim()]
      }));
      setEditBenefitInput('');
    }
  };

  const removeEditBenefit = (benefitToRemove: string) => {
    setEditFormData(prev => ({
      ...prev,
      benefits: prev.benefits?.filter(benefit => benefit !== benefitToRemove) || []
    }));
  };

  const handleEditLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditLocationQuery(value);
    setEditLocationError('');
    if (value) {
      fetchLocationSuggestions(value);
    } else {
      setEditLocationSuggestions([]);
    }
  };

  const handleEditLocationSelect = (suggestion: any) => {
    setEditLocationQuery(suggestion.display_name);
    setEditFormData(prev => ({ ...prev, location: suggestion.display_name }));
    setEditLocationSuggestions([]);
    setEditLocationError('');
  };

  const validateEditLocation = () => {
    if (!editLocationQuery.trim()) {
      setEditLocationError('Location is required');
      return false;
    }
    setEditLocationError('');
    return true;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingJob) return;

    if (!validateEditLocation()) {
      return;
    }

    setEditLoading(true);
    try {
      const updateData = {
        title: editFormData.title.trim(),
        company: editFormData.company.trim(),
        department: editFormData.department?.trim() || null,
        location: editFormData.location.trim(),
        job_type: editFormData.job_type,
        description: editFormData.description.trim(),
        skills: editFormData.skills || [],
        benefits: editFormData.benefits || [],
        remote_available: editFormData.remote_available,
        urgent_hiring: editFormData.urgent_hiring,
        experience_level: editFormData.experience_level,
        application_deadline: editFormData.application_deadline || null,
        contact_email: editFormData.contact_email?.trim() || null,
        status: editFormData.status
      };

      await jobService.updateJob(editingJob.id, updateData);
      
      // Refresh the referrals list
      await fetchMyReferrals();
      
      // Close modal and reset state
      setShowEditModal(false);
      setEditingJob(null);
      setEditFormData({
        title: '',
        company: '',
        department: '',
        location: '',
        job_type: 'Full-time',
        description: '',
        skills: [],
        benefits: [],
        remote_available: false,
        urgent_hiring: false,
        experience_level: 'Mid-level',
        application_deadline: '',
        contact_email: '',
        created_by: user?.id || '',
        status: 'active'
      });
      setEditLocationQuery('');
      setEditSkillInput('');
      setEditBenefitInput('');
    } catch (error: any) {
      console.error('Error updating job:', error);
      alert(error.message || 'Failed to update referral');
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingJob(null);
    setEditFormData({
      title: '',
      company: '',
      department: '',
      location: '',
      job_type: 'Full-time',
      description: '',
      skills: [],
      benefits: [],
      remote_available: false,
      urgent_hiring: false,
      experience_level: 'Mid-level',
      application_deadline: '',
      contact_email: '',
      created_by: user?.id || '',
      status: 'active'
    });
    setEditLocationQuery('');
    setEditSkillInput('');
    setEditBenefitInput('');
    setEditLocationSuggestions([]);
    setEditLocationError('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{uiverseApplyNowBtnStyles}</style>
      <style>{uiverseCheckboxStyles}</style>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => window.history.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Create Job Referral</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{myReferrals.length}</div>
              <div className="text-blue-100">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {myReferrals.reduce((sum, job) => sum + job.applications_count, 0)}
              </div>
              <div className="text-blue-100">Applications Received</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {myReferrals.filter(job => job.status === 'active').length}
              </div>
              <div className="text-blue-100">Active Referrals</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Create Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Briefcase className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Senior Software Engineer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Google, Microsoft, Startup Inc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Engineering, Marketing, Sales"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={locationQuery}
                      onChange={handleLocationInput}
                      onBlur={() => setLocationTouched(true)}
                      className={`w-full px-3 py-2 border ${locationError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Type a city, state, or country..."
                      autoComplete="off"
                    />
                    {locationSuggestions.length > 0 && (
                      <ul className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
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
                </div>
              </div>

              {/* Job Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Job Details</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Type *
                    </label>
                    <select
                      required
                      value={formData.job_type}
                      onChange={(e) => handleInputChange('job_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level *
                    </label>
                    <select
                      required
                      value={formData.experience_level}
                      onChange={(e) => handleInputChange('experience_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Entry-level">Entry-level</option>
                      <option value="Mid-level">Mid-level</option>
                      <option value="Senior-level">Senior-level</option>
                      <option value="Executive">Executive</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the role, responsibilities, and requirements..."
                  />
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Skills
                  </label>
                  <div className="flex mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. JavaScript, React, Python"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills?.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                  <div className="border rounded-md p-3">
                    <label className="container flex flex-row items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.remote_available}
                        onChange={(e) => handleInputChange('remote_available', e.target.checked)}
                      />
                      <div className="checkmark"></div>
                      <span className="text-sm text-gray-700">Remote work available</span>
                    </label>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <label className="container flex flex-row items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.urgent_hiring}
                        onChange={(e) => handleInputChange('urgent_hiring', e.target.checked)}
                      />
                      <div className="checkmark"></div>
                      <span className="text-sm text-gray-700">Urgent hiring</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="my-button font-medium flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ width: 'fit-content', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <span style={{ width: '100%', textAlign: 'center' }}>
                    {loading ? 'Creating...' : 'Create Referral'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - My Referrals */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">My Referrals</h2>
              
              {loadingReferrals ? (
                <LoadingSpinner text="Loading referrals..." size="medium" />
              ) : myReferrals.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No referrals created yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myReferrals.slice(0, 5).map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm leading-tight">
                          {job.title}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditJob(job)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Edit referral"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteReferral(job.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete referral"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{job.company}</p>
                      
                      <div className="flex items-center text-xs text-gray-500 space-x-3 mb-2">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {job.job_type}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {formatDate(job.created_at)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : job.status === 'closed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {job.applications_count} applications
                        </span>
                        <button
                          onClick={() => handleViewApplications(job.id, job.title)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Applications</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {myReferrals.length > 5 && (
                    <div className="text-center pt-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View all ({myReferrals.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Referral</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <Briefcase className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.title}
                      onChange={(e) => handleEditInputChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Senior Software Engineer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.company}
                      onChange={(e) => handleEditInputChange('company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Google, Microsoft, Startup Inc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={editFormData.department || ''}
                      onChange={(e) => handleEditInputChange('department', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Engineering, Marketing, Sales"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={editLocationQuery}
                      onChange={handleEditLocationInput}
                      onBlur={() => setEditLocationTouched(true)}
                      className={`w-full px-3 py-2 border ${editLocationError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Type a city, state, or country..."
                      autoComplete="off"
                    />
                    {editLocationSuggestions.length > 0 && (
                      <ul className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
                        {editLocationSuggestions.map((suggestion, idx) => (
                          <li
                            key={suggestion.place_id}
                            className="px-4 py-2 cursor-pointer hover:bg-blue-100"
                            onMouseDown={() => handleEditLocationSelect(suggestion)}
                          >
                            {suggestion.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                    {editLocationError && editLocationTouched && (
                      <p className="text-red-600 text-xs mt-1">{editLocationError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Type *
                    </label>
                    <select
                      required
                      value={editFormData.job_type}
                      onChange={(e) => handleEditInputChange('job_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level *
                    </label>
                    <select
                      required
                      value={editFormData.experience_level}
                      onChange={(e) => handleEditInputChange('experience_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Entry-level">Entry-level</option>
                      <option value="Mid-level">Mid-level</option>
                      <option value="Senior-level">Senior-level</option>
                      <option value="Executive">Executive</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={editFormData.description}
                    onChange={(e) => handleEditInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the role, responsibilities, and requirements..."
                  />
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Skills
                  </label>
                  <div className="flex mb-2">
                    <input
                      type="text"
                      value={editSkillInput}
                      onChange={(e) => setEditSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEditSkill())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. JavaScript, React, Python"
                    />
                    <button
                      type="button"
                      onClick={addEditSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editFormData.skills?.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeEditSkill(skill)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                  <div className="border rounded-md p-3">
                    <label className="container flex flex-row items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editFormData.remote_available}
                        onChange={(e) => handleEditInputChange('remote_available', e.target.checked)}
                      />
                      <div className="checkmark"></div>
                      <span className="text-sm text-gray-700">Remote work available</span>
                    </label>
                  </div>
                  
                  <div className="border rounded-md p-3">
                    <label className="container flex flex-row items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editFormData.urgent_hiring}
                        onChange={(e) => handleEditInputChange('urgent_hiring', e.target.checked)}
                      />
                      <div className="checkmark"></div>
                      <span className="text-sm text-gray-700">Urgent hiring</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="my-button font-medium flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ width: 'fit-content', minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <span style={{ width: '100%', textAlign: 'center' }}>
                    {editLoading ? 'Updating...' : 'Update Referral'}
                  </span>
                </button>
              </div>
            </form>
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
  );
};

export default CreateReferralPage;