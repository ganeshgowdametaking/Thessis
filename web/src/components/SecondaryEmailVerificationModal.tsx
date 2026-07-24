import React from 'react';
import { Mail, AlertCircle, ArrowRight, X } from 'lucide-react';

interface SecondaryEmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSettings: () => void;
}

const SecondaryEmailVerificationModal: React.FC<SecondaryEmailVerificationModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSettings
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-slate-900">Email Verification Required</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-start space-x-3 mb-4">
            <Mail className="h-5 w-5 text-sage mt-0.5" />
            <div>
              <p className="text-slate-700 mb-2">
                To post job referrals, you need to verify your organization email address. This helps ensure the quality and authenticity of job postings.
              </p>
              <p className="text-sm text-slate-600">
                Please verify your secondary email address in your account settings.
              </p>
            </div>
          </div>
          
          <div className="bg-sage-light border border-sage/20 rounded-lg p-4">
            <h3 className="font-medium text-sage-dark mb-2">What you need to do:</h3>
            <ol className="text-sm text-sage-dark space-y-1">
              <li>1. Go to your Account Settings</li>
              <li>2. Find the "Organization Email Verification" section</li>
              <li>3. Enter your organization email (not Gmail)</li>
              <li>4. Verify the email with the code sent to you</li>
              <li>5. Return here to post your referral</li>
            </ol>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-parchment-sunken focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Cancel
          </button>
          <button
            onClick={onNavigateToSettings}
            className="flex-1 px-4 py-2 bg-sage text-white rounded-lg hover:bg-sage-dark focus:outline-none focus:ring-2 focus:ring-sage flex items-center justify-center space-x-2"
          >
            <span>Go to Settings</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecondaryEmailVerificationModal; 