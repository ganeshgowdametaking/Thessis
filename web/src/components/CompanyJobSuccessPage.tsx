import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Copy, Twitter, Mail, Link, ArrowRight, Building } from 'lucide-react';
import shareIcon from '../assets/share-icon.png';
import LoadingSpinner from './LoadingSpinner';

const CompanyJobSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobData, setJobData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [jobUrl, setJobUrl] = useState('');

  useEffect(() => {
    if (location.state?.jobData) {
      setJobData(location.state.jobData);
      // Generate a mock job URL
      setJobUrl(`${window.location.origin}/jobs/${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [location]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(jobUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareTwitter = () => {
    const text = `We're hiring! ${jobData?.title || 'Join our team'} at Thessis. Apply now: ${jobUrl}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `We're hiring: ${jobData?.title || 'Join our team'}`;
    const body = `Hi there!

We're hiring for a ${jobData?.title || 'new position'} at our company. I thought you might know someone who would be a great fit.

Here's the job posting: ${jobUrl}

Thanks for your help!

Best regards,
[Your Name]`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  };

  const handleViewJob = () => {
    window.open(jobUrl, '_blank');
  };

  const handleGoToDashboard = () => {
    navigate('/company-dashboard');
  };

  if (!jobData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-green-400">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-2 text-white">
          <Building className="h-8 w-8" />
          <span className="text-xl font-bold font-display">Thessis</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-success-tint p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-success-ink" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Your job is live! 🎉
          </h1>

          <p className="text-xl text-slate-600 mb-8">
            Your job posting has been successfully published and is now visible to candidates.
          </p>

          {/* Job Details */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {jobData.title || 'Software Engineer'}
            </h3>
            <p className="text-slate-600 mb-4">
              {jobData.location || 'Remote'} • {jobData.employmentType?.replace('-', ' ') || 'Full-time'}
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Link className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">Direct link to job</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 mb-8">
            <button
              onClick={handleViewJob}
              className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center space-x-2"
            >
              <span>View Your Job Posting</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full bg-slate-100 text-slate-700 py-3 px-6 rounded-lg font-semibold hover:bg-parchment-sunken transition-colors flex items-center justify-center space-x-2"
            >
              <Copy className="h-5 w-5" />
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Share Options */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Share Your Job
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleShareTwitter}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                <Twitter className="h-5 w-5" />
                <span>Tweet this</span>
              </button>

              <button
                onClick={handleShareEmail}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span>Share via email</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors group"
              >
                <img
                  src={shareIcon}
                  alt="Share"
                  className="h-5 w-5 object-contain brightness-0 invert transition-all duration-200 group-hover:scale-110"
                />
                <span>Copy link</span>
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mt-8 p-6 bg-ink-wash rounded-lg">
            <h3 className="text-lg font-semibold text-primary mb-2">
              What's Next?
            </h3>
            <div className="space-y-2 text-sm text-primary">
              <p>• Your job will be visible to candidates for 30 days</p>
              <p>• You'll receive notifications when candidates apply</p>
              <p>• Share with 5+ contacts to auto-renew your posting</p>
            </div>
          </div>

          {/* Dashboard Button */}
          <div className="mt-8">
            <button
              onClick={handleGoToDashboard}
              className="text-primary hover:text-primary-hover font-medium"
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-green-600">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-green-100">
          <p className="text-sm">
            © 2026 Thessis. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyJobSuccessPage; 