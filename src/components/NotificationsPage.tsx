import React, { useState, useEffect } from 'react';
import { Bell, Users, Briefcase, Heart, MessageCircle, UserPlus, CheckCircle, Calendar, MapPin, Star, Filter, Search, Download, Eye, Mail, Phone, X, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { connectionService } from '../services/connectionService';
import { profileService } from '../services/profileService';
import { postService } from '../services/postService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface NotificationsPageProps {
  onViewProfile?: (userId: string) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onViewProfile }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    loadNotifications();
    loadUserLikes();
    // Update the global notification count when component loads
    if (window.refreshUnreadCounts) window.refreshUnreadCounts();
  }, []); // Empty dependency array

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading notifications...');
      
      const userNotifications = await notificationService.getNotifications();
      console.log('📊 Received notifications:', userNotifications);
      
      // Debug connection notifications specifically
      const connectionNotifications = userNotifications.filter(n => n.type === 'connection');
      console.log('🔗 Connection notifications found:', connectionNotifications.length);
      connectionNotifications.forEach((notif, index) => {
        console.log(`🔗 Connection notification ${index + 1}:`, {
          id: notif.id,
          type: notif.type,
          metadata: notif.metadata,
          metadataType: typeof notif.metadata,
          actionable: notif.actionable,
          read: notif.read
        });
      });
      
      // Enhance notifications with user profile data
      const enhancedNotifications = await Promise.all(
        userNotifications.map(async (notification) => {
          try {
            // Extract user ID from metadata for likes and comments
            let actorUserId = null;
            if (notification.metadata?.liker_id) {
              actorUserId = notification.metadata.liker_id;
            } else if (notification.metadata?.commenter_id) {
              actorUserId = notification.metadata.commenter_id;
            } else if (notification.metadata?.requester_id) {
              actorUserId = notification.metadata.requester_id;
            }

            if (actorUserId) {
              const actorProfile = await profileService.getProfile(actorUserId);
              return {
                ...notification,
                actorProfile
              };
            }
            
            return notification;
          } catch (error) {
            console.warn('Failed to load actor profile for notification:', notification.id);
            return notification;
          }
        })
      );
      
      // DEDUPLICATE CONNECTION NOTIFICATIONS: Only show the latest per user-pair
      const dedupedNotifications: any[] = [];
      const connectionPairs = new Map();
      for (const notif of enhancedNotifications) {
        if (notif.type === 'connection' && notif.metadata?.requester_id && notif.user_id) {
          const ids = [notif.metadata.requester_id, notif.user_id].sort();
          const pairKey = ids.join('_');
          if (!connectionPairs.has(pairKey)) {
            connectionPairs.set(pairKey, true);
            dedupedNotifications.push(notif);
          }
        } else {
          dedupedNotifications.push(notif);
        }
      }
      setNotifications(dedupedNotifications || []);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLikes = async () => {
    try {
      const userLikesData = await postService.getUserLikes();
      const likedPostIds = new Set<string>(userLikesData.map((like: any) => like.post_id));
      setLikedPosts(likedPostIds);
    } catch (error) {
      console.error('Error loading user likes:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadNotifications();
      await loadUserLikes();
      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ENHANCED: Handle like toggle with duplicate handling
  const handleLikeToggle = async (postId: string) => {
    if (!postId) return;

    try {
      const isCurrentlyLiked = likedPosts.has(postId);
      
      if (isCurrentlyLiked) {
        // Unlike the post
        await postService.removeUserLike(postId);
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        // Like the post
        const result = await postService.createUserLike(postId);
        // Only update UI if it's a new like (not a duplicate)
        if (result.isNewLike) {
          setLikedPosts(prev => new Set(prev).add(postId));
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Optionally show user feedback
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'connection':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'job':
      case 'referral':
        return <Briefcase className="h-5 w-5 text-green-600" />;
      case 'like':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-slate-300';
    }
  };

  // Helper function to get profile picture with fallback
  const getProfilePicture = (profile: any) => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    
    // Create a simple colored background based on user ID
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const colorIndex = profile?.id ? profile.id.charCodeAt(0) % colors.length : 0;
    const backgroundColor = colors[colorIndex];
    
    // Get initials
    const initials = profile?.full_name
      ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';
    
    // Return a simple SVG data URL
    const svg = `
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="${backgroundColor}"/>
        <text x="75" y="85" font-family="Arial, sans-serif" font-size="60" font-weight="bold" text-anchor="middle" fill="white">${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const handleAcceptConnection = async (notificationId: string, connectionId?: string) => {
    try {
      if (connectionId) {
        await connectionService.acceptConnectionRequest(connectionId);
      }
      
      // Update notification in local state to show connected message and non-actionable
      setNotifications(notifications => notifications.map(notif =>
        notif.id === notificationId
          ? {
              ...notif,
              message: `You are now connected with ${notif.actorProfile?.full_name || 'this user'}`,
              actionable: false,
              read: true
            }
          : notif
      ));
      await notificationService.markAsReadAndNonActionable(notificationId);
      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection. Please try again.');
    }
  };

  const handleDeclineConnection = async (notificationId: string, connectionId?: string) => {
    try {
      if (connectionId) {
        await connectionService.declineConnectionRequest(connectionId);
      }
      // Remove notification
      await notificationService.deleteNotification(notificationId);
      // Reload notifications
      await loadNotifications();
      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error declining connection:', error);
      alert('Failed to decline connection. Please try again.');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(notifications.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      ));
      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleProfileClick = (userId: string) => {
    // Navigate directly to the user's profile page
    navigate(`/user/${userId}`);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(notifications => notifications.filter(notif => notif.id !== notificationId));
      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification. Please try again.');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    return notif.type === filter;
  });

  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Debug logging for render
  console.log('🔄 NotificationsPage render - forceUpdate:', forceUpdate);
  console.log('📊 Current notifications count:', notifications.length);
  console.log('🔍 Filtered notifications count:', filteredNotifications.length);
  console.log('📋 All notifications:', notifications);

  const filterOptions = [
    { value: 'all', label: 'All', count: notifications.length, icon: Bell },
    { value: 'unread', label: 'Unread', count: unreadCount, icon: Filter },
    { value: 'connection', label: 'Connections', count: notifications.filter(n => n.type === 'connection').length, icon: Users },
    { value: 'job', label: 'Jobs', count: notifications.filter(n => n.type === 'job' || n.type === 'referral').length, icon: Briefcase }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Notifications</h1>
                <p className="text-slate-600 text-sm sm:text-base">
                  {unreadCount > 0 ? `${unreadCount} new notifications` : 'All caught up!'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center space-x-2 disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="bg-slate-900 text-white px-3 sm:px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-2 font-medium text-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Mark all as read</span>
                  <span className="sm:hidden">Mark all</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs - FIXED for mobile */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ${
                  filter === option.value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <option.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sm:hidden">{option.label.slice(0, 3)}</span>
                {option.count > 0 && (
                  <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-bold ${
                    filter === option.value
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}>
                    {option.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 transition-all relative ${
                  !notification.read ? `border-l-4 ${getPriorityColor(notification.priority)} bg-slate-50` : ''
                }`}
              >
                {/* Delete Button - Positioned at top-right */}
                <button
                  onClick={() => handleDeleteNotification(notification.id)}
                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-600 transition-colors z-10"
                  aria-label="Delete notification"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-start space-x-3 sm:space-x-4">
                  {/* Profile Picture or Icon */}
                  <div className="flex-shrink-0">
                    {notification.actorProfile ? (
                      <img
                        src={getProfilePicture(notification.actorProfile)}
                        alt={notification.actorProfile.full_name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        onClick={() => handleProfileClick(notification.actorProfile.id)}
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          {notification.actorProfile ? (
                            <div className="flex items-center space-x-2 flex-wrap">
                              <h3 
                                className={`font-bold cursor-pointer hover:text-blue-600 transition-colors text-sm sm:text-base ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}
                                onClick={() => handleProfileClick(notification.actorProfile.id)}
                              >
                                {notification.actorProfile.full_name}
                              </h3>
                              {notification.type === 'like' && (
                                <span className="text-slate-600 text-sm">liked your post:</span>
                              )}
                              {notification.type === 'comment' && (
                                <span className="text-slate-600 text-sm">commented on your post:</span>
                              )}
                            </div>
                          ) : (
                            <h3 className={`font-bold text-sm sm:text-base ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                              {notification.title}
                            </h3>
                          )}
                          {notification.priority === 'high' && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0">
                              High Priority
                            </span>
                          )}
                        </div>
                        
                        {/* Enhanced message display for likes and comments */}
                        {notification.actorProfile && (notification.type === 'like' || notification.type === 'comment') ? (
                          <div className="mb-3">
                            <p className="text-slate-600 leading-relaxed text-sm">
                              {notification.type === 'like' && (
                                <>
                                  <span className="font-medium">"{notification.message.split(': "')[1]?.replace('"', '') || 'your post'}"</span>
                                </>
                              )}
                              {notification.type === 'comment' && (
                                <>
                                  <span className="font-medium">"{notification.message.split(': "')[1]?.replace('"', '') || 'your post'}"</span>
                                </>
                              )}
                            </p>
                            
                            {/* FIXED: Functional Like Button for Like Notifications */}
                            {notification.type === 'like' && notification.metadata?.post_id && (
                              <div className="mt-3 flex items-center space-x-2">
                                <button
                                  onClick={() => handleLikeToggle(notification.metadata.post_id)}
                                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    likedPosts.has(notification.metadata.post_id)
                                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <Heart 
                                    className={`h-4 w-4 ${
                                      likedPosts.has(notification.metadata.post_id) 
                                        ? 'fill-current text-red-600' 
                                        : 'text-slate-400'
                                    }`} 
                                  />
                                  <span>
                                    {likedPosts.has(notification.metadata.post_id) ? 'Liked' : 'Like back'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-600 mb-3 leading-relaxed text-sm">{notification.message}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 flex-wrap">
                          <span className="text-xs sm:text-sm text-slate-500 font-medium">
                            {new Date(notification.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notification Status Indicator */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {notification.actionable && notification.type === 'connection' && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
                        <button
                          onClick={() => handleAcceptConnection(notification.id, notification.metadata?.connection_id)}
                          className="bg-slate-900 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineConnection(notification.id, notification.metadata?.connection_id)}
                          className="bg-slate-200 text-slate-700 px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {notification.actionable && (notification.type === 'job' || notification.type === 'referral') && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
                        <button className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                          View Job
                        </button>
                        <button 
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="bg-slate-200 text-slate-700 px-4 sm:px-6 py-2 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No notifications found</h3>
              <p className="text-slate-600 mb-4 text-sm sm:text-base">
                {filter === 'all' 
                  ? 'You\'re all caught up! Check back later for new notifications.' 
                  : `No ${filter} notifications at the moment.`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;