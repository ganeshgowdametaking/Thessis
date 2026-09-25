import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { ONE_CLICK_SIGNUP_LINE } from '../utils/homeSections';

interface HomeCtaProps {
  onJoinNow?: () => void;
}

const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
  <h2 className="text-center font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-[42px]">{title}</h2>
);

// ---------- How it works ----------

type Track = 'seekers' | 'employees';

const TRACKS: Record<Track, { tab: string; tag: string; title: string; steps: { title: string; body?: string }[] }> = {
  seekers: {
    tab: 'Job seekers',
    tag: 'For job seekers',
    title: 'Get referred, not ignored',
    steps: [
      { title: 'Build your profile', body: 'Add your experience, skills and a photo.' },
      { title: 'Apply to referral roles' },
      { title: 'Get referred', body: "We'll email you the moment you're referred." },
    ],
  },
  employees: {
    tab: 'Employees',
    tag: 'For employees',
    title: 'Refer great people',
    steps: [
      { title: 'Post a role at your company', body: 'Paste a job link or upload the PDF — we fill in the details.' },
      { title: 'Review applicants', body: 'Each resume gets an AI match score with the reasons behind it.' },
      { title: 'Refer the best', body: "Shortlist, then mark them referred — they're emailed instantly." },
    ],
  },
};

export const HomeHowItWorks: React.FC = () => {
  const [track, setTrack] = useState<Track>('seekers');

  return (
    <section id="how-it-works" className="scroll-mt-24 bg-parchment px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <SectionHeading title="Two sides of every referral" />

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
                  <li key={step.title} className={`flex gap-3.5 ${step.body ? '' : 'items-center'}`}>
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink-wash font-display text-sm font-extrabold text-primary-hover">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-ink">{step.title}</span>
                      {step.body && <span className="text-[13.5px] leading-relaxed text-slate-500">{step.body}</span>}
                    </div>
                  </li>
                ))}
              </ol>
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
    <SectionHeading title="What you get" />
    <div className="mx-auto mt-8 grid max-w-[1120px] gap-4 sm:mt-10 lg:grid-cols-3 lg:gap-[18px]">
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
      <FeatureTile title="Messages" body="Talk to the person who can refer you.">
        <div className="flex w-full max-w-[220px] flex-col gap-1.5">
          <span className="self-start rounded-xl rounded-bl border border-hairline bg-white px-3 py-2 text-xs text-ink">Happy to refer you!</span>
          <span className="self-end rounded-xl rounded-br bg-primary px-3 py-2 text-xs text-white">Thank you 🙏</span>
        </div>
      </FeatureTile>
    </div>
  </section>
);

// ---------- Final call to action ----------

export const HomeFinalCta: React.FC<HomeCtaProps> = ({ onJoinNow }) => (
  <section id="get-started" className="bg-parchment px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
    <div className="relative mx-auto flex max-w-[1120px] flex-col gap-6 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#4353FF_0%,#2F39C7_100%)] p-6 sm:rounded-[28px] sm:p-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-16">
      <img
        src="/brand/thessis-symbol-white.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 right-10 hidden h-[260px] w-auto opacity-[0.12] sm:block"
      />
      <h2 className="relative max-w-[560px] font-display text-[26px] font-extrabold leading-[1.12] text-white sm:text-[42px]">
        Your next job is one referral away.
      </h2>
      <div className="relative flex shrink-0 flex-col items-stretch gap-2.5 sm:items-start lg:items-center">
        <button
          type="button"
          onClick={onJoinNow}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white px-6 text-[15px] font-bold text-primary-hover transition-colors hover:bg-ink-wash sm:h-[54px]"
        >
          Start getting referred
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-center text-xs text-white/85 sm:text-[12.5px]">{ONE_CLICK_SIGNUP_LINE}</p>
      </div>
    </div>
  </section>
);

// ---------- Phones: sign-up bar that stays in reach between the hero and the closing banner ----------

export const HomeStickyCta: React.FC<HomeCtaProps> = ({ onJoinNow }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => {
      // Show once the hero's own button has scrolled away, hide again when the closing banner arrives.
      const heroCta = document.getElementById('hero-cta');
      const finalCta = document.getElementById('get-started');
      const pastHeroCta = heroCta ? heroCta.getBoundingClientRect().bottom < 0 : false;
      const beforeFinal = finalCta ? finalCta.getBoundingClientRect().top > window.innerHeight : true;
      setShow(pastHeroCta && beforeFinal);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(20,20,43,0.08)] backdrop-blur transition-transform duration-300 md:hidden ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
    >
      <button
        type="button"
        onClick={onJoinNow}
        tabIndex={show ? 0 : -1}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-white transition-colors hover:bg-primary-hover"
      >
        Start getting referred
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};
