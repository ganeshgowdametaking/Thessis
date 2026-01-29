import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, MessageSquare, Bell, User } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';

const MobileFooter: React.FC = () => {
  const { user } = useAuthContext();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);

  React.useEffect(() => {
    // Poll for unread counts if user is logged in
    if (!user) return;

    const fetchCounts = async () => {
      try {
        const [msgCount, notifCount] = await Promise.all([
          messageService.getUnreadMessagesCount(),
          notificationService.getUnreadNotificationsCount(),
        ]);
        setUnreadMessages(msgCount);
        setUnreadNotifications(notifCount);
      } catch (e) {
        // Silent fail
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const navItems = [
    { name: 'Jobs', icon: Briefcase, path: '/jobs' },
    { name: 'Messages', icon: MessageSquare, path: '/messages', badge: unreadMessages },
    { name: 'Alerts', icon: Bell, path: '/notifications', badge: unreadNotifications },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 block md:hidden bg-white border-t border-gray-200 pb-safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <div className="relative p-1">
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
                {item.badge ? (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileFooter;
