import React from 'react';
import { Check, Clock } from 'lucide-react';

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

const ExampleLabel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex h-6 items-center rounded-full bg-ink px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white ${className}`}>
    Example
  </span>
);

const MatchCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col gap-2.5 rounded-2xl border border-hairline bg-white p-3.5 shadow-[0_20px_50px_rgba(20,20,43,0.14)] ${className}`}>
    <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">AI resume match</span>
    <div className="flex items-center gap-3">
      <ScoreRing score={86} size={54} />
      <span className="font-display text-[15px] font-extrabold text-ink">Strong match</span>
    </div>
  </div>
);

// The application's journey: applied → with a referrer (48-hour window) → referred.
const TimelineStep: React.FC<{ done?: boolean; current?: boolean; title: string; children: React.ReactNode }> = ({ done, current, title, children }) => (
  <div className={`flex items-start gap-2.5 ${done || current ? '' : 'opacity-50'}`}>
    <span
      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${
        done ? 'bg-success-tint text-success-ink' : current ? 'bg-ink-wash text-primary-hover' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {current ? <Clock className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
    </span>
    <div className="flex flex-col gap-px">
      <span className="text-[12.5px] font-bold text-ink">{title}</span>
      <span className="text-[11.5px] text-slate-500">{children}</span>
    </div>
  </div>
);

const ApplicationTimeline: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col gap-3 rounded-2xl border border-hairline bg-white p-4 text-left shadow-[0_20px_50px_rgba(20,20,43,0.14)] ${className}`}>
    <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">Your application</span>
    <TimelineStep done title="Applied">Product Designer · Nimbus Tech</TimelineStep>
    <TimelineStep current title="With Maya Chen">
      <strong className="text-primary">48h to respond</strong>
    </TimelineStep>
    <TimelineStep title="Referred">You'll get an email</TimelineStep>
  </div>
);

const HeroProductPreview: React.FC = () => (
  <div role="img" aria-label="Example of Thessis: a job posted by an employee, an AI resume match, and an application that a referrer has 48 hours to respond to">
    {/* Desktop: the jobs page in a browser frame with cards floating around it */}
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[1040px] lg:block">
      <ExampleLabel className="absolute -top-3 left-5 z-10" />
      <div className="rounded-[22px] border border-hairline bg-white/70 p-2.5 shadow-[0_30px_80px_rgba(20,20,43,0.14)]">
        <div className="overflow-hidden rounded-[14px] border border-hairline bg-parchment">
          <div className="flex h-[34px] items-center gap-1.5 border-b border-hairline bg-white px-3.5">
            <span className="h-[9px] w-[9px] rounded-full bg-[#F3C6C6]" />
            <span className="h-[9px] w-[9px] rounded-full bg-[#F5D9A8]" />
            <span className="h-[9px] w-[9px] rounded-full bg-[#BFE9D6]" />
            <span className="ml-3.5 text-[11px] text-slate-500">thessis.com/jobs</span>
          </div>
          <div className="flex h-[360px]">
            <div className="flex w-[330px] flex-col gap-2 border-r border-hairline p-3.5">
              {SAMPLE_JOBS.map((job, index) => (
                <div
                  key={job.title}
                  className={`flex items-center gap-2.5 rounded-xl p-[11px] ${
                    index === 0 ? 'border-[1.5px] border-primary bg-ink-wash' : 'border border-hairline bg-white'
                  }`}
                >
                  <CompanyTile letter={job.letter} tone={index === 0 ? 'bg-white text-primary-hover' : job.tone} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[12.5px] font-bold text-ink">{job.title}</span>
                    <span className="truncate text-[11px] text-slate-500">{job.company} · {job.place}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-4 bg-white px-7 py-6">
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
                  Posted by <strong className="text-ink">Maya Chen</strong> · can refer you
                </span>
              </div>
              <span className="flex h-10 items-center self-start rounded-[11px] bg-primary px-[18px] text-[13px] font-bold text-white">
                Apply now
              </span>
            </div>
          </div>
        </div>
      </div>
      <MatchCard className="absolute -bottom-6 -left-6 w-[236px] xl:-left-14" />
      <ApplicationTimeline className="absolute -right-6 top-14 w-[300px] xl:-right-16" />
    </div>

    {/* Phones and tablets: the same story as a short stack of cards */}
    <div aria-hidden="true" className="mx-auto flex max-w-md flex-col gap-3 lg:hidden">
      <ExampleLabel className="self-start" />
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
      <ApplicationTimeline className="shadow-[0_14px_40px_rgba(20,20,43,0.12)]" />
    </div>
  </div>
);

export default HeroProductPreview;
