import React from 'react';
import CompanyAvatar from './CompanyAvatar';
import { getCompanyLogoUrl } from '../utils/companyLogo';

interface ProfileTimelineItemProps {
  logoName: string;
  heading: string;
  subheading?: string;
  meta?: string;
  dates?: string;
  description?: string;
  isLast?: boolean;
}

export const formatProfileDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

export const formatProfileDateRange = (startDate?: string, endDate?: string, current?: boolean) => {
  const start = startDate ? formatProfileDate(startDate) : '';
  const end = current ? 'Present' : (endDate ? formatProfileDate(endDate) : '');

  if (start && end) return `${start} — ${end}`;
  if (start) return start;
  if (end) return end;
  return '';
};

// One entry in the Experience / Education timelines on /profile and /user/:id.
export const ProfileTimelineItem: React.FC<ProfileTimelineItemProps> = ({
  logoName,
  heading,
  subheading,
  meta,
  dates,
  description,
  isLast = false,
}) => (
  <div className="relative flex gap-3.5">
    {!isLast && <div className="absolute left-[21px] top-[52px] -bottom-5 w-0.5 bg-slate-100" aria-hidden="true" />}
    <div className="size-11 shrink-0 rounded-xl border border-slate-100 bg-white overflow-hidden flex items-center justify-center">
      <CompanyAvatar company={logoName} logoUrl={getCompanyLogoUrl(logoName)} size="sm" />
    </div>
    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-3">
        <h3 className="text-[15px] font-bold text-ink">{heading}</h3>
        {dates && <span className="text-xs font-semibold text-slate-500 whitespace-nowrap sm:pt-0.5">{dates}</span>}
      </div>
      {subheading && <p className="text-[13px] text-slate-600">{subheading}</p>}
      {meta && <p className="text-xs text-slate-500">{meta}</p>}
      {description?.trim() && (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600 whitespace-pre-line">{description}</p>
      )}
    </div>
  </div>
);
