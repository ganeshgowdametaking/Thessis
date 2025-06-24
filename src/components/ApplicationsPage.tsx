import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, FileText, MessageCircle, CheckCircle, Calendar, MapPin, Briefcase, Filter, Search, Download, Eye, Mail, Phone, X } from 'lucide-react';
import { applicationService } from '../services/applicationService';
import { useAuthContext } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';
import { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];

interface ApplicationsPageProps {
  onBack: () => void;
  onMessage: (applicantId: number) => void;
  referralId: string;
  referralTitle: string;
}

const ApplicationsPage: React.FC<ApplicationsPageProps> = ({ onBack, onMessage, referralId, referralTitle }) => {
  const { user } = useAuthContext();
  
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<any>(null);

  // Load applications when component mounts
  useEffect(() => {
    loadApplications();
  }, [referralId]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading applications for job ID:', referralId);
      
      const applicationsData = await applicationService.getJobApplications(referralId);
      
      console.log('Raw applications data:', applicationsData);
      
      // Transform the data to match the expected format
      const transformedApplications = applicationsData.map((app: any) => ({
        id: app.id,
        applicantId: app.applicant_id,
        status: app.status,
        appliedDate: formatTimeAgo(app.applied_at),
        coverLetter: app.cover_letter,
        resumeUrl: app.resume_url,
        shortlisted: app.shortlisted,
        rating: app.rating,
        notes: app.notes,
        // Applicant data from the join
        applicant: {
          name: app.applicant?.full_name || 'Unknown Applicant',
          title: app.applicant?.title || 'No Title',
          company: app.applicant?.company || 'No Company',
          location: app.applicant?.location || 'No Location',
          avatar: app.applicant?.avatar_url || '/default-avatar.png',
          bio: app.applicant?.bio || 'No bio available'
        },
        // Education/background info (using bio as fallback)
        education: app.applicant?.bio || 'No background information available'
      }));
      
      console.log('Transformed applications:', transformedApplications);
      setApplications(transformedApplications);
    } catch (error: any) {
      console.error('Error loading applications:', error);
      setError(error.message || 'Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  };

  const handleShortlist = async (applicationId: number) => {
    try {
      console.log('Shortlisting application:', applicationId);
      
      await applicationService.shortlistApplication(applicationId.toString());
      
      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId 
          ? { ...app, shortlisted: true, status: 'shortlisted' }
          : app
      ));
      
      // Show success notification
      const applicant = applications.find(app => app.id === applicationId);
      if (applicant) {
        alert(`✅ ${applicant.applicant.name} has been shortlisted! They will be notified via email.`);
      }
    } catch (error) {
      console.error('Error shortlisting application:', error);
      alert('Failed to shortlist application. Please try again.');
    }
  };

  const handleViewResume = (applicationId: number) => {
    const application = applications.find(app => app.id === applicationId);
    if (application) {
      setCurrentApplication(application);
      setShowResumeModal(true);
    }
  };

  const handleMessage = (application: any) => {
    // Pass the actual applicant ID instead of application ID
    console.log('Opening message for applicant:', application.applicantId);
    onMessage(application.applicantId);
  };

  // UPDATED: Handle profile navigation
  const handleViewProfile = (applicantId: string) => {
    // Dispatch custom event to navigate to user profile
    window.dispatchEvent(new CustomEvent('navigate-to-profile', { 
      detail: { userId: applicantId } 
    }));
  };

  // UPDATED: Sort applications with shortlisted at the top
  const filteredApplications = applications
    .filter(app => {
      // UPDATED: Remove "rejected" filter completely
      const matchesFilter = selectedFilter === 'all' || 
                           (selectedFilter === 'pending' && app.status === 'pending') ||
                           (selectedFilter === 'shortlisted' && app.status === 'shortlisted');
      const matchesSearch = app.applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.applicant.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by shortlisted status first (shortlisted at top), then by application date
      if (a.shortlisted && !b.shortlisted) return -1;
      if (!a.shortlisted && b.shortlisted) return 1;
      return 0; // Keep original order for same shortlist status
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shortlisted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  // UPDATED: Remove "rejected" filter from filter options
  const filterOptions = [
    { value: 'all', label: 'All Applications', count: applications.length },
    { value: 'pending', label: 'Pending', count: applications.filter(a => a.status === 'pending').length },
    { value: 'shortlisted', label: 'Shortlisted', count: applications.filter(a => a.status === 'shortlisted').length }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Applications</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={loadApplications}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={onBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Applications</h1>
              <p className="text-slate-600 mt-1 truncate">
                {referralTitle} • {filteredApplications.length} applications
              </p>
            </div>
          </div>

          {/* Search and Filter Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, title, or skills..."
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>

          {/* Filter Options (shown when filter button is clicked) */}
          {showFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-lg">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFilter(option.value)}
                  className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
                    selectedFilter === option.value
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    selectedFilter === option.value
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}>
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length > 0 ? (
            filteredApplications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex items-start space-x-4 min-w-0 flex-1">
                    {/* UPDATED: Make profile picture clickable */}
                    <img
                      src={application.applicant.avatar}
                      alt={application.applicant.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-shrink-0"
                      onClick={() => handleViewProfile(application.applicantId)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                        {/* UPDATED: Make username clickable */}
                        <h3 
                          className="text-lg sm:text-xl font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                          onClick={() => handleViewProfile(application.applicantId)}
                        >
                          {application.applicant.name}
                        </h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium mt-1 sm:mt-0 self-start ${getStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                      </div>
                      <p className="text-base sm:text-lg text-slate-600 font-medium mb-1 truncate">{application.applicant.title}</p>
                      <p className="text-slate-500 mb-2 truncate">{application.applicant.company}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-sm text-slate-500 space-y-1 sm:space-y-0">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{application.applicant.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Applied {application.appliedDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Education */}
                <div className="mt-4 sm:mt-6">
                  <h4 className="font-medium text-slate-900 mb-1">Background</h4>
                  <p className="text-slate-600 text-sm">{application.education}</p>
                  {application.coverLetter && (
                    <div className="mt-2">
                      <h4 className="font-medium text-slate-900 mb-1">Cover Letter</h4>
                      <p className="text-slate-600 text-sm">{application.coverLetter}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6">
                  {application.shortlisted ? (
                    <div className="bg-green-100 text-green-800 px-4 sm:px-6 py-2 rounded-lg flex items-center justify-center space-x-2 font-medium">
                      <CheckCircle className="h-4 w-4" />
                      <span>Shortlisted</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleShortlist(application.id)}
                      className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-medium"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Shortlist</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleViewResume(application.id)}
                    className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View Resume</span>
                  </button>
                  <button
                    onClick={() => handleMessage(application)}
                    className="bg-slate-900 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 font-medium"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Message</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No applications found</h3>
              <p className="text-slate-600">
                {searchQuery || selectedFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'No applications have been submitted for this referral yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Resume Modal */}
      {showResumeModal && currentApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <img
                    src={currentApplication.applicant.avatar}
                    alt={currentApplication.applicant.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{currentApplication.applicant.name}</h3>
                    <p className="text-slate-600 truncate">{currentApplication.applicant.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResumeModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Contact Information */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-bold text-slate-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-700 truncate">{currentApplication.applicant.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-700">{currentApplication.applicant.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-700 truncate">{currentApplication.applicant.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-700 truncate">{currentApplication.applicant.company}</span>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              {currentApplication.coverLetter && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-bold text-slate-900 mb-3">Cover Letter</h4>
                  <p className="text-slate-700 leading-relaxed">{currentApplication.coverLetter}</p>
                </div>
              )}

              {/* Resume Section */}
              <div className="bg-slate-50 rounded-lg p-6 sm:p-8 text-center">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-slate-900 mb-2">Resume Document</h4>
                {currentApplication.resumeUrl ? (
                  <>
                    <p className="text-slate-600 mb-4">
                      Resume file: {currentApplication.resumeUrl.split('/').pop()}
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => window.open(currentApplication.resumeUrl, '_blank')}
                        className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Resume</span>
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = currentApplication.resumeUrl;
                          link.download = `${currentApplication.applicant.name}_Resume.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="bg-slate-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Resume</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500">
                    <p className="mb-4">No resume file uploaded</p>
                    <p className="text-sm">The applicant did not upload a resume file with their application.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;