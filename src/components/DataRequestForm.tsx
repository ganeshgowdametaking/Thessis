import React, { useState } from 'react';
import { ArrowLeft, Download, Trash2, Edit3, Send } from 'lucide-react';
import { gdprService } from '../services/gdprService';
import { useAuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Check from './Check';
import LoadingSpinner from './LoadingSpinner';

interface DataRequestFormProps {
  onBack: () => void;
}

const DataRequestForm: React.FC<DataRequestFormProps> = ({ onBack }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<'access' | 'delete' | 'correct'>('access');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    onBack();
    navigate('/');
  };

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

  const getRequestTypeIcon = () => {
    switch (requestType) {
      case 'access': return <Download className="h-5 w-5" />;
      case 'delete': return <Trash2 className="h-5 w-5" />;
      case 'correct': return <Edit3 className="h-5 w-5" />;
    }
  };

  const getRequestTypeTitle = () => {
    switch (requestType) {
      case 'access': return 'Data Access Request';
      case 'delete': return 'Data Deletion Request';
      case 'correct': return 'Data Correction Request';
    }
  };

  const getRequestTypeDescription = () => {
    switch (requestType) {
      case 'access': 
        return 'Request a copy of all personal data we have collected about you.';
      case 'delete': 
        return 'Request the deletion of all personal data we have collected about you.';
      case 'correct': 
        return 'Request corrections to inaccurate or incomplete personal data we have about you.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={handleBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">GDPR Data Request</h1>
          </div>
          
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-green-800 mb-2">Request Submitted Successfully</h3>
              <p className="text-green-700 mb-6">
                We've received your {requestType} request. Our team will process it and respond within 30 days.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setRequestType('access');
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-slate-600">
                  Under the General Data Protection Regulation (GDPR), you have the right to access, delete, or correct your personal data. Please select the type of request you'd like to make.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                  onClick={() => setRequestType('access')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    requestType === 'access' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-full ${
                      requestType === 'access' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Download className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium">Access My Data</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Request a copy of all personal data we have collected about you.
                  </p>
                </button>
                
                <button
                  onClick={() => setRequestType('delete')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    requestType === 'delete' 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-full ${
                      requestType === 'delete' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium">Delete My Data</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Request the deletion of all personal data we have collected about you.
                  </p>
                </button>
                
                <button
                  onClick={() => setRequestType('correct')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    requestType === 'correct' 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-full ${
                      requestType === 'correct' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Edit3 className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium">Correct My Data</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Request corrections to inaccurate or incomplete personal data we have about you.
                  </p>
                </button>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-lg mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  {getRequestTypeIcon()}
                  <h3 className="text-lg font-semibold text-slate-900">{getRequestTypeTitle()}</h3>
                </div>
                <p className="text-slate-600 mb-4">{getRequestTypeDescription()}</p>
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Request Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={5}
                      placeholder={
                        requestType === 'access' 
                          ? 'Please specify what data you would like to access...' 
                          : requestType === 'delete'
                          ? 'Please provide any additional details about your deletion request...'
                          : 'Please specify what data needs to be corrected and how...'
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 font-medium ${
                        requestType === 'access' 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : requestType === 'delete'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Submit Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="text-sm text-slate-500">
                <p>
                  Note: We will process your request within 30 days as required by the GDPR. We may need to verify your identity before processing your request.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataRequestForm;