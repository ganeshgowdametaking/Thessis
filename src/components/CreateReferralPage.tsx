import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../services/jobService';
import LoadingSpinner from './LoadingSpinner';
import debounce from 'lodash.debounce';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];

const CreateReferralPage: React.FC = () => {
  // Force refresh - Sage & Stone Design
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [myReferrals, setMyReferrals] = useState<Job[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);

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
    experience_level: 'Mid Level (2-4 yrs)',
    application_deadline: '',
    contact_email: '',
    created_by: user?.id || '',
    status: 'active'
  });

  const [skillInput, setSkillInput] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [locationQuery, setLocationQuery] = useState('');

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

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationQuery(e.target.value);
    setFormData(prev => ({ ...prev, location: e.target.value }));
  };

  const handleLocationSelect = (suggestion: any) => {
    const displayName = suggestion.display_name;
    setFormData(prev => ({ ...prev, location: displayName }));
    setLocationQuery(displayName);
    setLocationSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);
    try {
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
        experience_level: formData.experience_level,
        application_deadline: formData.application_deadline || null,
        contact_email: formData.contact_email || null,
        created_by: user.id,
        status: 'active'
      };

      const { error } = await supabase
        .from('jobs')
        .insert([jobData as any])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

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
        experience_level: 'Mid Level (2-4 yrs)',
        application_deadline: '',
        contact_email: '',
        created_by: user.id,
        status: 'active'
      });
      setLocationQuery('');
      setSkillInput('');

      // Refresh referrals list
      fetchMyReferrals();

      // Success - no popup, just refresh the list
      console.log('✅ Job referral created successfully!');
    } catch (error: any) {
      console.error('Error creating referral:', error);
      // Keep error alert for now since user needs to know about errors
      alert(error.message || 'Failed to create referral. Please try again.');
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
      // Success - no popup, just refresh the list
      console.log('✅ Referral deleted successfully!');
    } catch (error) {
      console.error('Error deleting referral:', error);
      alert('Failed to delete referral. Please try again.');
    }
  };

  const handleViewApplications = (jobId: string) => {
    navigate(`/applications/${jobId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#5f7261] text-white">
            <span className="size-1.5 rounded-full bg-white"></span>
            Active
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-stone-100 text-stone-600 border border-stone-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="bg-stone-50 font-display text-slate-700 antialiased min-h-screen flex flex-col">
      <main className="flex-grow w-full px-6 md:px-12 py-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-10">
          <button 
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#5f7261] transition-colors w-fit group"
            onClick={() => navigate('/jobs')}
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Back to Jobs
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
              Create Referral
            </h2>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-soft flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Total Referrals</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{myReferrals.length}</p>
            </div>
            <div className="size-10 rounded-full bg-stone-50 flex items-center justify-center text-[#5f7261] border border-stone-100">
              <span className="material-symbols-outlined">group_add</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-soft flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Applications Received</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {myReferrals.reduce((sum, job) => sum + (job.applications_count || 0), 0)}
              </p>
            </div>
            <div className="size-10 rounded-full bg-stone-50 flex items-center justify-center text-[#5f7261] border border-stone-100">
              <span className="material-symbols-outlined">description</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-soft flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-500">Active Referrals</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {myReferrals.filter(job => job.status === 'active').length}
              </p>
            </div>
            <div className="size-10 rounded-full bg-stone-50 flex items-center justify-center text-[#5f7261] border border-stone-100">
              <span className="material-symbols-outlined">bolt</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column - Create Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
              <div className="px-8 py-6 border-b border-stone-100 bg-white">
                <h3 className="text-lg font-bold text-slate-900">Referral Details</h3>
                <p className="text-sm text-slate-500 mt-0.5">Fill in the details for the position you are referring for.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Title</span>
                    <div className="border-2 border-[#5f7261] rounded-lg p-1">
                      <input 
                        className="w-full h-11 px-4 bg-white border-0 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm"
                        placeholder="e.g. Senior Product Designer" 
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>
                  </label>
                  
                  <label>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Company</span>
                    <div className="border-2 border-[#5f7261] rounded-lg p-1">
                      <input 
                        className="w-full h-11 px-4 bg-white border-0 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm"
                        placeholder="e.g. Acme Corp" 
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                      />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Department</span>
                    <div className="border-2 border-[#5f7261] rounded-lg p-1">
                      <input 
                        className="w-full h-11 px-4 bg-white border-0 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm"
                        placeholder="e.g. Product Design" 
                        type="text"
                        value={formData.department || ''}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                      />
                    </div>
                  </label>
                  
                  <label>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location</span>
                    <div className="border-2 border-[#5f7261] rounded-lg p-1">
                      <div className="relative">
                        <input 
                          className="w-full h-11 pl-10 pr-4 bg-white border-0 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm"
                          placeholder="City, State or Remote" 
                          type="text"
                          required
                          value={locationQuery}
                          onChange={handleLocationInput}
                        />
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">location_on</span>
                        
                        {locationSuggestions.length > 0 && (
                          <ul className="absolute z-10 bg-white border border-stone-200 rounded-md mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
                            {locationSuggestions.map((suggestion) => (
                              <li
                                key={suggestion.place_id}
                                className="px-4 py-2 cursor-pointer hover:bg-[#f2f1ec]"
                                onMouseDown={() => handleLocationSelect(suggestion)}
                              >
                                {suggestion.display_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Type</span>
                    <div className="border-2 border-[#5f7261] rounded-lg p-1">
                      <div className="relative">
                        <select 
                          className="w-full h-11 px-4 bg-white border-0 rounded-md text-slate-900 focus:outline-none transition-all text-sm appearance-none cursor-pointer"
                          value={formData.job_type}
                          onChange={(e) => handleInputChange('job_type', e.target.value)}
                        >
                          <option>Full-time</option>
                          <option>Part-time</option>
                          <option>Contract</option>
                          <option>Freelance</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                    </div>
                  </label>
                  
                  <label>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Experience Level</span>
                    <div className="border-2 border-[#5f7261] rounded-lg p-1">
                      <div className="relative">
                        <select 
                          className="w-full h-11 px-4 bg-white border-0 rounded-md text-slate-900 focus:outline-none transition-all text-sm appearance-none cursor-pointer"
                          value={formData.experience_level}
                          onChange={(e) => handleInputChange('experience_level', e.target.value)}
                        >
                          <option>Entry Level</option>
                          <option>Mid Level (2-4 yrs)</option>
                          <option>Senior (5+ yrs)</option>
                          <option>Lead / Manager</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Description</span>
                  <div className="border-2 border-[#5f7261] rounded-lg p-1">
                    <textarea 
                      className="w-full p-4 bg-white border-0 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm min-h-[120px] resize-y"
                      placeholder="Briefly describe the role requirements and responsibilities..."
                      required
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    ></textarea>
                  </div>
                </label>

                <div className="space-y-3">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Required Skills</span>
                  <div className="flex items-center gap-2">
                    <div className="border-2 border-[#5f7261] rounded-lg p-1 flex-grow">
                      <div className="relative">
                        <input 
                          className="w-full h-11 px-4 bg-white border-0 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none transition-all text-sm"
                          placeholder="Add a skill..." 
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        />
                      </div>
                    </div>
                    <button 
                      className="size-11 flex-none flex items-center justify-center rounded-md bg-[#5f7261] text-white shadow-sm hover:bg-[#4b5c4d] transition-colors" 
                      type="button"
                      onClick={addSkill}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formData.skills?.map((skill, index) => (
                      <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sage-50 text-[#5f7261] border border-sage-200">
                        {skill}
                        <button 
                          className="hover:text-red-500 flex items-center" 
                          type="button"
                          onClick={() => removeSkill(skill)}
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2 border-t border-stone-100 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      className="w-4 h-4 rounded text-[#5f7261] border-stone-300 focus:ring-[#5f7261] cursor-pointer" 
                      type="checkbox"
                      checked={formData.remote_available}
                      onChange={(e) => handleInputChange('remote_available', e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#5f7261] transition-colors">Remote Friendly</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      className="w-4 h-4 rounded text-[#5f7261] border-stone-300 focus:ring-[#5f7261] cursor-pointer" 
                      type="checkbox"
                      checked={formData.urgent_hiring}
                      onChange={(e) => handleInputChange('urgent_hiring', e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#5f7261] transition-colors">Urgent Priority</span>
                  </label>
                </div>

                <div className="pt-4">
                  <button 
                    className="w-full h-12 rounded-md bg-[#5f7261] text-white font-bold text-sm shadow-sm hover:bg-[#4b5c4d] transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Referral'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - My Referrals */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-bold text-slate-900">My Referrals</h3>
              <button 
                className="text-sm font-semibold text-[#5f7261] hover:text-[#4b5c4d] hover:underline"
                onClick={() => navigate('/jobs')}
              >
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {loadingReferrals ? (
                <LoadingSpinner text="Loading referrals..." />
              ) : myReferrals.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-100 p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-4 block">work</span>
                  <p className="text-slate-500 text-sm">No referrals created yet</p>
                </div>
              ) : (
                myReferrals.slice(0, 3).map((job) => (
                  <div key={job.id} className="group bg-white rounded-lg border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      {getStatusBadge(job.status)}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1.5 text-slate-500 hover:text-[#5f7261] rounded-md hover:bg-stone-50 transition-colors"
                          onClick={() => handleViewApplications(job.id)}
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button 
                          className="p-1.5 text-slate-500 hover:text-red-500 rounded-md hover:bg-stone-50 transition-colors"
                          onClick={() => deleteReferral(job.id)}
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 text-lg leading-tight">{job.title}</h4>
                    <p className="text-sm text-slate-500 mb-4">{job.company} • {job.department || 'General'}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <div className="flex -space-x-2">
                        {/* Mock applicant avatars */}
                        {job.applications_count > 0 && (
                          <>
                            <div className="size-6 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                              {job.title.charAt(0)}
                            </div>
                            {job.applications_count > 1 && (
                              <div className="size-6 rounded-full ring-2 ring-white bg-amber-100 flex items-center justify-center text-[9px] font-bold text-amber-700">
                                {job.company.charAt(0)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <button 
                        className="flex items-center gap-1.5 text-slate-500 text-xs font-medium hover:text-[#5f7261] transition-colors cursor-pointer"
                        onClick={() => handleViewApplications(job.id)}
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        {job.applications_count || 0} Applicants
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateReferralPage;