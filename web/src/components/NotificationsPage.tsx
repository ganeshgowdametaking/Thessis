import React, { useState, useEffect } from 'react';
import { Bell, Briefcase, Heart, MessageCircle, UserPlus, CheckCircle, TrendingUp, DollarSign, AlertTriangle, Rocket, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { connectionService } from '../services/connectionService';
import { profileService } from '../services/profileService';
import { useAuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { hireVerificationService, HireVerificationRequest } from '../services/hireVerificationService';
import { VerificationCard } from './VerificationCard';

const NotificationsPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<HireVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    // Update the global notification count when component loads
    if (window.refreshUnreadCounts) window.refreshUnreadCounts();
  }, []); // Empty dependency array

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading notifications...');

      const [userNotifications, pendingVerifications] = await Promise.all([
        notificationService.getNotifications() as Promise<any[]>,
        user ? hireVerificationService.getPendingVerifications(user.id) : Promise.resolve([])
      ]);

      setVerifications(pendingVerifications as HireVerificationRequest[]);
      console.log('📊 Received notifications:', userNotifications);

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

      // Viewing this page counts as "seen" — clear the unread badge even if
      // the user doesn't act on a notification (e.g. a connection request).
      const hasUnread = dedupedNotifications.some((notif: any) => !notif.read);
      if (hasUnread) {
        await notificationService.markAllAsRead();
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_application':
        return <Briefcase className="h-5 w-5" />;
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

  // Helper function to get profile picture with fallback
  const getProfilePicture = (profile: any) => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }

    return '/default-avatar.svg';
  };

  const handleAcceptConnection = async (notificationId: string, connectionId?: string) => {
    console.log('✅ Accepting connection:', { notificationId, connectionId });
    try {
      // Optimistically remove the notification from the list
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

      if (connectionId) {
        await connectionService.acceptConnectionRequest(connectionId);
      }

      // Delete the notification from the database as well so it's gone for good
      await notificationService.deleteNotification(notificationId);

      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection properly, but the notification will be removed.');
      loadNotifications(); // Reload to be sure
    }
  };

  const handleDeclineConnection = async (notificationId: string, connectionId?: string) => {
    console.log('🚮 Declining connection:', { notificationId, connectionId });
    try {
      // Optimistically remove the notification from the list
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

      if (connectionId) {
        console.log('🔄 Calling connectionService.declineConnectionRequest for:', connectionId);
        const result = await connectionService.declineConnectionRequest(connectionId);
        console.log('✅ Decline connection result:', result);
      } else {
        console.warn('⚠️ No connectionId found, only deleting notification:', notificationId);
        await notificationService.deleteNotification(notificationId);
      }

      // Explicitly delete the notification as well to be 100% sure
      // (The RPC should have done it, but this is a double-check)
      try {
        await notificationService.deleteNotification(notificationId);
      } catch (e) {
        // Ignore if already deleted
      }

      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error: any) {
      console.error('❌ Error declining connection:', error);
      // Revert if it's a real failure, but often it might just be the notification already gone
      if (!error.message?.includes('not found')) {
        alert(`Failed to decline connection properly: ${error.message || 'Unknown error'}`);
        loadNotifications();
      }
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

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    if (filter === 'connection') return notif.type === 'connection' || notif.type === 'job_application' || notif.type === 'referral';
    return notif.type === filter;
  });

  const unreadCount = notifications.filter(notif => !notif.read).length;

  // Debug logging for render
  console.log('🔄 NotificationsPage render');
  console.log('📊 Current notifications count:', notifications.length);
  console.log('🔍 Filtered notifications count:', filteredNotifications.length);
  console.log('📋 All notifications:', notifications);

  if (loading) {
    return (
      <div className="bg-stone-bg font-display text-slate-body transition-colors duration-200 min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading notifications..." />
      </div>
    );
  }

  const handleNotificationClick = (notification: any) => {
    // If it's a connection request, maybe stay on page or view profile
    if (notification.type === 'connection' && notification.metadata?.requester_id) {
      navigate(`/user/${notification.metadata.requester_id}`);
    } else if (notification.type === 'job_application' && notification.metadata?.job_id) {
      navigate(`/applications/${notification.metadata.job_id}`);
    } else if (notification.type === 'like' || notification.type === 'comment') {
      // If we have post_id in metadata, we could navigate to that post
      // For now, maybe just stay here or implement post view
      if (notification.metadata?.post_id) {
        // Assume there's a way to view a single post, e.g. jobs page with a search or filter
        navigate('/jobs');
      }
    } else if (notification.type === 'payout') {
      navigate('/settings'); // Or wherever payouts are handled
    } else if (notification.type === 'analytics') {
      navigate('/analytics');
    }

    // Mark as read when clicked
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

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
    <div className="bg-stone-bg font-display text-slate-body transition-colors duration-200 min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-[800px] mx-auto px-4 py-5 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-5 md:mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900">Notifications</h1>

          </div>
          <button
            onClick={handleMarkAllAsRead}
            className="group inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white border border-stone-header text-sm font-bold text-slate-900 hover:bg-stone-50 hover:border-slate-300 transition-all w-full md:w-auto"
          >
            <CheckCircle className="text-[18px] text-slate-500 group-hover:text-sage transition-colors" />
            <span>Mark all as read</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-5 md:mb-8">
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`h-9 px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap border ${filter === 'all'
                ? 'bg-ink text-white border-[#4353FF]'
                : 'bg-white text-slate-600 border-stone-header hover:border-slate-300'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`h-9 px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap border inline-flex items-center ${filter === 'unread'
                ? 'bg-ink text-white border-[#4353FF]'
                : 'bg-white text-slate-600 border-stone-header hover:border-slate-300'
                }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className={`ml-2 inline-flex items-center justify-center text-[10px] h-5 min-w-5 px-1.5 rounded-full ${filter === 'unread'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-off text-slate-500'
                  }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Verification Requests Section */}
        {verifications.length > 0 && filter === 'all' && (
          <div className="mb-5 md:mb-8">
            <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-amber-500 text-[20px] filled">star</span>
              Action Required
            </h3>
            <div className="space-y-3 md:space-y-4">
              {verifications.map(req => (
                <VerificationCard
                  key={req.id}
                  request={req}
                  onResponse={loadNotifications}
                />
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="flex flex-col gap-6 md:gap-8">
          {/* Today */}
          {groupedNotifications.today.length > 0 && (
            <section>
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 md:mb-4 pl-1">Today</h3>
              <div className="flex flex-col gap-2.5 md:gap-3">
                {groupedNotifications.today.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onAcceptConnection={handleAcceptConnection}
                    onDeclineConnection={handleDeclineConnection}
                    onProfileClick={handleProfileClick}
                    getProfilePicture={getProfilePicture}
                    getNotificationIcon={getNotificationIcon}
                    onNotificationClick={(notif) => handleNotificationClick(notif)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Yesterday */}
          {groupedNotifications.yesterday.length > 0 && (
            <section>
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 md:mb-4 pl-1">Yesterday</h3>
              <div className="flex flex-col gap-2.5 md:gap-3">
                {groupedNotifications.yesterday.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onAcceptConnection={handleAcceptConnection}
                    onDeclineConnection={handleDeclineConnection}
                    onProfileClick={handleProfileClick}
                    getProfilePicture={getProfilePicture}
                    getNotificationIcon={getNotificationIcon}
                    onNotificationClick={(notif) => handleNotificationClick(notif)}
                    isRead={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Last Week */}
          {groupedNotifications.lastWeek.length > 0 && (
            <section>
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 md:mb-4 pl-1">Last Week</h3>
              <div className="flex flex-col gap-2.5 md:gap-3">
                {groupedNotifications.lastWeek.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onAcceptConnection={handleAcceptConnection}
                    onDeclineConnection={handleDeclineConnection}
                    onProfileClick={handleProfileClick}
                    getProfilePicture={getProfilePicture}
                    getNotificationIcon={getNotificationIcon}
                    onNotificationClick={(notif) => handleNotificationClick(notif)}
                    isRead={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Older */}
          {groupedNotifications.older.length > 0 && (
            <section>
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 md:mb-4 pl-1">Older</h3>
              <div className="flex flex-col gap-2.5 md:gap-3">
                {groupedNotifications.older.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onAcceptConnection={handleAcceptConnection}
                    onDeclineConnection={handleDeclineConnection}
                    onProfileClick={handleProfileClick}
                    getProfilePicture={getProfilePicture}
                    getNotificationIcon={getNotificationIcon}
                    onNotificationClick={(notif) => handleNotificationClick(notif)}
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

      </main>
    </div>
  );
};

// Notification Card Component
interface NotificationCardProps {
  notification: any;
  onAcceptConnection: (notificationId: string, connectionId?: string) => void;
  onDeclineConnection: (notificationId: string, connectionId?: string) => void;
  onProfileClick: (userId: string) => void;
  getProfilePicture: (profile: any) => string;
  getNotificationIcon: (type: string) => JSX.Element;
  onNotificationClick: (notification: any) => void;
  isRead?: boolean;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onAcceptConnection,
  onDeclineConnection,
  onProfileClick,
  getProfilePicture,
  getNotificationIcon,
  onNotificationClick,
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
    <div
      onClick={() => onNotificationClick(notification)}
      className={`group relative flex items-start gap-3 md:gap-4 p-3.5 md:p-5 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-sage/30 transition-all duration-300 cursor-pointer ${isUnread ? 'opacity-100' : 'opacity-80 hover:opacity-100'
        }`}>
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
          <p className="text-slate-900 text-[15px] md:text-base leading-snug">
            {notification.actorProfile ? (
              <>
                <span className="font-bold mr-1">{notification.actorProfile.full_name}</span>
                {notification.type === 'connection' && <span className="font-medium text-slate-600">sent you a connection request</span>}
                {notification.type === 'like' && <span className="font-medium text-slate-600">liked your post</span>}
                {notification.type === 'comment' && <span className="font-medium text-slate-600">commented on your post</span>}
                {notification.type === 'job_application' && <span className="font-medium text-slate-600">applied for your job referral</span>}
                {!['connection', 'like', 'comment', 'job_application'].includes(notification.type) && <span className="font-medium text-slate-600">{notification.title}</span>}
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
        {(notification.message || notification.actorProfile) && !['connection', 'job_application'].includes(notification.type) && (
          <p className="text-slate-body text-sm mt-1 line-clamp-2">
            {notification.message}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
          {notification.actionable && notification.type === 'connection' ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptConnection(notification.id, notification.metadata?.connection_id);
                }}
                className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-sage/20 bg-sage/10 text-sm font-bold text-sage hover:text-sage-olive transition-colors"
              >
                Accept
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeclineConnection(notification.id, notification.metadata?.connection_id);
                }}
                className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-stone-header bg-white text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Decline
              </button>
            </>
          ) : (
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-sage/20 bg-sage/10 text-sm font-bold text-sage hover:text-sage-olive transition-colors"
            >
              {notification.type === 'job_application' ? 'View Application' :
                notification.type === 'connection' ? 'View Profile' :
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
