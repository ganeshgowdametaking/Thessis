import { Search, Bell, Send, Users, CalendarClock, Award, TrendingUp, TrendingDown } from 'lucide-react';

const stats = [
  { label: 'Active Referrals', value: '24', trend: '+12%', up: true, icon: Send, tint: 'bg-sage/10 text-sage' },
  { label: 'Applications', value: '156', trend: '+18%', up: true, icon: Users, tint: 'bg-blue-50 text-blue-600' },
  { label: 'Interviews', value: '12', trend: '-4%', up: false, icon: CalendarClock, tint: 'bg-amber-50 text-amber-600' },
  { label: 'Hires', value: '8', trend: '+25%', up: true, icon: Award, tint: 'bg-emerald-50 text-emerald-600' },
];

const referrals = [
  { title: 'Product Manager', location: 'Bengaluru, India', tint: 'bg-indigo-100' },
  { title: 'Business Analyst', location: 'Bengaluru, India', tint: 'bg-blue-100' },
  { title: 'AI Engineer', location: 'Bengaluru, India', tint: 'bg-emerald-100' },
];

const upcoming = [
  { title: 'Interview · Software Developer', time: 'Today, 2:00 PM' },
  { title: 'Interview · Product Manager', time: 'Tomorrow, 11:00 AM' },
  { title: 'Follow-up · Business Analyst', time: 'Fri, 10:30 AM' },
];

const DashboardPreviewMock = () => {
  return (
    <div className="w-full aspect-[16/10] bg-white p-4 sm:p-6 flex flex-col gap-3 sm:gap-5 select-none">
      {/* Top bar */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <div className="hidden sm:block shrink-0">
          <p className="text-xs font-bold text-slate-900 leading-tight">Hello, Alex 👋</p>
          <p className="text-[10px] text-slate-400 leading-tight">Here's what's happening today</p>
        </div>
        <div className="flex-1 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-400 min-w-0">
          <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span className="text-[9px] sm:text-xs truncate">Search.......</span>
        </div>
        <div className="flex items-center justify-center h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-slate-100 text-slate-400 shrink-0">
          <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 shrink-0">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg sm:rounded-xl border border-slate-100 bg-white p-1.5 sm:p-3 flex flex-col gap-1 sm:gap-2"
          >
            <div className={`flex h-5 w-5 sm:h-8 sm:w-8 items-center justify-center rounded-md sm:rounded-lg ${s.tint}`}>
              <s.icon className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
            </div>
            <p className="text-xs sm:text-xl font-extrabold text-slate-900 leading-none">{s.value}</p>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[6px] sm:text-[10px] text-slate-400 truncate">{s.label}</p>
              <span
                className={`hidden sm:inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0 ${
                  s.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {s.up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {s.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Content row */}
      <div className="flex-1 flex gap-3 sm:gap-5 min-h-0">
        {/* My Referrals */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:gap-3">
          <p className="text-[10px] sm:text-sm font-bold text-slate-900">My Referrals</p>
          <div className="flex flex-col gap-1.5 sm:gap-2 overflow-hidden">
            {referrals.map((r) => (
              <div
                key={r.title}
                className="flex items-center gap-2 sm:gap-3 rounded-lg border border-slate-100 bg-white p-1.5 sm:p-2.5"
              >
                <div className={`h-6 w-6 sm:h-9 sm:w-9 shrink-0 rounded-md sm:rounded-lg ${r.tint}`} />
                <div className="min-w-0">
                  <p className="truncate text-[9px] sm:text-xs font-bold text-slate-900">{r.title}</p>
                  <p className="truncate text-[8px] sm:text-[10px] text-slate-400">{r.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="w-[38%] shrink-0 min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-3 overflow-hidden">
          <p className="text-[10px] sm:text-sm font-bold text-slate-900">Upcoming</p>
          <div className="flex flex-col gap-1.5 sm:gap-2.5 overflow-hidden">
            {upcoming.map((u) => (
              <div key={u.title} className="rounded-lg bg-white border border-slate-100 p-1.5 sm:p-2.5">
                <p className="truncate text-[8px] sm:text-[11px] font-bold text-slate-900">{u.title}</p>
                <p className="truncate text-[7px] sm:text-[10px] text-slate-400">{u.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreviewMock;
