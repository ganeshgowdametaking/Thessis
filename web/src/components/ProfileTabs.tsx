import React from 'react';
import { User, Briefcase, GraduationCap } from 'lucide-react';

export interface ProfileTab {
  id: string;
  label: string;
}

interface ProfileTabsProps {
  tabs: ProfileTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  about: User,
  experience: Briefcase,
  education: GraduationCap,
};

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`h-9 px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap border inline-flex items-center gap-1.5 ${isActive
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-slate-600 border-stone-header hover:border-slate-300'
              }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
