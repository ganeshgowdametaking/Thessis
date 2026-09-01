import React from 'react';
import CompanyAvatar from './CompanyAvatar';
import { getCompanyLogoUrl } from '../utils/companyLogo';
import type { Experience } from '../types/profileSections';

interface ProfileExperienceListProps {
  experiences: Experience[];
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

const timelineTextClass = 'text-slate-900 text-[11px] md:text-xs font-black uppercase tracking-wide whitespace-nowrap';

export const ProfileExperienceList: React.FC<ProfileExperienceListProps> = ({ experiences }) => {
  if (experiences.length === 0) {
    return <p className="text-slate-meta text-sm px-1">No work experience added yet.</p>;
  }

  return (
    <div className="relative pl-0.5 md:pl-2">
      <div className="space-y-7 md:space-y-14">
        {experiences.map((exp) => (
          <div key={exp.id} className="relative flex gap-3 md:gap-4">
            <div className="relative z-10 shrink-0">
              <div className="bg-white rounded-full size-9 md:size-12 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                <CompanyAvatar company={exp.company} logoUrl={getCompanyLogoUrl(exp.company)} size="sm" />
              </div>
            </div>

            <div className="flex flex-col flex-1 pt-0 md:pt-1">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2.5 md:gap-4">
                <div className="flex flex-col gap-1 md:gap-1.5">
                  <h3 className="text-slate-900 text-[1.08rem] md:text-lg font-extrabold md:font-black tracking-[0.01em] md:tracking-[0.1em] leading-tight">
                    {exp.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:gap-2.5">
                    <span className="text-slate-900 font-bold text-[11px] md:text-xs tracking-[0.08em] md:tracking-wider">{exp.company}</span>
                    {exp.location && (
                      <>
                        <span className="text-slate-300 text-xs">/</span>
                        <span className="text-slate-400 text-[13px] md:text-sm font-semibold tracking-tight">{exp.location}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-0 md:pt-0.5">
                  <span className={timelineTextClass}>
                    {formatDate(exp.startDate)} — {exp.current ? 'Present' : formatDate(exp.endDate)}
                  </span>
                </div>
              </div>

              {exp.description?.trim() && (
                <p className="text-slate-500 text-[13px] md:text-[14px] leading-[1.65] md:leading-[1.8] mt-2.5 md:mt-6 max-w-2xl font-medium whitespace-pre-line">
                  {exp.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
