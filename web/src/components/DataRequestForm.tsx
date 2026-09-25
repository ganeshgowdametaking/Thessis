import React, { useState } from 'react';
import { Download, Trash2, Edit3, Send, Check, Clock } from 'lucide-react';
import { gdprService } from '../services/gdprService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface DataRequestFormProps {
  onBack: () => void;
}

const DataRequestForm: React.FC<DataRequestFormProps> = () => {
  const { user } = useAuthContext();
  const [requestType, setRequestType] = useState<'access' | 'delete' | 'correct'>('correct');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!details.trim()) {
      setError('Please provide details for your request');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const userData = {
        userId: user?.id,
        email: user?.email,
        requestType,
        details,
        timestamp: new Date().toISOString()
      };
      
      const result = await gdprService.requestDataAction(requestType, userData);
      
      if (result) {
        setSuccess(true);
        setDetails('');
      } else {
        setError('Failed to submit your request. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderText = () => {
    switch (requestType) {
      case 'access':
        return 'Please specify what data you would like to access...';
      case 'delete':
        return 'Please provide any additional details about your deletion request...';
      case 'correct':
        return 'Please provide specific details to help us fulfill your request. For corrections, please specify the old vs. new values...';
      default:
        return 'Please provide details for your request...';
    }
  };

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        textarea::-webkit-scrollbar {
          width: 8px;
        }
        textarea::-webkit-scrollbar-track {
          background: transparent;
        }
        textarea::-webkit-scrollbar-thumb {
          background-color: #D1D5DB;
          border-radius: 4px;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
      
      <div className="bg-stone-bg font-display min-h-screen flex flex-col justify-start sm:justify-center items-stretch sm:items-center p-0 sm:p-6 text-slate-700 transition-colors duration-300">
        {/* Background Decorations */}
        <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none hidden sm:block">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-sage/5 blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-blue-prof/5 blur-3xl"></div>
        </div>

        <div className="w-full max-w-4xl bg-white rounded-none sm:rounded-2xl shadow-none sm:shadow-xl overflow-hidden flex flex-col relative border-y border-slate-100 sm:border">
          {/* Header */}
          <div className="px-4 sm:px-8 pt-4 sm:pt-8 pb-4 flex items-center gap-3 sm:gap-4 border-b border-slate-100">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900">GDPR Data Request</h1>
          </div>

          {/* Main Content */}
          <div className="px-4 sm:px-8 py-5 sm:py-6 md:px-12 md:py-8 flex flex-col gap-6 sm:gap-8">
            {/* Description */}
            <div className="max-w-2xl">
              <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                Under the General Data Protection Regulation (GDPR), you have the right to access, delete, or correct your personal data. Please select the type of request you'd like to make.
              </p>
            </div>

            {/* Request Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Access Data */}
              <label className="group cursor-pointer relative">
                <input 
                  className="peer sr-only" 
                  name="request_type" 
                  type="radio" 
                  value="access"
                  checked={requestType === 'access'}
                  onChange={() => setRequestType('access')}
                />
                <div className="h-full p-4 sm:p-6 rounded-xl border-2 border-stone-border bg-white hover:bg-blue-wash/30 transition-all duration-200 peer-checked:border-blue-prof peer-checked:bg-white flex flex-col gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-wash text-blue-prof flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Download className="text-[24px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">Access My Data</h3>
                    <p className="text-sm text-slate-500">Request a copy of your personal data archive.</p>
                  </div>
                </div>
              </label>

              {/* Delete Data */}
              <label className="group cursor-pointer relative">
                <input 
                  className="peer sr-only" 
                  name="request_type" 
                  type="radio" 
                  value="delete"
                  checked={requestType === 'delete'}
                  onChange={() => setRequestType('delete')}
                />
                <div className="h-full p-4 sm:p-6 rounded-xl border-2 border-stone-border bg-white hover:bg-red-wash/30 transition-all duration-200 peer-checked:border-red-prof peer-checked:bg-white flex flex-col gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-red-wash text-red-prof flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Trash2 className="text-[24px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">Delete My Data</h3>
                    <p className="text-sm text-slate-500">Permanently remove your account and logs.</p>
                  </div>
                </div>
              </label>

              {/* Correct Data */}
              <label className="group cursor-pointer relative">
                <input 
                  className="peer sr-only" 
                  name="request_type" 
                  type="radio" 
                  value="correct"
                  checked={requestType === 'correct'}
                  onChange={() => setRequestType('correct')}
                />
                <div className="h-full p-4 sm:p-6 rounded-xl border-2 border-stone-border bg-white hover:bg-sage-wash/50 transition-all duration-200 peer-checked:border-sage peer-checked:bg-white flex flex-col gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-sage-wash text-sage flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Edit3 className="text-[24px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900">Correct My Data</h3>
                    <p className="text-sm text-slate-500">Update inaccurate profile information.</p>
                  </div>
                </div>
              </label>
            </div>

            {/* Form Section */}
            <div className="bg-stone-off rounded-xl p-4 sm:p-6 md:p-8 mt-1 sm:mt-2 transition-all duration-300">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-500" htmlFor="details">
                    Request Details *
                  </label>
                  <textarea
                    className="w-full min-h-[160px] p-4 rounded-lg border border-stone-border bg-white focus:border-sage focus:outline-none resize-none text-slate-700 placeholder-slate-400 transition-shadow"
                    id="details"
                    placeholder={getPlaceholderText()}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-4 pt-2">
                  <div className="text-xs text-slate-500 max-w-md order-2 sm:order-1">
                    By submitting this form, you acknowledge that we may need to verify your identity before processing the request.
                  </div>
                  <button 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-sage hover:bg-sage/90 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner inline />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="text-[20px]" />
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Success Overlay */}
          {success && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-5 sm:p-8 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-sage-wash text-sage flex items-center justify-center mb-6">
                <Check className="text-[40px]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Request Submitted Successfully</h2>
              <p className="text-slate-500 max-w-md mb-8">
                We have received your GDPR data request. A confirmation email has been sent to your registered address with a reference ID.
              </p>
              <button 
                onClick={() => {
                  setSuccess(false);
                  setRequestType('access');
                  setDetails('');
                  setError('');
                }}
                className="bg-transparent border-2 border-sage text-slate-900 hover:bg-sage hover:text-white font-bold py-2 px-6 rounded-lg transition-all duration-200"
              >
                Submit Another Request
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 sm:px-8 py-3 sm:py-4 bg-stone-off border-t border-slate-200 text-center md:text-left">
            <p className="text-xs text-slate-500 flex items-center gap-2 justify-center md:justify-start">
              <Clock className="text-[16px]" />
              Processing time: up to 30 days. We may require additional identity verification steps.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default DataRequestForm;
