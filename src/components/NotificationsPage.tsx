import React, { useState, useEffect } from 'react';
import { Bell, Users, Briefcase, Heart, MessageCircle, UserPlus, CheckCircle, TrendingUp, DollarSign, AlertTriangle, Rocket, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { connectionService } from '../services/connectionService';
import { profileService } from '../services/profileService';
import { postService } from '../services/postService';
import { blockingService } from '../services/blockingService';
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
      
      // TODO: Re-implement notification filtering with proper user identification
      // For now, disable filtering to restore notification functionality
      // const filteredNotifications = await blockingService.filterBlockedUsers(dedupedNotifications || []);
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
        return <UserPlus className="h-5 w-5" />;
      case 'job':
      case 'referral':
        return <Rocket className="h-5 w-5" />;
      case 'like':
        return <Heart className="h-5 w-5" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5" />;
      case 'payout':
        return <DollarSign className="h-5 w-5" />;
      case 'analytics':
        return <TrendingUp className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
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
      <div className="bg-stone font-display text-slate-body transition-colors duration-200 min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading notifications..." />
      </div>
    );
  }

  // Group notifications by date
  const groupNotificationsByDate = (notifications: any[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { [key: string]: any[] } = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    };

    notifications.forEach(notification => {
      const notifDate = new Date(notification.created_at);
      const isToday = notifDate.toDateString() === today.toDateString();
      const isYesterday = notifDate.toDateString() === yesterday.toDateString();
      const isLastWeek = notifDate >= lastWeek && !isToday && !isYesterday;

      if (isToday) {
        groups.today.push(notification);
      } else if (isYesterday) {
        groups.yesterday.push(notification);
      } else if (isLastWeek) {
        groups.lastWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <div className="bg-stone font-display text-slate-body transition-colors duration-200 min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-[800px] mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Notifications</h1>
            <p className="text-slate-500 font-medium">
              You have <span className="text-slate-900 font-bold">{unreadCount} unread</span> messages requiring attention.
            </p>
          </div>
          <button 
            onClick={handleMarkAllAsRead}
            className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-header text-sm font-bold text-slate-900 hover:bg-stone-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <CheckCircle className="text-[18px] text-slate-500 group-hover:text-sage transition-colors" />
            <span>Mark all as read</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 border-b border-stone-header">
          <div className="flex gap-6 overflow-x-auto pb-[1px]">
            <button 
              onClick={() => setFilter('all')}
              className={`relative pb-3 text-sm font-bold transition-colors whitespace-nowrap ${
                filter === 'all' 
                  ? 'text-sage border-b-2 border-sage' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:border-stone-300'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('unread')}
              className={`relative pb-3 text-sm font-bold transition-colors whitespace-nowrap ${
                filter === 'unread' 
                  ? 'text-sage border-b-2 border-sage' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:border-stone-300'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center bg-stone-off text-slate-500 text-[10px] h-5 min-w-5 px-1.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setFilter('connection')}
              className={`relative pb-3 text-sm font-bold transition-colors whitespace-nowrap ${
                filter === 'connection' 
                  ? 'text-sage border-b-2 border-sage' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:border-stone-300'
              }`}
            >
              Referrals
            </button>
            <button 
              onClick={() => setFilter('job')}
              className={`relative pb-3 text-sm font-bold transition-colors whitespace-nowrap ${
                filter === 'job' 
                  ? 'text-sage border-b-2 border-sage' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent hover:border-stone-300'
              }`}
            >
              System
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex flex-col gap-8">
          {/* Today */}
          {groupedNotifications.today.length > 0 && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pl-1">Today</h3>
              <div className="flex flex-col gap-3">
                {groupedNotifications.today.map((notification) => (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification} 
                    onAcceptConnection={handleAcceptConnection}
                    onDeclineConnection={handleDeclineConnection}
                    onMarkAsRead={handleMarkAsRead}
                    onProfileClick={handleProfileClick}
                    onDeleteNotification={handleDeleteNotification}
                    onLikeToggle={handleLikeToggle}
                    likedPosts={likedPosts}
                    getProfilePicture={getProfilePicture}
                    getNotificationIcon={getNotificationIcon}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Yesterday */}
          {groupedNotifications.yesterday.length > 0 && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pl-1">Yesterday</h3>
              <div className="flex flex-col gap-3">
                {groupedNotifications.yesterday.map((notification) => (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification} 
                    onAcceptConnection={handleAcceptConnection}
                    onDeclineConnection={handleDeclineConnection}
                    onMarkAsRead={handleMarkAsRead}
                    onProfileClick={handleProfileClick}
                    onDeleteNotification={handleDeleteNotification}
                    onLikeToggle={handleLikeToggle}
                    likedPosts={likedPosts}
                    getProfilePicture={getProfilePicture}
                    getNotificationIcon={getNotificationIcon}
                    isRead={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Last Week */}
          {groupedNotifications.lastWeek.length > 0 && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pl-1">Last Week</h3>
              <div className="flex flex-col gap-3">
                {groupedNotifications.lastWeek.map((notification) => (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification} 
                    onAcceptConnection={handleAcceptConnection}
                    onDeclineConnection={handleDeclineConnection}
                    onMarkAsRead={handleMarkAsRead}
                    onProfileClick={handleProfileClick}
                    onDeleteNotification={handleDeleteNotification}
                    onLikeToggle={handleLikeToggle}
                    likedPosts={likedPosts}
                    getProfilePicture={getProfilePicture}
                    getNotificationIcon={getNotificationIcon}
                    isRead={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-stone-off rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No notifications found</h3>
              <p className="text-slate-500">You're all caught up!</p>
            </div>
          )}
        </div>

        {/* End of notifications */}
        {filteredNotifications.length > 0 && (
          <div className="h-20 flex items-center justify-center mt-8">
            <p className="text-slate-500 text-sm font-medium">End of notifications</p>
          </div>
        )}
      </main>
    </div>
  );
};

// Notification Card Component
interface NotificationCardProps {
  notification: any;
  onAcceptConnection: (notificationId: string, connectionId?: string) => void;
  onDeclineConnection: (notificationId: string, connectionId?: string) => void;
  onMarkAsRead: (notificationId: string) => void;
  onProfileClick: (userId: string) => void;
  onDeleteNotification: (notificationId: string) => void;
  onLikeToggle: (postId: string) => void;
  likedPosts: Set<string>;
  getProfilePicture: (profile: any) => string;
  getNotificationIcon: (type: string) => JSX.Element;
  isRead?: boolean;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAcceptConnection,
  onDeclineConnection,
  onMarkAsRead,
  onProfileClick,
  onDeleteNotification,
  onLikeToggle,
  likedPosts,
  getProfilePicture,
  getNotificationIcon,
  isRead = false
}) => {
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const notifDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - notifDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} mins ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hours ago`;
    } else {
      return notifDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const isUnread = !notification.read && !isRead;

  return (
    <div className={`group relative flex items-start gap-4 p-5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-sage/30 transition-all duration-300 cursor-pointer ${
      isUnread ? 'opacity-100' : 'opacity-80 hover:opacity-100'
    }`}>
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-0 top-6 w-1 h-8 bg-sage rounded-r-full"></div>
      )}

      {/* Avatar or Icon */}
      <div className="shrink-0 relative">
        {notification.actorProfile ? (
          <>
            <img 
              className="size-12 rounded-full object-cover border border-stone-off" 
              src={getProfilePicture(notification.actorProfile)}
              alt={notification.actorProfile.full_name}
              onClick={() => onProfileClick(notification.actorProfile.id)}
            />
            {notification.type === 'connection' && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                <div className="bg-stone-off rounded-full p-0.5">
                  <UserPlus className="text-sage text-[16px]" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center size-12 rounded-full bg-stone-off text-slate-500">
            {getNotificationIcon(notification.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1">
          <p className="text-slate-900 text-base leading-snug">
            {notification.actorProfile ? (
              <>
                <span className="font-bold">{notification.actorProfile.full_name}</span>
                {notification.type === 'connection' && ' accepted your referral for '}
                {notification.type === 'like' && ' liked your post'}
                {notification.type === 'comment' && ' commented on your post'}
                {notification.type === 'connection' && (
                  <span className="font-bold">Senior UX Designer</span>
                )}
              </>
            ) : (
              <span className="font-medium">{notification.message || notification.title}</span>
            )}
          </p>
          <span className="shrink-0 text-xs font-medium text-slate-500 whitespace-nowrap">
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>

        {/* Description */}
        {(notification.message || notification.actorProfile) && (
          <p className="text-slate-body text-sm mt-1 line-clamp-2">
            {notification.type === 'connection' && notification.actorProfile 
              ? "Great news! Sarah has moved to the screening stage. You can now track her progress in your dashboard."
              : notification.message
            }
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-4">
          {notification.actionable && notification.type === 'connection' ? (
            <>
              <button
                onClick={() => onAcceptConnection(notification.id, notification.metadata?.connection_id)}
                className="text-sm font-bold text-sage hover:text-sage-olive transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => onDeclineConnection(notification.id, notification.metadata?.connection_id)}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Decline
              </button>
            </>
          ) : (
            <button className="text-sm font-bold text-sage hover:text-sage-olive transition-colors">
              {notification.type === 'connection' ? 'View Application' : 
               notification.type === 'analytics' ? 'Review Matches' :
               notification.type === 'payout' ? 'View Details' : 'View'}
            </button>
          )}
        </div>
      </div>

      {/* Chevron for older notifications */}
      {isRead && (
        <div className="shrink-0 self-center hidden sm:block">
          <ChevronRight className="text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;