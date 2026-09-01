import React from 'react';
import CompanyAvatar from './CompanyAvatar';
import { getCompanyLogoUrl } from '../utils/companyLogo';
import type { Education } from '../types/profileSections';

interface ProfileEducationListProps {
  education: Education[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

const timelineTextClass = 'text-slate-900 text-[11px] md:text-xs font-black uppercase tracking-wide whitespace-nowrap';

export const ProfileEducationList: React.FC<ProfileEducationListProps> = ({ education }) => {
  if (education.length === 0) {
    return <p className="text-slate-meta text-sm px-1">No education added yet.</p>;
  }

  return (
    <div className="px-1">
      <div className="relative space-y-6 md:space-y-10">
        <div className="hidden md:block absolute left-[40px] top-3 bottom-3 w-0.5 bg-off-stone" />
        {education.map((edu) => (
          <div key={edu.id} className="relative flex gap-3 md:gap-6">
            <div className="relative z-10 shrink-0">
              <div className="size-9 md:size-12 rounded-full bg-white border border-stone-border flex items-center justify-center overflow-hidden">
                <CompanyAvatar company={edu.school} logoUrl={getCompanyLogoUrl(edu.school)} size="sm" />
              </div>
            </div>
            <div className="flex flex-col flex-1 pt-0 md:pt-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-1">
                <h3 className="text-text-main text-[1.08rem] md:text-lg font-bold">{edu.degree}</h3>
                <span className={timelineTextClass}>{formatDate(edu.endDate)}</span>
              </div>
              <p className="text-text-secondary text-[15px] md:text-base">{edu.school}</p>
              {edu.description?.trim() && (
                <p className="text-slate-500 text-[13px] md:text-[14px] leading-[1.65] md:leading-[1.8] mt-2 md:mt-3 max-w-2xl font-medium whitespace-pre-line">
                  {edu.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
