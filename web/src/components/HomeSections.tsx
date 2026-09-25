import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getCompanyLogoUrl } from '../utils/companyLogo';
import { REFERRER_COMPANIES } from '../utils/homeSections';

interface HomeCtaProps {
  onJoinNow?: () => void;
}

const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
  <h2 className="text-center font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink sm:text-[42px]">{title}</h2>
);

// ---------- Company strip ----------

// Our own mark comes from the brand kit rather than the logo service.
const LOCAL_LOGOS: Record<string, string> = { Thessis: '/brand/thessis-symbol-indigo.svg' };

const CompanyMark: React.FC<{ name: string }> = ({ name }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = LOCAL_LOGOS[name] ?? getCompanyLogoUrl(name, 200);
  // Logo only; the name shows as text just if the logo can't be loaded. Multiply blending hides the
  // white box most logo images come with, so they sit directly on the cream background.
  if (logoUrl && !logoFailed) {
    return (
      <img
        src={logoUrl}
        alt=""
        onError={() => setLogoFailed(true)}
        className="h-[70px] w-[70px] shrink-0 rounded-xl object-contain mix-blend-multiply"
      />
    );
  }
  return <span className="shrink-0 whitespace-nowrap font-display text-2xl font-bold text-slate-500">{name}</span>;
};

export const HomeCompanyStrip: React.FC = () => {
  // Two copies of the list per half, so each half is wider than the screen and the loop never shows a gap.
  const half = [...REFERRER_COMPANIES, ...REFERRER_COMPANIES];
  return (
    <section aria-label="Companies where you can get referred" className="bg-parchment py-9 sm:py-11">
      <p className="px-4 text-center text-[26px] font-semibold leading-tight text-slate-500">Get referred by trusted employees at</p>
      <p className="sr-only">{REFERRER_COMPANIES.join(', ')}</p>

      <div
        aria-hidden="true"
        className="thessis-marquee mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <div className="thessis-marquee-track w-max bg-parchment">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-16 pr-16">
              {half.map((name, index) => (
                <CompanyMark key={`${copy}-${index}`} name={name} />
              ))}
            </div>
          ))}
        </div>
        <div className="thessis-marquee-static flex-wrap items-center justify-center gap-x-12 gap-y-4 bg-parchment px-4">
          {REFERRER_COMPANIES.map((name) => (
            <CompanyMark key={name} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
};

// ---------- How it works ----------

type Track = 'seekers' | 'employees';

const TRACKS: Record<Track, { tab: string; tag: string; title: string; steps: string[] }> = {
  seekers: {
    tab: 'Job seekers',
    tag: 'Job seekers',
    title: 'Get referred, not ignored',
    steps: ['Build your profile', 'Apply to referral roles', 'Get referred'],
  },
  employees: {
    tab: 'Employees',
    tag: 'Employees',
    title: 'Refer great people',
    steps: ['Post a role at your company', 'Review applicants', 'Refer the best'],
  },
};

// One step: numbered tile, dashed connector, title card. The final step (the outcome) is highlighted.
const StepRow: React.FC<{ number: number; title: string; highlighted: boolean }> = ({ number, title, highlighted }) => (
  <li className="flex items-center">
    <span
      aria-hidden="true"
      className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(20,20,43,0.06)] sm:h-20 sm:w-20 ${
        highlighted ? 'bg-primary' : 'border border-hairline bg-white'
      }`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full font-display text-base font-extrabold text-ink sm:h-12 sm:w-12 sm:text-lg ${highlighted ? 'bg-white' : 'bg-parchment-sunken'}`}>
        {String(number).padStart(2, '0')}
      </span>
    </span>
    <span aria-hidden="true" className={`w-5 shrink-0 border-t-2 border-dashed sm:w-8 ${highlighted ? 'border-primary' : 'border-slate-200'}`} />
    <span
      className={`flex min-h-[72px] flex-1 items-center rounded-2xl px-5 py-4 font-display text-[17px] font-extrabold shadow-[0_6px_18px_rgba(20,20,43,0.06)] sm:min-h-20 sm:px-6 sm:text-lg ${
        highlighted ? 'bg-primary text-white' : 'border border-hairline bg-white text-ink'
      }`}
    >
      {title}
    </span>
  </li>
);

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

      <div className="mx-auto mt-6 grid max-w-[1120px] gap-12 md:mt-12 md:grid-cols-2 md:gap-10">
        {(Object.keys(TRACKS) as Track[]).map((key) => {
          const item = TRACKS[key];
          return (
            <div key={key} className={`${track === key ? 'flex' : 'hidden md:flex'} flex-col gap-6`}>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-primary">{item.tag}</span>
                <h3 className="font-display text-xl font-extrabold text-ink sm:text-2xl">{item.title}</h3>
              </div>
              <ol className="flex flex-col gap-4">
                {item.steps.map((step, index) => (
                  <StepRow key={step} number={index + 1} title={step} highlighted={index === item.steps.length - 1} />
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

const FeatureTile: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-4 rounded-[22px] border border-hairline bg-white p-5 sm:p-[26px]">
    <div aria-hidden="true" className="flex min-h-[130px] flex-1 items-center justify-center rounded-[14px] bg-parchment px-4">
      {children}
    </div>
    <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
  </div>
);

export const HomeFeatures: React.FC = () => (
  <section id="features" className="scroll-mt-24 bg-parchment px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
    <SectionHeading title="What you get" />
    <div className="mx-auto mt-8 grid max-w-[1120px] gap-4 sm:mt-10 lg:grid-cols-3 lg:gap-[18px]">
      <FeatureTile title="AI resume match">
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
      <FeatureTile title="Verified work emails">
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-success-tint px-3.5 py-2.5 text-[13px] font-bold text-success-ink">
          <ShieldCheck className="h-4 w-4" />
          Work email verified
        </span>
      </FeatureTile>
      <FeatureTile title="Messages">
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
      <button
        type="button"
        onClick={onJoinNow}
        className="relative inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-white px-6 text-[15px] font-bold text-primary-hover transition-colors hover:bg-ink-wash sm:h-[54px] sm:self-start lg:self-auto"
      >
        Start getting referred
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </section>
);

// ---------- Phones: sign-up bar that stays in reach between the hero and the closing banner ----------

export const HomeStickyCta: React.FC<HomeCtaProps> = ({ onJoinNow }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => {
      // Show once the hero headline has scrolled away, hide again when the closing banner arrives.
      const heroHeading = document.getElementById('hero-heading');
      const finalCta = document.getElementById('get-started');
      const pastHeading = heroHeading ? heroHeading.getBoundingClientRect().bottom < 0 : false;
      const beforeFinal = finalCta ? finalCta.getBoundingClientRect().top > window.innerHeight : true;
      setShow(pastHeading && beforeFinal);
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
