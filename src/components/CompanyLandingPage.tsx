import React from 'react';
import { useNavigate } from 'react-router-dom';

const CompanyLandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400 flex flex-col items-center justify-center px-4">
      <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-10 max-w-2xl w-full text-center">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-4">Hire Top Talent with Tanktide</h1>
        <p className="text-lg text-blue-800 mb-8">
          Partner with us to access a curated pool of skilled candidates, streamline your hiring process, and grow your team with confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <button
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-8 rounded-lg text-lg shadow transition-colors"
            onClick={() => navigate('/company-signup')}
          >
            Sign Up
          </button>
          <button
            className="bg-white border border-blue-700 text-blue-700 hover:bg-blue-50 font-bold py-3 px-8 rounded-lg text-lg shadow transition-colors"
            onClick={() => navigate('/company-login')}
          >
            Log In
          </button>
        </div>
        <div className="text-blue-700 text-sm mt-4">
          <span>Are you a job seeker? </span>
          <a href="/jobs" className="underline hover:text-blue-900">Go to candidate portal</a>
        </div>
      </div>
    </div>
  );
};

export default CompanyLandingPage; 