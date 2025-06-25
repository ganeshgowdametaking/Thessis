import React, { useState, useEffect } from 'react';
import { X, Search, Users, MapPin, Building, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { connectionService } from '../services/connectionService';
import { profileService } from '../services/profileService';
import { useAuthContext } from '../contexts/AuthContext';

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  userId?: string;
}

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({ isOpen, onClose, onViewProfile, userId }) => {
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingConnectionId, setRemovingConnectionId] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
      if (userId) {
        profileService.getProfile(userId).then(setModalUser).catch(() => setModalUser(null));
      } else {
        setModalUser(user);
      }
    }
  }, [isOpen, userId]);

  useEffect(() => {
    // Filter connections based on search query
    if (searchQuery.trim()) {
      const filtered = connections.filter(connection =>
        connection.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        connection.profile.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        connection.profile.company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConnections(filtered);
    } else {
      setFilteredConnections(connections);
    }
  }, [searchQuery, connections]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      let userConnections;
      if (userId) {
        userConnections = await connectionService.getConnectionsForUser(userId);
      } else {
        userConnections = await connectionService.getConnections();
      }
      
      // Transform connections to include profile data
      const connectionsWithProfiles = userConnections
        .filter(conn => conn.status === 'accepted')
        .map(conn => {
          const isRequester = (userId ? conn.requester_id === userId : conn.requester_id === user?.id);
          const otherProfile = isRequester ? conn.addressee : conn.requester;
          
          return {
            id: conn.id,
            profile: otherProfile,
            connectedAt: conn.created_at
          };
        });
      
      setConnections(connectionsWithProfiles);
    } catch (error) {
      console.error('Error loading connections:', error);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnection = async (otherUserId: string) => {
    if (confirm('Are you sure you want to remove this connection?')) {
      setRemovingConnectionId(otherUserId);
      try {
        await connectionService.cancelConnectionRequest(otherUserId);
        await new Promise(res => setTimeout(res, 300));
        await connectionService.forceRefreshConnectionStatus(otherUserId);
        await loadConnections(); // Reload connections
      } catch (error) {
        console.error('Error removing connection:', error);
        alert('Failed to remove connection. Please try again.');
      } finally {
        setRemovingConnectionId(null);
      }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{modalUser && modalUser.full_name ? `${modalUser.full_name}'s Connections` : 'Connections'}</h2>
                <p className="text-slate-600">{connections.length} professional connections</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections by name, title, or company..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Connections List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
          ) : filteredConnections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={getProfilePicture(connection.profile)}
                      alt={connection.profile.full_name}
                      className="w-12 h-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      onClick={() => {
                        onViewProfile(connection.profile.id);
                        onClose();
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                        onClick={() => {
                          onViewProfile(connection.profile.id);
                          onClose();
                        }}
                      >
                        {connection.profile.full_name}
                      </h3>
                      <p className="text-sm text-slate-600 font-medium truncate">
                        {connection.profile.title || 'Professional'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                        {connection.profile.company && (
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{connection.profile.company}</span>
                          </div>
                        )}
                        {connection.profile.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{connection.profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-4">
                    <button
                      onClick={() => {
                        onViewProfile(connection.profile.id);
                        onClose();
                      }}
                      className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs hover:bg-slate-800 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleRemoveConnection(connection.profile.id)}
                      className={`p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ${removingConnectionId === connection.profile.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Remove Connection"
                      disabled={removingConnectionId === connection.profile.id}
                    >
                      {removingConnectionId === connection.profile.id ? (
                        <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {searchQuery ? 'No connections found' : 'No connections yet'}
              </h3>
              <p className="text-slate-600">
                {searchQuery 
                  ? 'Try adjusting your search criteria.' 
                  : 'Start connecting with professionals to build your network.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionsModal;