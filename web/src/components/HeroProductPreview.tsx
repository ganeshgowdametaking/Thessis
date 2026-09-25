import React from 'react';
import { BellRing, Search, ShieldCheck } from 'lucide-react';

// Illustrative sample data only — the same fictional companies the homepage has always used.
const SAMPLE_JOBS = [
  { letter: 'N', title: 'Product Designer', company: 'Nimbus Tech', place: 'Remote', tone: 'bg-ink-wash text-primary-hover' },
  { letter: 'V', title: 'Data Analyst', company: 'Vertex Labs', place: 'London', tone: 'bg-success-tint text-success-ink' },
  { letter: 'A', title: 'Account Executive', company: 'Alpine Corp', place: 'Bengaluru', tone: 'bg-amber-tint text-amber-ink' },
  { letter: 'S', title: 'Frontend Engineer', company: 'Solace Inc', place: 'Berlin', tone: 'bg-danger-tint text-red-700' },
];

const CompanyTile: React.FC<{ letter: string; tone: string; size?: 'sm' | 'lg' }> = ({ letter, tone, size = 'sm' }) => (
  <span
    className={`flex shrink-0 items-center justify-center font-display font-extrabold ${tone} ${
      size === 'lg' ? 'h-[50px] w-[50px] rounded-[13px] text-lg' : 'h-[34px] w-[34px] rounded-[9px] text-[13px]'
    }`}
  >
    {letter}
  </span>
);

const ScoreRing: React.FC<{ score: number; size: number }> = ({ score, size }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="8" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="#059669"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(circumference * score) / 100} ${circumference}`}
          transform="rotate(-90 42 42)"
        />
      </svg>
      <span className="absolute font-display text-[17px] font-extrabold text-ink">{score}</span>
    </span>
  );
};

const MatchCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col gap-2.5 rounded-2xl border border-hairline bg-white p-3.5 shadow-[0_20px_50px_rgba(20,20,43,0.14)] ${className}`}>
    <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">AI resume match</span>
    <div className="flex items-center gap-3">
      <ScoreRing score={86} size={54} />
      <div className="flex flex-col gap-0.5 text-left">
        <span className="font-display text-[15px] font-extrabold text-ink">Strong match</span>
        <span className="text-[11.5px] text-slate-500">Skills fit 91 · Relevance 78</span>
      </div>
    </div>
  </div>
);

const ReferredCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex gap-3 rounded-2xl border border-hairline bg-white p-3.5 text-left shadow-[0_20px_50px_rgba(20,20,43,0.14)] ${className}`}>
    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-success-tint text-success-ink">
      <BellRing className="h-4 w-4" />
    </span>
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[13px] font-bold text-ink">You've been referred</span>
      <span className="text-xs leading-snug text-slate-500">Maya Chen referred you for Product Designer at Nimbus Tech.</span>
    </div>
  </div>
);

const HeroProductPreview: React.FC = () => (
  <div role="img" aria-label="Example of Thessis: a job posted by an employee, an AI resume match and a referral notification">
    {/* Desktop: the jobs page in a browser frame with cards floating around it */}
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[1080px] lg:block">
      <div className="rounded-[22px] border border-hairline bg-white/70 p-2.5 shadow-[0_30px_80px_rgba(20,20,43,0.14)]">
        <div className="overflow-hidden rounded-[14px] border border-hairline bg-parchment">
          <div className="flex h-[34px] items-center gap-1.5 border-b border-hairline bg-white px-3.5">
            <span className="h-[9px] w-[9px] rounded-full bg-[#F3C6C6]" />
            <span className="h-[9px] w-[9px] rounded-full bg-[#F5D9A8]" />
            <span className="h-[9px] w-[9px] rounded-full bg-[#BFE9D6]" />
            <span className="ml-3.5 text-[11px] text-slate-500">thessis.com/jobs</span>
          </div>
          <div className="flex h-[430px]">
            <div className="flex w-[340px] flex-col gap-2 border-r border-hairline p-3.5">
              <div className="flex h-9 items-center gap-2 rounded-[10px] border border-hairline bg-white px-3 text-xs text-slate-400">
                <Search className="h-3.5 w-3.5" />
                Search role, company…
              </div>
              {SAMPLE_JOBS.map((job, index) => (
                <div
                  key={job.title}
                  className={`flex items-center gap-2.5 rounded-xl p-[11px] ${
                    index === 0 ? 'border-[1.5px] border-primary bg-ink-wash' : 'border border-hairline bg-white'
                  }`}
                >
                  <CompanyTile letter={job.letter} tone={index === 0 ? 'bg-white text-primary-hover' : job.tone} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate text-[12.5px] font-bold text-ink">{job.title}</span>
                      {index === 0 && (
                        <span className="rounded-full bg-danger-tint px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-red-600">Urgent</span>
                      )}
                    </div>
                    <span className="truncate text-[11px] text-slate-500">{job.company} · {job.place}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-3.5 bg-white px-[26px] py-[22px]">
              <div className="flex items-center gap-3.5">
                <CompanyTile letter="N" tone="bg-ink-wash text-primary-hover" size="lg" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-xl font-extrabold text-ink">Product Designer</span>
                  <span className="text-[12.5px] text-slate-500">Nimbus Tech · Remote · Full-time</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-parchment px-3.5 py-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink-wash text-xs font-bold text-primary-hover">MC</span>
                <span className="text-[12.5px] text-slate-600">
                  Posted by <strong className="text-ink">Maya Chen</strong>, who works at Nimbus Tech and can refer you
                </span>
              </div>
              <div className="flex flex-col gap-[7px]">
                {[96, 88, 92, 60].map((width) => (
                  <span key={width} className="h-[9px] rounded-md bg-[#EEEDE8]" style={{ width: `${width}%` }} />
                ))}
              </div>
              <div className="mt-auto flex gap-2">
                <span className="flex h-10 items-center rounded-[11px] bg-primary px-4 text-[13px] font-bold text-white">Apply now</span>
                <span className="flex h-10 items-center rounded-[11px] border border-hairline bg-white px-4 text-[13px] font-bold text-ink">Share</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MatchCard className="absolute -left-6 top-[392px] w-[250px] xl:-left-14" />
      <ReferredCard className="absolute -right-6 top-[60px] w-[290px] xl:-right-16" />
      <div className="absolute -right-4 bottom-11 flex items-center gap-2.5 rounded-[14px] bg-ink px-3.5 py-3 text-white shadow-[0_20px_50px_rgba(20,20,43,0.25)] xl:-right-8">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/[0.12] text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span className="text-[12.5px] font-semibold">Work email verified · Nimbus Tech</span>
      </div>
    </div>

    {/* Phones and tablets: the same story as a short stack of cards */}
    <div aria-hidden="true" className="mx-auto flex max-w-md flex-col gap-3 lg:hidden">
      <ReferredCard className="shadow-[0_14px_40px_rgba(20,20,43,0.12)]" />
      <div className="flex flex-col gap-2.5 rounded-2xl border border-hairline bg-white p-3.5 text-left">
        <div className="flex items-center gap-2.5">
          <CompanyTile letter="N" tone="bg-ink-wash text-primary-hover" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[13.5px] font-bold text-ink">Product Designer</span>
            <span className="text-[11.5px] text-slate-500">Nimbus Tech · Remote</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-[10px] bg-parchment px-2.5 py-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-wash text-[10px] font-bold text-primary-hover">MC</span>
          <span className="text-[11.5px] text-slate-600">
            Posted by <strong className="text-ink">Maya Chen</strong> · can refer you
          </span>
        </div>
      </div>
      <MatchCard className="shadow-none" />
    </div>
  </div>
);

export default HeroProductPreview;
