import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Eye, ChevronDown, Search } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import BackArrowIcon from './icons/BackArrowIcon';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface JobFormData {
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_min: string;
  salary_max: string;
  description: string;
  requirements: string;
  benefits: string;
  status: 'draft' | 'active';
}

// Location data with major cities and countries
const locationOptions = [
  // United States
  'New York, NY, USA', 'Los Angeles, CA, USA', 'San Francisco, CA, USA', 'Chicago, IL, USA', 'Boston, MA, USA',
  'Seattle, WA, USA', 'Austin, TX, USA', 'Denver, CO, USA', 'Miami, FL, USA', 'Atlanta, GA, USA',
  'Washington, DC, USA', 'Dallas, TX, USA', 'Houston, TX, USA', 'Phoenix, AZ, USA', 'San Diego, CA, USA',
  
  // United Kingdom
  'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK', 'Glasgow, UK', 'Liverpool, UK',
  
  // Canada
  'Toronto, ON, Canada', 'Vancouver, BC, Canada', 'Montreal, QC, Canada', 'Calgary, AB, Canada',
  
  // Europe
  'Berlin, Germany', 'Munich, Germany', 'Hamburg, Germany', 'Frankfurt, Germany',
  'Paris, France', 'Lyon, France', 'Marseille, France',
  'Amsterdam, Netherlands', 'Rotterdam, Netherlands',
  'Stockholm, Sweden', 'Gothenburg, Sweden',
  'Oslo, Norway', 'Bergen, Norway',
  'Copenhagen, Denmark', 'Aarhus, Denmark',
  'Helsinki, Finland', 'Tampere, Finland',
  'Zurich, Switzerland', 'Geneva, Switzerland',
  'Vienna, Austria', 'Salzburg, Austria',
  'Brussels, Belgium', 'Antwerp, Belgium',
  'Dublin, Ireland', 'Cork, Ireland',
  
  // Asia-Pacific
  'Sydney, NSW, Australia', 'Melbourne, VIC, Australia', 'Brisbane, QLD, Australia', 'Perth, WA, Australia',
  'Auckland, New Zealand', 'Wellington, New Zealand',
  'Singapore', 'Hong Kong', 'Tokyo, Japan', 'Osaka, Japan', 'Seoul, South Korea', 'Busan, South Korea',
  'Mumbai, India', 'Delhi, India', 'Bangalore, India', 'Chennai, India', 'Kolkata, India',
  'Shanghai, China', 'Beijing, China', 'Shenzhen, China', 'Guangzhou, China',
  
  // Remote options
  'Remote', 'Remote (US)', 'Remote (Europe)', 'Remote (Global)'
];

interface LocationDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const LocationDropdown: React.FC<LocationDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = locationOptions.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (location: string) => {
    onChange(location);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="e.g., San Francisco, CA"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">
              No locations found. You can type a custom location.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CompanyNewJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    company: profile?.company_name || '',
    location: '',
    job_type: 'full-time',
    salary_min: '',
    salary_max: '',
    description: '',
    requirements: '',
    benefits: '',
    status: 'draft'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          title: formData.title,
          company: formData.company,
          location: formData.location,
          job_type: formData.job_type,
          salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
          description: formData.description,
          requirements: formData.requirements,
          benefits: formData.benefits,
          status: formData.status,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Redirect to the job details or jobs list
      navigate('/company-hiring/jobs');
    } catch (error) {
      console.error('Error creating job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setFormData(prev => ({ ...prev, status: 'draft' }));
    await handleSubmit(new Event('submit') as any);
  };

  const handlePublish = async () => {
    setFormData(prev => ({ ...prev, status: 'active' }));
    await handleSubmit(new Event('submit') as any);
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ');
    }
    return text;
  };

  const handleAIAutoFill = async (type: 'pdf' | 'link', payload: any) => {
    setAiLoading(true);
    setAiError(null);
    try {
      let textToProcess = '';
      let urlToProcess = '';

      if (type === 'pdf') {
        textToProcess = await extractTextFromPDF(payload);
        if (!textToProcess.trim()) throw new Error('Could not extract text from PDF.');
      } else {
        urlToProcess = payload;
      }

      const response = await fetch('/api/extract-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess, url: urlToProcess }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Failed to extract job details');
      }

      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        title: data.job_title || prev.title,
        company: data.company_name || prev.company,
        location: data.location || prev.location,
        job_type: (data.job_type || prev.job_type).toLowerCase().replace(/\s+/g, '-'),
        description: data.full_content_body || data.description || prev.description,
        requirements: Array.isArray(data.skills) ? data.skills.join(', ') : prev.requirements,
        benefits: Array.isArray(data.benefits) ? data.benefits.join(', ') : prev.benefits,
      }));
    } catch (error: any) {
      setAiError(error.message || 'AI extraction failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/company-hiring/jobs')}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <BackArrowIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create New Job</h1>
              <p className="text-slate-600 mt-2">Post a new job opening</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-900"
            >
              <Eye className="h-4 w-4" />
              <span>{previewMode ? 'Edit' : 'Preview'}</span>
            </button>
          </div>
        </div>
      </div>

      {previewMode ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{formData.title || 'Job Title'}</h2>
            <p className="text-slate-600">{formData.company} • {formData.location} • {formData.job_type}</p>
            {formData.salary_min && formData.salary_max && (
              <p className="text-slate-600 mt-1">${formData.salary_min} - ${formData.salary_max}</p>
            )}
          </div>

          {formData.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Job Description</h3>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{formData.description}</p>
              </div>
            </div>
          )}

          {formData.requirements && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Requirements</h3>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{formData.requirements}</p>
              </div>
            </div>
          )}

          {formData.benefits && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Benefits</h3>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{formData.benefits}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">AI Job Autofill</h2>
            <p className="text-sm text-slate-600 mb-4">Upload a job-description PDF or paste a job link to autofill this form.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center justify-center h-24 border-2 border-dashed border-blue-300 rounded-lg bg-white cursor-pointer hover:bg-blue-50">
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleAIAutoFill('pdf', e.target.files[0])}
                  disabled={aiLoading}
                />
                <span className="text-sm text-blue-700 font-medium">{aiLoading ? 'Processing...' : 'Upload PDF'}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={referralLink}
                  onChange={(e) => setReferralLink(e.target.value)}
                  placeholder="Paste job link"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => referralLink && handleAIAutoFill('link', referralLink)}
                  disabled={aiLoading || !referralLink}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50"
                >
                  Extract
                </button>
              </div>
            </div>
            {aiError && <p className="mt-3 text-sm text-red-600">{aiError}</p>}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Job Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Job Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Location *</label>
                <LocationDropdown
                  value={formData.location}
                  onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Job Type</label>
                <select
                  name="job_type"
                  value={formData.job_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Salary</label>
                <input
                  type="number"
                  name="salary_min"
                  value={formData.salary_min}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 80000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Maximum Salary</label>
                <input
                  type="number"
                  name="salary_max"
                  value={formData.salary_max}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 120000"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Job Description</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Describe the role, responsibilities, and what makes this position exciting..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Requirements</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="List the key requirements and qualifications..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Benefits</label>
                <textarea
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="List the benefits and perks of working at your company..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Publishing...' : 'Publish Job'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CompanyNewJobPage; 
