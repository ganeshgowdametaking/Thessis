import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Bell, Briefcase, Check, CheckCheck, DollarSign, Heart, MessageCircle, MessageSquare, Send, Star, TrendingUp, UserCheck, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import { connectionService } from '../services/connectionService';
import { profileService } from '../services/profileService';
import { useAuthContext } from '../contexts/AuthContext';
import { hireVerificationService, HireVerificationRequest } from '../services/hireVerificationService';
import { VerificationCard } from './VerificationCard';

type Toast = { tone: 'success' | 'neutral' | 'error'; text: string; profileId?: string };

// The notification fields this page reads (rows come from notifications.*,
// plus actorProfile added in loadNotifications).
type NotificationItem = {
  id: string;
  type: string;
  title?: string | null;
  message?: string | null;
  read?: boolean | null;
  actionable?: boolean | null;
  created_at: string;
  metadata?: Record<string, string | undefined> | null;
  actorProfile?: { id: string; full_name?: string; avatar_url?: string; title?: string; company?: string } | null;
};

const NotificationsPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<HireVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const getTypeVisual = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'connection':
        return notification.metadata?.accepter_id
          ? { icon: <UserCheck className="h-[18px] w-[18px]" />, tone: 'bg-ink-wash text-primary-hover' }
          : { icon: <UserPlus className="h-[18px] w-[18px]" />, tone: 'bg-ink-wash text-primary-hover' };
      case 'job_application':
        return { icon: <Briefcase className="h-[18px] w-[18px]" />, tone: 'bg-amber-tint text-amber-ink' };
      case 'job':
        return notification.title === 'Application Shortlisted'
          ? { icon: <Star className="h-[18px] w-[18px]" />, tone: 'bg-success-tint text-success-ink' }
          : { icon: <Briefcase className="h-[18px] w-[18px]" />, tone: 'bg-amber-tint text-amber-ink' };
      case 'referral':
        return { icon: <Send className="h-[18px] w-[18px]" />, tone: 'bg-success-tint text-success-ink' };
      case 'like':
        return { icon: <Heart className="h-[18px] w-[18px]" />, tone: 'bg-danger-tint text-red-600' };
      case 'comment':
        return { icon: <MessageCircle className="h-[18px] w-[18px]" />, tone: 'bg-ink-wash text-primary-hover' };
      case 'payout':
        return { icon: <DollarSign className="h-[18px] w-[18px]" />, tone: 'bg-success-tint text-success-ink' };
      case 'analytics':
        return { icon: <TrendingUp className="h-[18px] w-[18px]" />, tone: 'bg-ink-wash text-primary-hover' };
      case 'warning':
        return { icon: <AlertTriangle className="h-[18px] w-[18px]" />, tone: 'bg-amber-tint text-amber-ink' };
      default:
        return { icon: <Bell className="h-[18px] w-[18px]" />, tone: 'bg-parchment-sunken text-slate-500' };
    }
  };

  const isDirectApplication = (notification: NotificationItem) =>
    notification.type === 'job' && notification.title === 'New Job Application';

  const getCategory = (notification: NotificationItem) => {
    if (notification.type === 'connection') return { label: 'Connection', className: 'bg-ink-wash text-primary-hover' };
    if (notification.type === 'job_application' || isDirectApplication(notification)) return { label: 'Application', className: 'bg-amber-tint text-amber-ink' };
    if (notification.type === 'referral') return { label: 'Referral', className: 'bg-success-tint text-success-ink' };
    return { label: 'Update', className: 'bg-parchment-sunken text-slate-600' };
  };

  const handleAcceptConnection = async (notificationId: string, connectionId?: string, actor?: { id?: string; full_name?: string }) => {
    console.log('✅ Accepting connection:', { notificationId, connectionId });
    try {
      // Optimistically remove the notification from the list
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

      if (connectionId) {
        await connectionService.acceptConnectionRequest(connectionId);
      }

      // Delete the notification from the database as well so it's gone for good
      await notificationService.deleteNotification(notificationId);

      setToast({
        tone: 'success',
        text: actor?.full_name ? `You're now connected with ${actor.full_name}.` : "You're now connected.",
        profileId: actor?.id,
      });

      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error) {
      console.error('Error accepting connection:', error);
      setToast({ tone: 'error', text: "Couldn't accept the request. Your notifications have been refreshed." });
      loadNotifications(); // Reload to be sure
    }
  };

  const handleDeclineConnection = async (notificationId: string, connectionId?: string, actor?: { full_name?: string }) => {
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

      setToast({ tone: 'neutral', text: actor?.full_name ? `Request from ${actor.full_name} declined.` : 'Request declined.' });

      // Add a small delay to ensure database operation completes
      setTimeout(() => {
        if (window.refreshUnreadCounts) window.refreshUnreadCounts();
      }, 100);
    } catch (error: any) {
      console.error('❌ Error declining connection:', error);
      // Revert if it's a real failure, but often it might just be the notification already gone
      if (!error.message?.includes('not found')) {
        setToast({ tone: 'error', text: `Couldn't decline the request: ${error.message || 'Unknown error'}` });
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

  // Where a notification leads when you click it (or its button).
  const getDestination = (notification: NotificationItem): string | null => {
    const meta = notification.metadata || {};
    if (notification.type === 'connection' && meta.requester_id) return `/user/${meta.requester_id}`;
    if (notification.type === 'connection' && meta.accepter_id) return `/user/${meta.accepter_id}`;
    if (notification.type === 'job_application' && meta.job_id) return `/applications/${meta.job_id}`;
    if (isDirectApplication(notification) && meta.job_id) return `/applications/${meta.job_id}`;
    if ((notification.type === 'like' || notification.type === 'comment') && meta.post_id) return '/jobs';
    if (notification.type === 'payout') return '/settings'; // Or wherever payouts are handled
    if (notification.type === 'analytics') return '/analytics';
    // Referral notifications store the referrer as referrer_id.
    const referrerId = meta.referrer_id || meta.referrerId;
    if (notification.type === 'referral' && referrerId) return `/messages?userId=${referrerId}`;
    return null;
  };

  const getActionLabel = (notification: NotificationItem): string | null => {
    if (!getDestination(notification)) return null;
    switch (notification.type) {
      case 'connection': return 'View profile';
      case 'job_application':
      case 'job': return 'View applicants';
      case 'referral': return 'Message referrer';
      case 'payout': return 'View details';
      case 'analytics': return 'View analytics';
      default: return null; // Likes and comments: the row itself still opens as before
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    const destination = getDestination(notification);
    if (destination) {
      navigate(destination);
    }

    // Mark as read when clicked
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'connection', label: 'Referrals & connections' },
  ];

  const renderToast = () => toast && (
    <div className="fixed inset-x-4 bottom-5 z-[110] flex justify-center pointer-events-none">
      <div role="status" className="pointer-events-auto flex items-center gap-2.5 max-w-md w-full rounded-xl bg-ink px-4 py-3 text-[13px] text-white shadow-xl">
        {toast.tone === 'success' && <Check className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={3} />}
        {toast.tone === 'neutral' && <X className="h-4 w-4 shrink-0 text-slate-300" />}
        {toast.tone === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />}
        <span className="flex-1">{toast.text}</span>
        {toast.profileId && (
          <button
            type="button"
            className="shrink-0 font-bold text-indigo-200 hover:text-white"
            onClick={() => {
              const profileId = toast.profileId as string;
              setToast(null);
              handleProfileClick(profileId);
            }}
          >
            View profile
          </button>
        )}
        <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="shrink-0 text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-parchment font-display min-h-screen">
        <main className="w-full max-w-[800px] mx-auto px-4 py-5 md:py-10 flex flex-col gap-5">
          <div className="h-8 w-48 rounded-lg bg-parchment-sunken animate-pulse" />
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" role="status" aria-label="Loading notifications">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3.5 px-5 py-4 border-b border-slate-100 last:border-b-0 animate-pulse">
                <div className="size-11 rounded-full bg-parchment-sunken" />
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <div className="h-3 w-3/5 rounded bg-parchment-sunken" />
                  <div className="h-2.5 w-4/5 rounded bg-parchment-sunken" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const sections = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'lastWeek', label: 'Last 7 days' },
    { key: 'older', label: 'Older' },
  ];

  const renderHeadline = (notification: NotificationItem) => {
    if (notification.actorProfile) {
      const verb =
        notification.type === 'connection' ? 'sent you a connection request'
          : notification.type === 'like' ? 'liked your post'
            : notification.type === 'comment' ? 'commented on your post'
              : notification.type === 'job_application' ? 'applied for your job referral'
                : notification.title;
      return <><strong className="font-bold">{notification.actorProfile.full_name}</strong> {verb}</>;
    }
    return <strong className="font-bold">{notification.title || notification.message}</strong>;
  };

  const getDetail = (notification: NotificationItem): string => {
    if (notification.actorProfile) {
      if (notification.type === 'connection') {
        return [notification.actorProfile.title, notification.actorProfile.company].filter(Boolean).join(' at ');
      }
      if (notification.type === 'like' || notification.type === 'comment') {
        // The message repeats the name ("Sam liked your post: …"); keep just the quoted part.
        const message: string = notification.message || '';
        const quoteStart = message.indexOf(': ');
        return quoteStart >= 0 ? message.slice(quoteStart + 2) : message;
      }
      return notification.message || '';
    }
    return notification.title ? notification.message || '' : '';
  };

  const renderLead = (notification: NotificationItem) => {
    const actor = notification.actorProfile;
    if (actor) {
      const name: string = actor.full_name || '';
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase() || '?';
      return (
        <button
          type="button"
          className="shrink-0 self-start"
          aria-label={`View ${name || 'this person'}'s profile`}
          onClick={(e) => {
            e.stopPropagation();
            if (!notification.read) handleMarkAsRead(notification.id);
            handleProfileClick(actor.id);
          }}
        >
          {actor.avatar_url ? (
            <img className="size-10 md:size-11 rounded-full object-cover" src={actor.avatar_url} alt="" />
          ) : (
            <span className="size-10 md:size-11 rounded-full bg-ink-wash text-primary-hover font-display font-extrabold text-sm flex items-center justify-center">{initials}</span>
          )}
        </button>
      );
    }
    const visual = getTypeVisual(notification);
    return <span className={`size-10 md:size-11 shrink-0 self-start rounded-full flex items-center justify-center ${visual.tone}`}>{visual.icon}</span>;
  };

  const renderRow = (notification: NotificationItem, isLast: boolean) => {
    const isUnread = !notification.read;
    const isRequest = notification.actionable && notification.type === 'connection';
    const actionLabel = getActionLabel(notification);
    const category = getCategory(notification);
    const detail = getDetail(notification);
    const tag = (
      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${category.className}`}>{category.label}</span>
    );
    const time = <span className="whitespace-nowrap text-[11px] md:text-[11.5px] text-slate-500">{formatTimeAgo(notification.created_at)}</span>;

    return (
      <div
        key={notification.id}
        onClick={() => handleNotificationClick(notification)}
        className={`relative flex gap-3 md:gap-3.5 pl-6 pr-4 py-3.5 md:pl-[26px] md:pr-5 md:py-4 cursor-pointer transition-colors ${isUnread ? 'bg-[#F7F8FF] hover:bg-ink-wash' : 'bg-white hover:bg-parchment'
          } ${isLast ? '' : 'border-b border-slate-100'}`}
      >
        {isUnread && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 size-[7px] rounded-full bg-primary">
            <span className="sr-only">Unread</span>
          </span>
        )}
        {renderLead(notification)}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="text-[13.5px] md:text-sm leading-snug text-ink">{renderHeadline(notification)}</p>
          {detail && <p className="text-[12.5px] md:text-[13px] leading-relaxed text-slate-500 line-clamp-2">{detail}</p>}
          <div className="md:hidden flex items-center gap-2 mt-1.5">{tag}{time}</div>
          {(isRequest || actionLabel) && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
              {isRequest ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAcceptConnection(notification.id, notification.metadata?.connection_id, notification.actorProfile ?? undefined)}
                    className="flex-1 md:flex-none h-9 px-3.5 rounded-[10px] bg-primary text-white text-[12.5px] font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineConnection(notification.id, notification.metadata?.connection_id, notification.actorProfile ?? undefined)}
                    className="flex-1 md:flex-none h-9 px-3.5 rounded-[10px] border border-slate-200 bg-white text-[12.5px] font-bold text-ink hover:bg-parchment-sunken transition-colors"
                  >
                    Decline
                  </button>
                  {actionLabel && (
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="hidden md:inline-flex h-9 px-1.5 text-[12.5px] font-bold text-primary hover:underline items-center"
                    >
                      {actionLabel}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="h-9 px-3.5 rounded-[10px] border border-slate-200 bg-white text-[12.5px] font-bold text-ink hover:bg-parchment-sunken transition-colors flex items-center gap-1.5"
                >
                  {notification.type === 'referral' && <MessageSquare className="h-3.5 w-3.5" />}
                  {actionLabel}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0">
          {time}
          {tag}
        </div>
      </div>
    );
  };

  const showActionRequired = verifications.length > 0 && filter === 'all';

  return (
    <div className="bg-parchment font-display min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-[800px] mx-auto px-4 py-5 md:py-10 flex flex-col gap-5 md:gap-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="font-display text-2xl md:text-[30px] font-extrabold text-ink">Notifications</h1>
            <p className="text-[12.5px] md:text-sm text-slate-500">
              {unreadCount > 0
                ? <><strong className="text-ink">{unreadCount} new</strong> since your last visit</>
                : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
              aria-label="Mark all as read"
              className="shrink-0 h-10 md:h-[38px] w-10 md:w-auto md:px-3.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-ink hover:bg-parchment-sunken transition-colors flex items-center justify-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden md:inline">Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {tabs.map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(tab.id)}
                className={`shrink-0 flex items-center gap-2 h-9 md:h-[38px] px-3.5 rounded-full border text-[12.5px] md:text-[13px] font-bold transition-colors ${isActive
                  ? 'bg-ink border-ink text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
              >
                {tab.label}
                {!!tab.count && (
                  <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-primary text-white'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hire checks that need an answer */}
        {showActionRequired && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-amber-ink pl-1">Action required</h2>
            <div className="flex flex-col gap-3">
              {verifications.map(req => (
                <VerificationCard
                  key={req.id}
                  request={req}
                  onResponse={loadNotifications}
                />
              ))}
            </div>
          </section>
        )}

        {/* Notifications */}
        {sections.map(({ key, label }) => {
          const items = groupedNotifications[key];
          if (!items || items.length === 0) return null;
          return (
            <section key={key} className="flex flex-col gap-2.5">
              <h2 className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">{label}</h2>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {items.map((notification, index) => renderRow(notification, index === items.length - 1))}
              </div>
            </section>
          );
        })}

        {/* Empty State */}
        {filteredNotifications.length === 0 && !showActionRequired && (
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 flex flex-col items-center gap-2.5 text-center">
            <span className={`size-14 rounded-full flex items-center justify-center mb-1 ${filter === 'all' ? 'bg-ink-wash text-primary' : 'bg-success-tint text-success-ink'}`}>
              {filter === 'all' ? <Bell className="h-6 w-6" /> : <CheckCheck className="h-6 w-6" />}
            </span>
            <p className="font-display text-lg font-extrabold text-ink">
              {filter === 'all' ? "You're all caught up" : filter === 'unread' ? 'No unread notifications' : 'No referral or connection updates yet'}
            </p>
            <p className="text-[13.5px] leading-relaxed text-slate-500 max-w-sm">
              {filter === 'all'
                ? "We'll let you know when someone applies to your referrals, wants to connect or refers you."
                : filter === 'unread'
                  ? 'Everything here has been seen.'
                  : 'Applications, referrals and connection requests will show up here.'}
            </p>
            {filter !== 'all' && (
              <button type="button" onClick={() => setFilter('all')} className="mt-1 text-[13px] font-bold text-primary hover:underline">
                Show all
              </button>
            )}
          </div>
        )}
      </main>
      {renderToast()}
    </div>
  );
};

export default NotificationsPage;
