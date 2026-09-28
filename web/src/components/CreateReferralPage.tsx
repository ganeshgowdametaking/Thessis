import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../services/jobService';
import LoadingSpinner from './LoadingSpinner';
import CompanyAvatar from './CompanyAvatar';
import { getCompanyLogoUrl } from '../utils/companyLogo';
import debounce from 'lodash.debounce';
import * as pdfjsLib from 'pdfjs-dist';
import { useMediaQuery } from 'react-responsive';
import { AlertCircle, Briefcase, Check, ChevronDown, Eye, FileText, Link2, Loader2, MapPin, Plus, Sparkles, Trash2, Upload, Users, X, Zap } from 'lucide-react';

// Use the local worker from the node_modules
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];

const CreateReferralPage: React.FC = () => {
  // Force refresh - Sage & Stone Design
  const { user, profile } = useAuthContext();
  const [mobilePanel, setMobilePanel] = useState<'create' | 'manage'>('create');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [myReferrals, setMyReferrals] = useState<Job[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [mobileFormStep, setMobileFormStep] = useState(1);
  const [mobileImportMode, setMobileImportMode] = useState<'manual' | 'link' | 'pdf'>('manual');

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

  // AI Auto-fill state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitKind, setSubmitKind] = useState<'created' | 'joined'>('created');
  const [referralToDelete, setReferralToDelete] = useState<Job | null>(null);

  // Fetch user's jobs (acting as referrals)
  const fetchMyReferrals = useCallback(async () => {
    if (!user?.id) return;
    setLoadingReferrals(true);
    try {
      const jobs = await jobService.getUserJobs(user.id);
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
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setLocationSuggestions([]);
        return;
      }

      // Explicitly handle "Remote"
      const baseSuggestions: any[] = [];
      if ('remote'.includes(trimmedQuery.toLowerCase())) {
        baseSuggestions.push({
          place_id: 'remote_option',
          display_name: 'Remote',
          label: 'Remote',
        });
      }
      if (trimmedQuery.toLowerCase() === 'remote') {
        setLocationSuggestions(baseSuggestions);
        return;
      }

      if (trimmedQuery.length < 2) {
        setLocationSuggestions(baseSuggestions);
        return;
      }

      try {
        const response = await fetch(
          `/api/location-suggestions?q=${encodeURIComponent(trimmedQuery)}&limit=8`
        );

        if (!response.ok) {
          throw new Error(`Location API failed with status ${response.status}`);
        }

        const data = await response.json();
        const apiSuggestions = Array.isArray(data) ? data : [];
        const deduped = [...baseSuggestions, ...apiSuggestions].filter(
          (item, index, arr) =>
            arr.findIndex((candidate) => candidate.display_name === item.display_name) === index
        );
        setLocationSuggestions(deduped);
      } catch (error) {
        // Keep at least local fallback options visible when geocoder fails.
        setLocationSuggestions(baseSuggestions);
      }
    }, 350),
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
    const displayName = suggestion.display_name || suggestion.label || '';
    setFormData(prev => ({ ...prev, location: displayName }));
    setLocationQuery(displayName);
    setLocationSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMobile) {
      const form = e.currentTarget as HTMLFormElement;
      const invalid = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')).find(field => !field.checkValidity());
      if (invalid) {
        const step = Number(invalid.closest('[data-referral-step]')?.getAttribute('data-referral-step'));
        if (step) setMobileFormStep(step);
        requestAnimationFrame(() => { invalid.focus(); invalid.reportValidity(); });
        return;
      }
    }
    if (!user?.id) return;
    if (!(profile as any)?.work_email_verified) {
      alert('Verify your work email in your profile before publishing a referral.');
      return;
    }

    setLoading(true);
    setSubmitMessage(null);
    try {
      const title = formData.title.trim();
      const company = formData.company.trim();

      // Reuse this user's own active posting for the same company and title.
      // Another user's posting cannot establish that this user works there.
      const { data: existingJobId, error: matchError } = await supabase
        .rpc('find_canonical_job', { p_company: company, p_title: title } as any);

      if (matchError) {
        throw new Error(`Database error: ${matchError.message}`);
      }

      if (existingJobId) {
        const { error: joinError } = await supabase
          .rpc('join_job_as_referrer', { p_job_id: existingJobId } as any);

        if (joinError) {
          throw new Error(`Database error: ${joinError.message}`);
        }

        setSubmitKind('joined');
        setSubmitMessage(`${title} at ${company} is already one of your active referrals, so we reused that posting.`);
      } else {
        const jobData = {
          title,
          company,
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

        const { data: newJob, error } = await supabase
          .from('jobs')
          .insert([jobData as any])
          .select()
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        // The creator becomes a referrer for their own posting too — unless
        // they're a company account, since a company posting the role isn't
        // itself an individual who can personally handle referral requests.
        if ((newJob as any)?.id && profile?.account_type !== 'company') {
          const { error: joinSelfError } = await supabase
            .rpc('join_job_as_referrer', { p_job_id: (newJob as any).id } as any);
          if (joinSelfError) {
            console.warn('Failed to join own referrer pool:', joinSelfError);
          }
        }

        setSubmitKind('created');
        setSubmitMessage("It's live on the Jobs page now.");
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
      setTimeout(() => setSubmitMessage(null), 6000);
    } catch (error: any) {
      console.error('Error creating referral:', error);
      // Keep error alert for now since user needs to know about errors
      alert(error.message || 'Failed to create referral. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteReferral = async (jobId: string) => {

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

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Reconstruct line structure from positional text items so section headings
      // and bullets survive extraction.
      const items = content.items
        .map((item: any) => ({
          str: String(item?.str || ''),
          x: Number(item?.transform?.[4] || 0),
          y: Number(item?.transform?.[5] || 0),
          hasEOL: Boolean(item?.hasEOL),
        }))
        .filter((item) => item.str.trim().length > 0);

      items.sort((a, b) => (Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x));

      const lines: Array<{ y: number; chunks: string[] }> = [];
      for (const item of items) {
        const current = lines[lines.length - 1];
        if (!current || Math.abs(current.y - item.y) > 2) {
          lines.push({ y: item.y, chunks: [item.str] });
        } else {
          current.chunks.push(item.str);
        }
      }

      const pageText = lines
        .map((line) => line.chunks.join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');

      text += `${pageText}\n\n`;
    }
    return text;
  };

  const cleanPDFText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\r/g, '\n')
      // Keep paragraph structure while normalizing spaces
      .replace(/[ \t]+/g, ' ')
      // Merge split words caused by line wraps: "Must \n- Have" -> "Must-Have"
      .replace(/([A-Za-z])\s*\n\s*-\s*([A-Za-z])/g, '$1-$2')
      // Remove standalone page noise lines and tiny artifacts
      .replace(/^\s*(page\s*\d+|confidential|draft)\s*$/gim, '')
      // 2. Insert newlines before common Job Description Headers
      .replace(
        /(The Role|About Us|What We[’']?re Looking For|Your Mission|Key Responsibilities|Responsibilities|Requirements|Qualifications|Benefits|Role:|Location:|Compensation:|What You[’']?ll Work On)/gi,
        '\n\n$1'
      )
      // 3. Keep bullet/number list structure
      .replace(/(?:^|\s)([•*-])\s+/g, '\n$1 ')
      .replace(/(?:^|\s)(\d+\.)\s+/g, '\n$1 ')
      // 4. Fix split hyphenated words from PDF extraction: "high - fidelity" -> "high-fidelity"
      .replace(/([A-Za-z])\s-\s([A-Za-z])/g, '$1-$2')
      // 4. Ensure space after colons for readability
      .replace(/([a-zA-Z]+:)(?=[^\s])/g, '$1 ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const normalizeJobType = (jobType: string | undefined, title: string, description: string) => {
    const source = `${jobType || ''} ${title || ''} ${description || ''}`.toLowerCase();
    if (/\bfull[\s-]*time\b/i.test(source)) return 'Full-time';
    if (/\bcontract\b/i.test(source)) return 'Contract';
    if (/\bpart[\s-]*time\b/i.test(source)) return 'Part-time';
    if (/\bfreelance\b/i.test(source)) return 'Freelance';
    return 'Full-time';
  };

  const normalizeExperienceLevel = (rawLevel: string | undefined, title: string, description: string) => {
    const source = `${rawLevel || ''} ${title || ''} ${description || ''}`;
    if (/\b(intern|internship|trainee|apprentice)\b/i.test(source)) return 'Internship';

    const range = source.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i);
    const plus = source.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+experience)?/i);
    const years = range ? Number(range[1]) : plus ? Number(plus[1]) : 0;
    if (years >= 5) return 'Senior (5+ yrs)';
    if (years >= 2) return 'Mid Level (2-4 yrs)';
    if (years > 0) return 'Entry Level';

    if (rawLevel && ['Internship', 'Entry Level', 'Mid Level (2-4 yrs)', 'Senior (5+ yrs)', 'Lead / Manager'].includes(rawLevel)) {
      return rawLevel;
    }

    return 'Entry Level';
  };

  const formatExtractedJobDescription = (text: string) => {
    if (!text) return '';
    let formatted = text.replace(/\r/g, '\n');

    // Preserve structural headings and add spacing like source job pages.
    const headingPatterns = [
      'Key Responsibilities',
      'Required Skills',
      'Preferred Qualifications',
      'Education',
      'Benefits',
      'Responsibilities',
      'Qualifications',
      'Requirements',
    ];
    for (const heading of headingPatterns) {
      const regex = new RegExp(`\\b${heading}\\s*:`, 'gi');
      formatted = formatted.replace(regex, `\n\n${heading}:\n\n`);
    }

    // Keep each "Label: details" as its own paragraph (not list bullet).
    formatted = formatted.replace(
      /([A-Z][A-Za-z/& ()-]{2,50}:\s*)([^:\n]+?)(?=(?:\s+[A-Z][A-Za-z/& ()-]{2,50}:\s)|\n\n|$)/g,
      (_m, label, body) => `${label}${String(body).trim()}\n\n`
    );

    formatted = formatted
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return formatted;
  };

  const handleAIAutoFill = async (type: 'pdf' | 'link', payload: any) => {
    setAiLoading(true);
    setAiError(null);
    try {
      let textToProcess = '';
      let urlToProcess = '';

      if (type === 'pdf') {
        textToProcess = await extractTextFromPDF(payload);
        console.log(`📄 PDF Extracted Text (${textToProcess.length} chars):`, textToProcess.substring(0, 300) + '...');
        if (!textToProcess.trim()) throw new Error('Could not find any text in this PDF. It might be an image.');
      } else {
        urlToProcess = payload;
      }

      const response = await fetch('/api/extract-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess, url: urlToProcess }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to extract data';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server Error (${response.status}): ${errorText.substring(0, 50)}...`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const sourceDescription = data.full_content_body || data.description || textToProcess || '';
      const normalizedTitle = data.job_title || data.title || formData.title || '';
      const structuredDescription =
        type === 'pdf'
          ? cleanPDFText(sourceDescription)
          : formatExtractedJobDescription(sourceDescription);
      const normalizedJobType = normalizeJobType(data.job_type, normalizedTitle, sourceDescription);
      const normalizedExperience = normalizeExperienceLevel(data.experience_level, normalizedTitle, sourceDescription);

      // Update form with AI results
      setFormData(prev => ({
        ...prev,
        title: normalizedTitle || prev.title,
        company: data.company_name || data.company || prev.company,
        department: data.department || prev.department,
        description: structuredDescription || cleanPDFText(textToProcess) || prev.description,
        location: data.location || prev.location,
        experience_level: normalizedExperience || prev.experience_level,

        // ✨ NEW: Capture Skills, Benefits, and Job Type
        job_type: normalizedJobType || prev.job_type,
        skills: data.skills && Array.isArray(data.skills) ? data.skills : prev.skills,
        benefits: data.benefits && Array.isArray(data.benefits) ? data.benefits : prev.benefits,
      }));

      if (data.location) setLocationQuery(data.location);

      console.log('✨ AI Extraction Success:', data);
    } catch (err: any) {
      console.error('❌ AI Extraction Error:', err);
      setAiError(err.message || 'Something went wrong during extraction');
    } finally {
      setAiLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const label = status === 'active' ? 'Active' : status === 'closed' ? 'Closed' : 'Draft';
    const tone =
      status === 'active'
        ? 'bg-success-tint text-success-ink'
        : status === 'closed'
          ? 'bg-parchment-sunken text-slate-600'
          : 'bg-amber-tint text-amber-ink';
    return (
      <span className={`inline-flex shrink-0 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide ${tone}`}>
        {label}
      </span>
    );
  };

  const inputClass = 'w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors';
  const labelClass = 'block text-[12.5px] font-semibold text-slate-600 mb-1.5';
  const advanceMobileStep = (event: React.MouseEvent<HTMLButtonElement>, step: number) => {
    const fields = event.currentTarget.closest('section')?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
    const invalid = Array.from(fields || []).find(field => !field.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    setMobileFormStep(step);
  };

  const stepHidden = (step: number) => (isMobile && mobileFormStep !== step ? 'hidden' : '');

  const sectionHeading = (step: number, title: string) => (
    <div className="hidden md:flex items-center gap-3">
      <span className="size-7 shrink-0 rounded-full bg-ink-wash text-primary-hover font-display font-extrabold text-[12.5px] flex items-center justify-center">
        {step}
      </span>
      <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
    </div>
  );

  const toggleRow = (field: 'remote_available' | 'urgent_hiring', label: string, hint: string) => (
    <label className="flex-1 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer">
      <span className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-bold text-ink">{label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={!!formData[field]}
        onChange={(e) => handleInputChange(field, e.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative h-[23px] w-10 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 after:absolute after:left-[3px] after:top-[3px] after:h-[17px] after:w-[17px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[17px]"
      />
    </label>
  );

  const stats = [
    { label: 'Your referrals', value: myReferrals.length, icon: <Users className="h-[18px] w-[18px]" />, tone: 'bg-ink-wash text-primary' },
    { label: 'Applications received', value: myReferrals.reduce((sum, job) => sum + (job.applications_count || 0), 0), icon: <FileText className="h-[18px] w-[18px]" />, tone: 'bg-amber-tint text-amber-ink' },
    { label: 'Active referrals', value: myReferrals.filter(job => job.status === 'active').length, icon: <Zap className="h-[18px] w-[18px]" />, tone: 'bg-success-tint text-success-ink' },
  ];

  return (
    <div data-mobile-panel={mobilePanel} className="mobile-page referral-page bg-parchment font-display text-slate-700 antialiased min-h-screen flex flex-col">
      <main className="flex-grow w-full px-4 md:px-10 lg:px-12 py-6 md:py-10 max-w-6xl mx-auto">
        <div className="mobile-page-title mb-5 md:mb-8">
          <h1 className="font-display text-2xl md:text-[28px] font-extrabold text-ink">Post a referral</h1>
        </div>

        {isMobile && <nav className="mobile-referral-tabs" aria-label="Referral workspace">
          <button type="button" aria-pressed={mobilePanel === 'create'} onClick={() => setMobilePanel('create')}>Create referral</button>
          <button type="button" aria-pressed={mobilePanel === 'manage'} onClick={() => setMobilePanel('manage')}>Your referrals <span>{myReferrals.length}</span></button>
        </nav>}

        {/* Stats */}
        <div className="referral-stats grid grid-cols-3 gap-2.5 md:gap-4 mb-6 md:mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-3.5 md:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-semibold text-slate-500 leading-tight">{stat.label}</p>
                <p className="font-display text-xl md:text-[26px] font-extrabold text-ink mt-1">{stat.value}</p>
              </div>
              <span className={`hidden sm:flex size-10 shrink-0 rounded-xl items-center justify-center ${stat.tone}`}>{stat.icon}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-7 items-start">
          <div className="referral-create-panel flex flex-col gap-5 min-w-0">
            {/* Auto-fill */}
            <div className="referral-import bg-white border border-indigo-200 rounded-2xl p-4 md:p-6" data-mode={mobileImportMode}>
              <div className="referral-import-heading flex items-center gap-3 mb-4">
                <span className="size-10 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center">
                  <Sparkles className="h-[18px] w-[18px]" />
                </span>
                <h2 className="font-display text-[15.5px] font-bold text-ink">Fill it in automatically</h2>
              </div>

              {isMobile && <div className="mobile-import-choices" aria-label="How to enter job details">
                {([['manual', 'Enter manually'], ['link', 'Import link'], ['pdf', 'Upload PDF']] as const).map(([mode, label]) => (
                  <button key={mode} type="button" aria-pressed={mobileImportMode === mode} onClick={() => setMobileImportMode(mode)}>{label}</button>
                ))}
              </div>}
              {aiLoading ? (
                <div className="rounded-xl bg-ink-wash p-4 flex flex-col gap-2.5" role="status">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-[13.5px] font-bold text-primary-hover">Reading the job details…</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                    <div className="h-full w-2/5 rounded-full bg-primary animate-indeterminate" />
                  </div>
                  <span className="text-xs text-slate-600">This usually takes a few seconds. You can edit everything afterwards.</span>
                </div>
              ) : (
                <div className="referral-import-options grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-3 md:gap-4">
                  <label className="referral-pdf flex items-center gap-3 rounded-xl border-[1.5px] border-dashed border-indigo-200 bg-ink-wash/60 hover:bg-ink-wash p-4 cursor-pointer transition-colors">
                    <span className="size-10 shrink-0 rounded-full bg-white text-primary flex items-center justify-center">
                      <Upload className="h-5 w-5" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[13px] font-bold text-ink">Upload a job PDF</span>
                      <span className="text-[11.5px] text-slate-500">{isMobile ? 'Tap to choose a file' : 'Click to choose a file'}</span>
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf"
                      onChange={(e) => e.target.files?.[0] && handleAIAutoFill('pdf', e.target.files[0])}
                      disabled={aiLoading}
                    />
                  </label>
                  <div className="referral-url flex flex-col gap-2 justify-center">
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="url"
                        aria-label="Job link"
                        placeholder="Paste a job link (LinkedIn, company site…)"
                        className={`${inputClass} pl-10`}
                        value={referralLink}
                        onChange={(e) => setReferralLink(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => referralLink && handleAIAutoFill('link', referralLink)}
                      disabled={aiLoading || !referralLink}
                      className="h-10 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Fill in from link
                    </button>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="mt-4 flex gap-2.5 rounded-xl border border-red-200 bg-danger-tint p-3.5" role="alert">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-[12.5px]">
                    <p className="font-bold text-red-600">Couldn't fill in the form</p>
                    <p className="text-slate-600 mt-0.5">{aiError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="referral-form-card bg-white border border-slate-200 rounded-2xl">
              <div className="referral-form-title px-4 py-4 md:px-6 md:py-5 border-b border-slate-100">
                <h2 className="font-display text-[17px] font-extrabold text-ink">Role details</h2>
              </div>

              <form onSubmit={handleSubmit} noValidate={isMobile}>
                <div className="p-4 md:p-6 space-y-6">
                  {submitMessage && (
                    <div
                      role="status"
                      className={`flex gap-3 rounded-xl border p-3.5 ${submitKind === 'joined' ? 'bg-ink-wash border-indigo-200' : 'bg-success-tint border-emerald-200'}`}
                    >
                      {submitKind === 'joined'
                        ? <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        : <Check className="h-4 w-4 text-success shrink-0 mt-0.5" strokeWidth={3} />}
                      <div className="text-[12.5px]">
                        <p className={`font-bold ${submitKind === 'joined' ? 'text-primary-hover' : 'text-success-ink'}`}>
                          {submitKind === 'joined' ? 'Existing referral reused' : 'Referral posted'}
                        </p>
                        <p className={`mt-0.5 ${submitKind === 'joined' ? 'text-slate-600' : 'text-success-ink'}`}>{submitMessage}</p>
                      </div>
                    </div>
                  )}

                  {isMobile && (
                    <div className="mobile-referral-steps grid grid-cols-3 gap-1.5">
                      {['Basics', 'Role', 'Skills'].map((label, index) => {
                        const step = index + 1;
                        const isActive = mobileFormStep === step;
                        const isDone = mobileFormStep > step;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setMobileFormStep(step)}
                            aria-current={isActive ? 'step' : undefined}
                            className={`h-10 rounded-xl text-xs font-bold transition-colors ${isActive
                              ? 'bg-primary text-white'
                              : isDone
                                ? 'bg-ink-wash text-primary-hover'
                                : 'bg-white border border-slate-200 text-slate-500'
                              }`}
                          >
                            {step}. {label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 1. Basics */}
                  <section data-referral-step="1" className={`space-y-4 ${stepHidden(1)}`}>
                    {sectionHeading(1, 'Basics')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label>
                        <span className={labelClass}>Job title</span>
                        <input
                          className={inputClass}
                          placeholder="e.g. Senior Product Designer"
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Company</span>
                        <input
                          className={inputClass}
                          placeholder="e.g. Acme Corp"
                          type="text"
                          required
                          value={formData.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className={labelClass}>Location</span>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          className={`${inputClass} pl-10`}
                          placeholder="City, state or Remote"
                          type="text"
                          required
                          value={locationQuery}
                          onChange={handleLocationInput}
                        />
                        {locationSuggestions.length > 0 && (
                          <ul className="absolute z-[70] bg-white border border-slate-200 rounded-xl mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
                            {locationSuggestions.map((suggestion) => (
                              <li
                                key={suggestion.place_id || suggestion.display_name}
                                className="px-4 py-2.5 text-sm cursor-pointer hover:bg-ink-wash"
                                onMouseDown={() => handleLocationSelect(suggestion)}
                              >
                                {suggestion.label || suggestion.display_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </label>
                    {isMobile && (
                      <button
                        type="button"
                        onClick={(event) => advanceMobileStep(event, 2)}
                        className="referral-step-action w-full h-11 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
                      >
                        Continue to role details
                      </button>
                    )}
                  </section>

                  {/* 2. Role */}
                  <section data-referral-step="2" className={`space-y-4 md:border-t md:border-slate-100 md:pt-6 ${stepHidden(2)}`}>
                    {sectionHeading(2, 'Role')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label>
                        <span className={labelClass}>Job type</span>
                        <div className="relative">
                          <select
                            className={`${inputClass} appearance-none cursor-pointer pr-10`}
                            required
                            value={formData.job_type}
                            onChange={(e) => handleInputChange('job_type', e.target.value)}
                          >
                            <option>Full-time</option>
                            <option>Part-time</option>
                            <option>Contract</option>
                            <option>Freelance</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </label>
                      <label>
                        <span className={labelClass}>Experience level</span>
                        <div className="relative">
                          <select
                            className={`${inputClass} appearance-none cursor-pointer pr-10`}
                            required
                            value={formData.experience_level}
                            onChange={(e) => handleInputChange('experience_level', e.target.value)}
                          >
                            <option>Internship</option>
                            <option>Entry Level</option>
                            <option>Mid Level (2-4 yrs)</option>
                            <option>Senior (5+ yrs)</option>
                            <option>Lead / Manager</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </label>
                    </div>
                    <label className="block">
                      <span className={labelClass}>Description</span>
                      <textarea
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none transition-colors min-h-[120px] resize-y"
                        placeholder="Briefly describe the role requirements and responsibilities..."
                        required
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                      ></textarea>
                    </label>
                    {isMobile && (
                      <button
                        type="button"
                        onClick={(event) => advanceMobileStep(event, 3)}
                        className="referral-step-action w-full h-11 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-colors"
                      >
                        Continue to skills &amp; publish
                      </button>
                    )}
                  </section>

                  {/* 3. Skills & publish */}
                  <section data-referral-step="3" className={`space-y-4 md:border-t md:border-slate-100 md:pt-6 ${stepHidden(3)}`}>
                    {sectionHeading(3, 'Skills & publish')}
                    {isMobile && <div className="rounded-xl bg-parchment-sunken p-4 text-sm">
                      <p className="font-bold text-ink">{formData.title || 'Your role'}</p>
                      <p className="mt-1 text-slate-500">{[formData.company, locationQuery].filter(Boolean).join(' · ')}</p>
                      <button type="button" className="mt-2 py-2 font-bold text-primary" onClick={() => setMobileFormStep(1)}>Review details</button>
                    </div>}
                    <div>
                      <span className={labelClass}>Skills</span>
                      <div className="flex items-center gap-2">
                        <input
                          className={inputClass}
                          placeholder="Add a skill and press Enter"
                          type="text"
                          aria-label="Add a skill"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        />
                        <button
                          className="size-11 shrink-0 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
                          type="button"
                          onClick={addSkill}
                          aria-label="Add skill"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                      {(formData.skills?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3">
                          {formData.skills?.map((skill, index) => (
                            <span key={index} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-ink-wash text-primary-hover">
                              {skill}
                              <button
                                className="hover:text-red-600 flex items-center"
                                type="button"
                                onClick={() => removeSkill(skill)}
                                aria-label={`Remove ${skill}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {toggleRow('remote_available', 'Remote friendly', 'Candidates can work remotely')}
                      {toggleRow('urgent_hiring', 'Urgent', 'Shows an Urgent tag on the job')}
                    </div>
                  </section>
                </div>

                <div className={`referral-publish ${isMobile && mobileFormStep !== 3 ? 'hidden' : 'flex'} flex-col md:flex-row md:justify-end px-4 py-4 md:px-6 border-t border-slate-100 bg-parchment rounded-b-2xl`}>
                  <button
                    className="h-12 md:h-11 px-7 shrink-0 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Posting…' : 'Post referral'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Your referrals: all of them. From lg the column stays in view and the list scrolls inside it. */}
          <aside className="referral-management flex flex-col gap-3.5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)]">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="font-display text-[17px] font-extrabold text-ink">Your referrals</h2>
              <button
                type="button"
                className="text-[12.5px] font-bold text-primary hover:underline"
                onClick={() => navigate('/jobs')}
              >
                See all on Jobs
              </button>
            </div>

            {isMobile && <dl className="mobile-referral-stats">
              {stats.map(stat => <div key={stat.label}><dd>{stat.value}</dd><dt>{stat.label}</dt></div>)}
            </dl>}
            {loadingReferrals ? (
              <LoadingSpinner size="small" text="Loading referrals..." />
            ) : myReferrals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <span className="mx-auto mb-3 size-12 rounded-full bg-parchment-sunken text-slate-400 flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </span>
                <p className="text-sm font-bold text-ink">No referrals yet</p>
                <p className="text-xs text-slate-500 mt-1">Roles you post will show up here.</p>
              </div>
            ) : (
              <div className="space-y-2.5 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                {myReferrals.map((job) => (
                  <div
                    key={job.id}
                    className="managed-referral-card bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 cursor-pointer transition-colors"
                    onClick={() => handleViewApplications(job.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl size-10 border border-slate-100 overflow-hidden shrink-0">
                        <CompanyAvatar company={job.company} logoUrl={getCompanyLogoUrl(job.company)} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink leading-snug truncate">{job.title}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{job.company}</p>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        {job.applications_count || 0} applicants
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-ink hover:bg-parchment-sunken transition-colors flex items-center gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewApplications(job.id);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${job.title}`}
                          title="Delete referral"
                          className="h-8 w-8 rounded-lg border border-red-200 bg-danger-tint text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReferralToDelete(job);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>

      {referralToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/45"
          onClick={() => setReferralToDelete(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-referral-title"
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-7 pt-8 pb-6 flex flex-col items-center text-center gap-3">
              <span className="size-14 rounded-full bg-danger-tint text-red-600 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </span>
              <h2 id="delete-referral-title" className="font-display text-lg font-extrabold text-ink">Delete this referral?</h2>
              <p className="text-[13.5px] text-slate-500 leading-relaxed">
                <strong className="text-ink">{referralToDelete.title} at {referralToDelete.company}</strong> will be removed from Thessis. This can't be undone.
              </p>
            </div>
            <div className="flex gap-2.5 px-5 py-4 border-t border-slate-100 bg-parchment">
              <button
                type="button"
                autoFocus
                onClick={() => setReferralToDelete(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-ink hover:bg-parchment-sunken transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const jobId = referralToDelete.id;
                  setReferralToDelete(null);
                  deleteReferral(jobId);
                }}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateReferralPage;
