import React, { useState, useEffect } from 'react';
import { X, Search, Users, MapPin, Building } from 'lucide-react';
import { connectionService } from '../services/connectionService';
import { profileService } from '../services/profileService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  userId?: string;
}

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({ isOpen, onClose, onViewProfile, userId }) => {
  const { user, profile } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingConnectionId, setRemovingConnectionId] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<any>(null);
  const [connectionToRemove, setConnectionToRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
      if (userId) {
        if (user?.id && userId === user.id) {
          setModalUser(profile || user);
        } else {
          profileService.getProfileSummary(userId).then(setModalUser).catch(() => setModalUser(null));
        }
      } else {
        setModalUser(profile || user);
      }
    }
  }, [isOpen, userId, user?.id, profile]);

  useEffect(() => {
    // Filter connections based on search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const filtered = connections.filter((connection) => {
        const fullName = (connection?.profile?.full_name || '').toLowerCase();
        const title = (connection?.profile?.title || '').toLowerCase();
        const company = (connection?.profile?.company || '').toLowerCase();

        return (
          fullName.includes(query) ||
          title.includes(query) ||
          company.includes(query)
        );
      });
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
        })
        .sort((a, b) => {
          const aTime = a.connectedAt ? new Date(a.connectedAt).getTime() : 0;
          const bTime = b.connectedAt ? new Date(b.connectedAt).getTime() : 0;
          return aTime - bTime; // earliest to latest
        });
      
      setConnections(connectionsWithProfiles);
    } catch (error) {
      console.error('Error loading connections:', error);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnection = async (otherUserId: string, fullName: string) => {
    setConnectionToRemove({ id: otherUserId, name: fullName });
  };

  const confirmRemoveConnection = async () => {
    if (!connectionToRemove) return;

    const targetId = connectionToRemove.id;
    setRemovingConnectionId(targetId);
    try {
      await connectionService.cancelConnectionRequest(targetId);
      setConnections((prev) => prev.filter((conn) => conn.profile?.id !== targetId));
    } catch (error) {
      console.error('Error removing connection:', error);
      alert('Failed to remove connection. Please try again.');
    } finally {
      setRemovingConnectionId(null);
      setConnectionToRemove(null);
    }
  };

  const getProfilePicture = (profile: any) => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8B5CF6', '#06b6d4'];
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

  const formatConnectedSince = (connectedAt?: string) => {
    if (!connectedAt) return '';
    const date = new Date(connectedAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
      <div className="bg-white w-full h-[92dvh] md:h-auto rounded-t-[24px] md:rounded-lg max-w-4xl md:max-h-[90vh] overflow-hidden flex flex-col relative min-h-0">
        {/* Header */}
        <div className="px-4 py-5 md:p-6 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex items-start md:items-center space-x-3">
              <div className="hidden md:flex w-10 h-10 bg-slate-900 rounded-lg items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl leading-tight md:text-xl font-bold text-slate-900">
                  {modalUser && modalUser.full_name ? `${modalUser.full_name}'s Connections` : 'Connections'}
                </h2>
                <p className="text-slate-600 text-sm md:text-base mt-1">{connections.length} professional connections</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 -mr-1"
              aria-label="Close connections"
            >
              <X className="h-6 w-6 md:h-5 md:w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 md:p-6 border-b border-slate-200 bg-white shrink-0 sticky top-0 z-20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections by name, title, or company..."
              className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              inputMode="search"
            />
          </div>
        </div>

        {/* Connections List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] md:p-6">
          {loading ? (
            <LoadingSpinner text="Loading connections..." />
          ) : filteredConnections.length > 0 ? (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {filteredConnections.map((connection) => (
                  <div key={connection.id} className="py-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={getProfilePicture(connection.profile)}
                        alt={connection.profile.full_name}
                        className="w-12 h-12 rounded-full object-cover cursor-pointer"
                        onClick={() => {
                          onViewProfile(connection.profile.id);
                          onClose();
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            onViewProfile(connection.profile.id);
                            onClose();
                          }}
                          className="text-left w-full font-bold text-slate-900 truncate"
                        >
                          {connection.profile.full_name}
                        </button>
                        <p className="text-sm text-slate-600 font-medium truncate mt-0.5">
                          {connection.profile.title || 'Professional'}
                        </p>
                        <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          {connection.profile.company && <span className="truncate">{connection.profile.company}</span>}
                          {connection.profile.company && connection.profile.location && <span>•</span>}
                          {connection.profile.location && <span className="truncate">{connection.profile.location}</span>}
                        </div>
                        {formatConnectedSince(connection.connectedAt) && (
                          <p className="text-[11px] text-slate-400 font-medium mt-1">
                            Connected since {formatConnectedSince(connection.connectedAt)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveConnection(connection.profile.id, connection.profile.full_name)}
                        className={`h-9 px-3 inline-flex items-center justify-center text-slate-600 rounded-lg border border-slate-300 text-xs font-semibold shrink-0 ${removingConnectionId === connection.profile.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Remove Connection"
                        disabled={removingConnectionId === connection.profile.id}
                        aria-label={`Remove ${connection.profile.full_name}`}
                      >
                        {removingConnectionId === connection.profile.id ? (
                          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                        ) : (
                          'Remove'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-4">
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
                      <button
                        onClick={() => handleRemoveConnection(connection.profile.id, connection.profile.full_name)}
                        className={`h-9 px-3 inline-flex items-center justify-center text-slate-600 rounded-lg border border-slate-300 text-xs font-semibold shrink-0 ${removingConnectionId === connection.profile.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Remove Connection"
                        aria-label={`Remove ${connection.profile.full_name}`}
                        disabled={removingConnectionId === connection.profile.id}
                      >
                        {removingConnectionId === connection.profile.id ? (
                          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                        ) : (
                          'Remove'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
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

        {connectionToRemove && (
          <div className="absolute inset-0 z-30 bg-slate-900/35 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-5">
              <h3 className="text-lg font-bold text-slate-900">Remove connection</h3>
              <p className="text-sm text-slate-600 mt-2">
                Are you sure you want to remove <span className="font-semibold text-slate-900">{connectionToRemove.name}</span> from your connections?
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConnectionToRemove(null)}
                  className="h-9 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveConnection}
                  className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                  disabled={Boolean(removingConnectionId)}
                >
                  {removingConnectionId ? 'Removing...' : 'Yes, remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsModal;
