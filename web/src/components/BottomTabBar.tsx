import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, MessageCircle, Bell, User } from 'lucide-react';

const tabs = [
  { to: '/jobs', label: 'Referrals', icon: Briefcase },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
];

/**
 * Mobile-only bottom navigation for the four primary destinations.
 * Hidden on /messages, where the conversation UI needs the full viewport.
 */
const BottomTabBar: React.FC = () => {
  const location = useLocation();

  if (location.pathname === '/messages') return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe-area-inset-bottom"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-150 ${
                active ? 'text-accent' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-semibold'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
