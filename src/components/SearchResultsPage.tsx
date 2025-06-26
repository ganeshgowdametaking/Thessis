import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Briefcase, Building, MapPin, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { profileService } from '../services/profileService';
import { postService } from '../services/postService';
import { connectionService } from '../services/connectionService';
import { useAuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

interface SearchResultsPageProps {
  searchQuery: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ searchQuery, onBack, onViewProfile }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('people');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState({
    people: [] as any[],
    companies: [] as { name: string }[]
  });
  const [userConnections, setUserConnections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (searchQuery) {
      performSearch();
      loadUserConnections();
    }
  }, [searchQuery]);

  const performSearch = async () => {
    try {
      setLoading(true);
      
      // Search people
      const people = await profileService.searchProfiles(searchQuery);
      
      // Search companies (unique companies from profiles)
      const companiesData = await profileService.searchProfiles('', { company: searchQuery });
      const uniqueCompanies = [...new Set(companiesData.map((profile: any) => profile.company))].filter(Boolean);
      
      setSearchResults({
        people: people || [],
        companies: uniqueCompanies.map(company => ({ name: company })) || []
      });
    } catch (error) {
      console.error('Error performing search:', error);
      setSearchResults({ people: [], companies: [] });
    } finally {
      setLoading(false);
    }
  };

  const loadUserConnections = async () => {
    try {
      const connections = await connectionService.getConnections();
      const connectionsMap: Record<string, string> = {};
      
      connections.forEach((connection: any) => {
        if (connection.requester_id === user?.id) {
          if (connection.status === 'pending') {
            connectionsMap[connection.addressee_id] = 'pending_sent';
          } else if (connection.status === 'accepted') {
            connectionsMap[connection.addressee_id] = 'connected';
          }
        } else if (connection.addressee_id === user?.id) {
          if (connection.status === 'pending') {
            connectionsMap[connection.requester_id] = 'pending_received';
          } else if (connection.status === 'accepted') {
            connectionsMap[connection.requester_id] = 'connected';
          }
        }
      });
      
      setUserConnections(connectionsMap);
    } catch (error) {
      console.error('Error loading user connections:', error);
      setUserConnections({});
    }
  };

  const handleConnect = async (userId: string) => {
    try {
      const currentStatus = userConnections[userId] || 'none';
      if (currentStatus === 'none') {
        await connectionService.sendConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        const status = await connectionService.forceRefreshConnectionStatus(userId);
        setUserConnections(prev => ({ ...prev, [userId]: status }));
      } else if (currentStatus === 'pending_sent') {
        await connectionService.cancelConnectionRequest(userId);
        await new Promise(res => setTimeout(res, 300));
        const status = await connectionService.forceRefreshConnectionStatus(userId);
        setUserConnections(prev => ({ ...prev, [userId]: status }));
      }
      await loadUserConnections();
    } catch (error) {
      console.error('Error handling connection:', error);
      await loadUserConnections();
    }
  };

  const getConnectionButtonText = (userId: string) => {
    const status = userConnections[userId] || 'none';
    switch (status) {
      case 'pending_sent': return 'Cancel Request';
      case 'connected': return 'Connected';
      case 'pending_received': return 'Accept Request';
      default: return 'Connect';
    }
  };

  const getConnectionButtonStyle = (userId: string) => {
    const status = userConnections[userId] || 'none';
    switch (status) {
      case 'connected': 
        return 'bg-green-100 text-green-800 cursor-default';
      case 'pending_sent': 
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'pending_received': 
        return 'bg-blue-600 text-white hover:bg-blue-700';
      default: 
        return 'bg-slate-900 text-white hover:bg-slate-800';
    }
  };

  const getProfilePicture = (profile: any) => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const colorIndex = profile?.id ? profile.id.charCodeAt(0) % colors.length : 0;
    const backgroundColor = colors[colorIndex];
    
    const initials = profile?.full_name
      ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';
    
    const svg = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="${backgroundColor}"/>
        <text x="75" y="85" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // UPDATED: Removed posts tab
  const tabs = [
    { id: 'people', label: 'People', count: searchResults.people.length, icon: Users },
    { id: 'companies', label: 'Companies', count: searchResults.companies.length, icon: Building }
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">Search Results</h1>
              <p className="text-slate-600 mt-1 truncate">
                Results for "{searchQuery}"
              </p>
            </div>
          </div>

          {/* Tabs - FIXED for mobile */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading ? (
            <LoadingSpinner text="Searching..." />
          ) : (
            <>
              {/* People Results */}
              {activeTab === 'people' && (
                <div className="space-y-4">
                  {searchResults.people.filter((person: any) => person.id !== user?.id).length > 0 ? (
                    searchResults.people
                      .filter((person: any) => person.id !== user?.id)
                      .map((person: any) => (
                        <div key={person.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                              <img
                                src={getProfilePicture(person)}
                                alt={person.full_name}
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex-shrink-0"
                                onClick={() => onViewProfile(person.id)}
                              />
                              <div className="min-w-0 flex-1">
                                <h3 
                                  className="text-lg sm:text-xl font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                                  onClick={() => onViewProfile(person.id)}
                                >
                                  {person.full_name}
                                </h3>
                                <p className="text-slate-600 font-medium truncate">{person.title || 'Professional'}</p>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-slate-500 mt-1 space-y-1 sm:space-y-0">
                                  {person.company && (
                                    <div className="flex items-center space-x-1">
                                      <Building className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">{person.company}</span>
                                    </div>
                                  )}
                                  {person.location && (
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">{person.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                              <button
                                onClick={() => handleConnect(person.id)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${getConnectionButtonStyle(person.id)}`}
                                disabled={userConnections[person.id] === 'connected'}
                              >
                                {getConnectionButtonText(person.id)}
                              </button>
                              <button
                                onClick={() => navigate(`/messages?user=${person.id}`)}
                                className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <MessageCircle className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                      <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-900 mb-2">No people found</h3>
                      <p className="text-slate-600">Try adjusting your search terms.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Companies Results */}
              {activeTab === 'companies' && (
                <div className="space-y-4">
                  {searchResults.companies.length > 0 ? (
                    searchResults.companies.map((company: any, index: number) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                            <Building className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{company.name}</h3>
                            <p className="text-slate-600">Company</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                      <Building className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-900 mb-2">No companies found</h3>
                      <p className="text-slate-600">Try adjusting your search terms.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;