import React, { useState } from 'react';
import { ArrowRight, BellRing, ShieldCheck, Sparkles } from 'lucide-react';

interface HomeCtaProps {
  onJoinNow?: () => void;
}

const SectionHeading: React.FC<{ eyebrow: string; title: string }> = ({ eyebrow, title }) => (
  <div className="flex flex-col items-center gap-2.5 text-center">
    <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">{eyebrow}</span>
    <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-[42px]">{title}</h2>
  </div>
);

// ---------- How it works ----------

type Track = 'seekers' | 'employees';

const TRACKS: Record<Track, { tab: string; tag: string; title: string; cta: string; steps: { title: string; body: string }[] }> = {
  seekers: {
    tab: 'Job seekers',
    tag: 'For job seekers',
    title: 'Get referred, not ignored',
    cta: 'Create your free profile',
    steps: [
      { title: 'Build your profile', body: 'Add your experience, skills and a photo — your profile strength shows what to add next.' },
      { title: 'Apply to referral roles', body: 'Every role is posted by someone who works at the company.' },
      { title: 'Get referred', body: "When they refer you, you'll get an email and a notification straight away." },
    ],
  },
  employees: {
    tab: 'Employees',
    tag: 'For employees',
    title: 'Refer great people in minutes',
    cta: 'Sign up to post a referral',
    steps: [
      { title: 'Post a role at your company', body: 'Paste a job link or upload the PDF — we fill in the details for you to check.' },
      { title: 'Review applicants', body: 'Each resume gets an AI match score with the reasons behind it.' },
      { title: 'Refer the best', body: "Shortlist, then mark them referred — they're emailed instantly." },
    ],
  },
};

export const HomeHowItWorks: React.FC<HomeCtaProps> = ({ onJoinNow }) => {
  const [track, setTrack] = useState<Track>('seekers');

  return (
    <section id="how-it-works" className="scroll-mt-24 bg-parchment px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading eyebrow="How it works" title="Two sides of every referral" />

      {/* Phones show one side at a time */}
      <div className="mx-auto mt-6 flex max-w-sm rounded-full bg-parchment-sunken p-1 md:hidden">
        {(Object.keys(TRACKS) as Track[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTrack(key)}
            aria-pressed={track === key}
            className={`h-9 flex-1 rounded-full text-[13px] font-bold transition-colors ${
              track === key ? 'bg-white text-ink shadow-[0_2px_6px_rgba(20,20,43,0.08)]' : 'text-slate-500'
            }`}
          >
            {TRACKS[key].tab}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-5 grid max-w-[1120px] gap-5 md:mt-11 md:grid-cols-2">
        {(Object.keys(TRACKS) as Track[]).map((key) => {
          const item = TRACKS[key];
          return (
            <div
              key={key}
              className={`${track === key ? 'flex' : 'hidden md:flex'} flex-col gap-6 rounded-[22px] border border-hairline bg-white p-5 sm:p-[30px]`}
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-primary">{item.tag}</span>
                <h3 className="font-display text-xl font-extrabold text-ink sm:text-2xl">{item.title}</h3>
              </div>
              <ol className="flex flex-col gap-5">
                {item.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3.5">
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink-wash font-display text-sm font-extrabold text-primary-hover">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-ink">{step.title}</span>
                      <span className="text-[13.5px] leading-relaxed text-slate-500">{step.body}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={onJoinNow}
                className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-bold text-primary hover:text-primary-hover"
              >
                {item.cta}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ---------- Features ----------

const FeatureTile: React.FC<{ title: string; body: string; children: React.ReactNode }> = ({ title, body, children }) => (
  <div className="flex flex-col gap-4 rounded-[22px] border border-hairline bg-white p-5 sm:p-[26px]">
    <div aria-hidden="true" className="flex min-h-[130px] flex-1 items-center justify-center rounded-[14px] bg-parchment px-4">
      {children}
    </div>
    <div className="flex flex-col gap-1">
      <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="text-[13.5px] leading-relaxed text-slate-500">{body}</p>
    </div>
  </div>
);

export const HomeFeatures: React.FC = () => (
  <section id="features" className="scroll-mt-24 bg-parchment px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
    <SectionHeading eyebrow="Features" title="Built for trust on both sides" />
    <div className="mx-auto mt-8 grid max-w-[1180px] gap-4 sm:mt-10 sm:grid-cols-2 xl:grid-cols-4 xl:gap-[18px]">
      <FeatureTile title="AI resume match" body="Referrers see how well each resume fits the role, and why.">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-16 w-16 items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 84 84">
              <circle cx="42" cy="42" r="34" fill="none" stroke="#F3F4F6" strokeWidth="8" />
              <circle cx="42" cy="42" r="34" fill="none" stroke="#059669" strokeWidth="8" strokeLinecap="round" strokeDasharray="183.7 213.6" transform="rotate(-90 42 42)" />
            </svg>
            <span className="absolute font-display text-lg font-extrabold text-ink">86</span>
          </span>
          <span className="font-display text-[15px] font-extrabold leading-tight text-ink">Strong<br />match</span>
        </div>
      </FeatureTile>
      <FeatureTile title="Verified work emails" body="Referrers confirm where they work, so you know who you're dealing with.">
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-success-tint px-3.5 py-2.5 text-[13px] font-bold text-success-ink">
          <ShieldCheck className="h-4 w-4" />
          Work email verified
        </span>
      </FeatureTile>
      <FeatureTile title="Messages" body="Talk to the person who can refer you, right inside Thessis.">
        <div className="flex w-full max-w-[220px] flex-col gap-1.5">
          <span className="self-start rounded-xl rounded-bl border border-hairline bg-white px-3 py-2 text-xs text-ink">Happy to refer you!</span>
          <span className="self-end rounded-xl rounded-br bg-primary px-3 py-2 text-xs text-white">Thank you 🙏</span>
        </div>
      </FeatureTile>
      <FeatureTile title="Profile strength" body="A clear checklist of what to add before you apply.">
        <div className="flex w-full max-w-[220px] flex-col gap-2">
          <div className="flex justify-between text-[12.5px] font-bold text-ink">
            <span>Profile strength</span>
            <span>90/100</span>
          </div>
          <div className="h-2 rounded-full bg-parchment-sunken">
            <div className="h-full w-[90%] rounded-full bg-emerald-600" />
          </div>
        </div>
      </FeatureTile>
    </div>
  </section>
);

// ---------- Why Thessis (no statistics — only what the product does) ----------

const REASONS = [
  { icon: ShieldCheck, title: 'A real person on the inside', body: 'Every role is posted by someone who works at the company.' },
  { icon: Sparkles, title: 'Seen, not filtered out', body: 'Referrers read your profile with an AI match beside it.' },
  { icon: BellRing, title: 'Know where you stand', body: "Emails and notifications when you're shortlisted or referred." },
];

export const HomeWhyThessis: React.FC = () => (
  <section className="bg-ink px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
    <div className="mx-auto flex max-w-[1120px] flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
      <div className="flex flex-col gap-2.5 lg:w-[340px] lg:shrink-0">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-indigo-300">Why Thessis</span>
        <h2 className="font-display text-[26px] font-extrabold leading-tight text-white sm:text-[34px]">
          A warmer way into your next company.
        </h2>
      </div>
      <div className="grid flex-1 gap-7 sm:grid-cols-3 sm:gap-0">
        {REASONS.map(({ icon: Icon, title, body }, index) => (
          <div
            key={title}
            className={`flex flex-col gap-2 sm:px-6 ${index > 0 ? 'border-t border-white/[0.12] pt-7 sm:border-l sm:border-t-0 sm:pt-0' : 'sm:border-l sm:border-white/[0.12]'}`}
          >
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-white/[0.08] text-indigo-300">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <h3 className="font-display text-[17px] font-extrabold text-white">{title}</h3>
            <p className="text-[13px] leading-relaxed text-white/65">{body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ---------- Final call to action ----------

export const HomeFinalCta: React.FC<HomeCtaProps & { onSignIn?: () => void }> = ({ onJoinNow, onSignIn }) => (
  <section className="bg-parchment px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
    <div className="relative mx-auto flex max-w-[1120px] flex-col gap-6 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#4353FF_0%,#2F39C7_100%)] p-6 sm:rounded-[28px] sm:p-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-16">
      <img
        src="/brand/thessis-symbol-white.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 right-10 hidden h-[260px] w-auto opacity-[0.12] sm:block"
      />
      <div className="relative flex max-w-[560px] flex-col gap-3">
        <h2 className="font-display text-[26px] font-extrabold leading-[1.12] text-white sm:text-[42px]">
          Your next job is one referral away.
        </h2>
        <p className="text-[15px] text-white/80 sm:text-base">
          Create a profile in a few minutes and start applying to roles posted by insiders.
        </p>
      </div>
      <div className="relative flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={onJoinNow}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white px-6 text-[15px] font-bold text-primary-hover transition-colors hover:bg-ink-wash sm:h-[54px]"
        >
          Create your free profile
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex h-12 items-center justify-center rounded-[14px] border border-white/40 px-6 text-[15px] font-bold text-white transition-colors hover:bg-white/10 sm:h-[54px]"
        >
          Log in
        </button>
      </div>
    </div>
  </section>
);
