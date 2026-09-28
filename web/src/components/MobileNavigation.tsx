import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, MessageCircle, Search, Settings, UserRound } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const destinations = [
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export default function MobileNavigation() {
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    // This component mounts only on phones. Keep navigation out of the typing area.
    const update = () => {
      const field = document.activeElement;
      const editing = field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || (field instanceof HTMLElement && field.isContentEditable);
      const viewport = window.visualViewport;
      setKeyboardOpen(Boolean(editing && viewport && window.innerHeight - viewport.height > 150));
    };
    window.visualViewport?.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const count = await notificationService.getUnreadNotificationsCount();
        if (active) setUnread(count);
      } catch { /* Keep navigation usable if the count is unavailable. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 120000);
    window.refreshUnreadCounts = refresh;
    return () => {
      active = false;
      window.clearInterval(timer);
      if (window.refreshUnreadCounts === refresh) window.refreshUnreadCounts = undefined;
    };
  }, []);

  const isJobs = pathname === '/jobs';
  const title = destinations.find(item => item.to === pathname)?.label
    || (pathname === '/settings' ? 'Settings'
      : pathname === '/create-referral' ? 'Post a referral'
        : pathname === '/search-results' ? 'Find people'
          : pathname.startsWith('/applications/') ? 'Applicants'
            : pathname.startsWith('/user/') ? 'Profile' : 'Thessis');
  const isMainPage = destinations.some(item => item.to === pathname);
  const backTo = pathname === '/settings' ? '/profile'
    : pathname.startsWith('/applications/') ? '/create-referral'
      : pathname.startsWith('/user/') ? '/search-results' : '/jobs';

  return <>
    <header className="mobile-app-header">
      {isJobs ? (
        <Link to="/jobs" aria-label="Thessis home" className="mobile-brand"><img src="/brand/thessis-logo-primary.svg" alt="Thessis" /></Link>
      ) : (
        <div className="mobile-header-title">
          {!isMainPage && <Link to={backTo} className="mobile-icon-button" aria-label="Back"><ArrowLeft size={20} /></Link>}
          <h1>{title}</h1>
        </div>
      )}
      <div className="mobile-header-actions">
        {pathname !== '/search-results' && <Link to="/search-results" className="mobile-icon-button" aria-label="Find people"><Search size={21} /></Link>}
        {pathname === '/profile' && <Link to="/settings" className="mobile-icon-button" aria-label="Settings"><Settings size={21} /></Link>}
      </div>
    </header>
    <nav className={`mobile-bottom-nav${keyboardOpen ? ' is-keyboard-open' : ''}`} aria-label="Main navigation">
      {destinations.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-item${isActive || (to === '/profile' && pathname === '/settings') ? ' is-active' : ''}`}>
          <span className="mobile-nav-icon"><Icon size={21} strokeWidth={1.8} />
            {to === '/notifications' && unread > 0 && <span className="mobile-unread"><span className="sr-only">{unread} unread notifications</span></span>}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  </>;
}
