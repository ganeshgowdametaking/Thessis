import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, DollarSign, Calendar, FileText, Users, ArrowRight, CheckCircle } from 'lucide-react';
import shareIcon from '../assets/share-icon.png';
import LoadingSpinner from './LoadingSpinner';
import BackArrowIcon from './icons/BackArrowIcon';

interface JobData {
  title: string;
  location: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  description: string;
  requiredSkills: string[];
  screeningQuestions: string[];
  shareWithNetwork: boolean;
  shareEmails: string[];
}

const CompanyOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState({
    country: 'US',
    currency: 'USD'
  });

  const [jobData, setJobData] = useState<JobData>({
    title: '',
    location: '',
    employmentType: 'full-time',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    description: '',
    requiredSkills: [],
    screeningQuestions: [],
    shareWithNetwork: false,
    shareEmails: []
  });

  useEffect(() => {
    detectUserLocation();
  }, []);

  const detectUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setUserLocation({
        country: data.country_code || 'US',
        currency: getCurrencyForCountry(data.country_code)
      });
      setJobData(prev => ({ ...prev, currency: getCurrencyForCountry(data.country_code) }));
    } catch (error) {
      console.log('Using default location (US)');
    }
  };

  const getCurrencyForCountry = (countryCode: string) => {
    const currencyMap: { [key: string]: string } = {
      'US': 'USD',
      'CA': 'CAD',
      'GB': 'GBP',
      'EU': 'EUR',
      'AU': 'AUD',
      'IN': 'INR'
    };
    return currencyMap[countryCode] || 'USD';
  };

  const handleInputChange = (field: keyof JobData, value: any) => {
    setJobData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSkill = (skill: string) => {
    if (skill.trim() && !jobData.requiredSkills.includes(skill.trim())) {
      setJobData(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, skill.trim()]
      }));
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setJobData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(skill => skill !== skillToRemove)
    }));
  };

  const addScreeningQuestion = (question: string) => {
    if (question.trim()) {
      setJobData(prev => ({
        ...prev,
        screeningQuestions: [...prev.screeningQuestions, question.trim()]
      }));
    }
  };

  const removeScreeningQuestion = (questionToRemove: string) => {
    setJobData(prev => ({
      ...prev,
      screeningQuestions: prev.screeningQuestions.filter(q => q !== questionToRemove)
    }));
  };

  const addShareEmail = (email: string) => {
    if (email.trim() && !jobData.shareEmails.includes(email.trim())) {
      setJobData(prev => ({
        ...prev,
        shareEmails: [...prev.shareEmails, email.trim()]
      }));
    }
  };

  const removeShareEmail = (emailToRemove: string) => {
    setJobData(prev => ({
      ...prev,
      shareEmails: prev.shareEmails.filter(email => email !== emailToRemove)
    }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublishJob = async () => {
    try {
      setLoading(true);
      // Here you would typically save the job to your database
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Redirect to success page
      navigate('/company-job-success', {
        state: { jobData }
      });
    } catch (error) {
      console.error('Error publishing job:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    return (currentStep / 3) * 100;
  };

  const renderJobPreview = () => (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Job Preview</h3>

      <div className="border border-slate-200 rounded-lg p-4">
        <h4 className="font-semibold text-lg text-slate-900 mb-2">
          {jobData.title || 'Software Engineer'}
        </h4>

        <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
          <div className="flex items-center space-x-1">
            <Building className="h-4 w-4" />
            <span>Your Company</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{jobData.location || 'Remote'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{jobData.employmentType.replace('-', ' ')}</span>
          </div>
        </div>

        {jobData.salaryMin && jobData.salaryMax && (
          <div className="flex items-center space-x-1 text-sm text-slate-600 mb-3">
            <DollarSign className="h-4 w-4" />
            <span>
              {jobData.currency} {jobData.salaryMin} - {jobData.salaryMax}
            </span>
          </div>
        )}

        {jobData.requiredSkills.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-700 mb-1">Required Skills:</p>
            <div className="flex flex-wrap gap-1">
              {jobData.requiredSkills.map((skill, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {jobData.description && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Description:</p>
            <p className="text-sm text-slate-600 line-clamp-3">
              {jobData.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Job Title *
        </label>
        <input
          type="text"
          value={jobData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="e.g., Senior Software Engineer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Location *
        </label>
        <input
          type="text"
          value={jobData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="e.g., San Francisco, CA or Remote"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Employment Type *
        </label>
        <select
          value={jobData.employmentType}
          onChange={(e) => handleInputChange('employmentType', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Min Salary
          </label>
          <input
            type="number"
            value={jobData.salaryMin}
            onChange={(e) => handleInputChange('salaryMin', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="50000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Max Salary
          </label>
          <input
            type="number"
            value={jobData.salaryMax}
            onChange={(e) => handleInputChange('salaryMax', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="120000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Currency
          </label>
          <select
            value={jobData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Job Description *
        </label>
        <textarea
          value={jobData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="Describe the role, responsibilities, and requirements..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Required Skills
        </label>
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add a skill (e.g., React, Python)"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addSkill(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                addSkill(input.value);
                input.value = '';
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {jobData.requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {jobData.requiredSkills.map((skill, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(skill)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Screening Questions (Optional)
        </label>
        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add a screening question"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addScreeningQuestion(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                addScreeningQuestion(input.value);
                input.value = '';
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {jobData.screeningQuestions.length > 0 && (
            <div className="space-y-2">
              {jobData.screeningQuestions.map((question, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                  <span className="text-sm">{question}</span>
                  <button
                    onClick={() => removeScreeningQuestion(question)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Post for Free</h3>
        <p className="text-blue-800 text-sm">
          Free jobs run for 30 days and auto-renew if you share with 5 contacts.
        </p>
      </div>

      <div>
        <label className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            checked={jobData.shareWithNetwork}
            onChange={(e) => handleInputChange('shareWithNetwork', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Share with my network</span>
        </label>

        {jobData.shareWithNetwork && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Addresses
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addShareEmail(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addShareEmail(input.value);
                      input.value = '';
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                {jobData.shareEmails.length > 0 && (
                  <div className="space-y-2">
                    {jobData.shareEmails.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <span className="text-sm">{email}</span>
                        <button
                          onClick={() => removeShareEmail(email)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2">Email Template</h4>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                defaultValue={`Hi there!

I'm hiring for a ${jobData.title} position at our company. I thought you might know someone who would be a great fit.

Here's the job posting: [Job Link]

Thanks for your help!

Best regards,
[Your Name]`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button className="group flex items-center space-x-2 px-4 py-2 hover:bg-slate-50 transition-colors">
          <img
            src={shareIcon}
            alt="LinkedIn"
            className="h-4 w-4 object-contain transition-all duration-200 group-hover:scale-110"
          />
          <span>Share on LinkedIn</span>
        </button>
        <button className="group flex items-center space-x-2 px-4 py-2 hover:bg-slate-50 transition-colors">
          <img
            src={shareIcon}
            alt="Twitter"
            className="h-4 w-4 object-contain transition-all duration-200 group-hover:scale-110"
          />
          <span>Share on Twitter</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold font-display text-slate-900">Thessis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Let's Post Your First Job</h1>
            <span className="text-sm text-slate-600">Step {currentStep} of 3</span>
          </div>
          <div className="w-full bg-parchment-sunken rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Your job is {Math.round(getProgressPercentage())}% complete—only {3 - currentStep} more step{3 - currentStep !== 1 ? 's' : ''}!
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-6">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BackArrowIcon className="h-4 w-4" />
                <span>Previous</span>
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={nextStep}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handlePublishJob}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner text="Publishing..." />
                    </>
                  ) : (
                    <>
                      <span>Publish Job</span>
                      <CheckCircle className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:block">
            {renderJobPreview()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboardingPage; 
