import React from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowDown, ArrowRight, Clock } from 'lucide-react';
import HeroProductPreview from './HeroProductPreview';
import {
  ONE_CLICK_SIGNUP_LINE,
  OPEN_ROLE_COMPANIES,
  REFERRER_RESPONSE_LINE,
  scrollToSection,
} from '../utils/homeSections';

interface HeroProps {
  onJoinNow?: () => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const HowItWorksLink: React.FC<{ className?: string }> = ({ className = '' }) => (
  <a
    href="#how-it-works"
    onClick={(event) => {
      event.preventDefault();
      scrollToSection('how-it-works');
    }}
    className={`items-center gap-1.5 text-[15px] font-bold text-slate-600 transition-colors hover:text-ink ${className}`}
  >
    How it works
    <ArrowDown className="h-4 w-4" />
  </a>
);

const Hero: React.FC<HeroProps> = ({ onJoinNow }) => {
  return (
    <MotionConfig reducedMotion="user">
      {/* Pulled up by -mt-20/pt-20 so the background also sits behind the sticky header. */}
      <section id="hero" className="relative -mt-20 overflow-hidden bg-parchment pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(20,20,43,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,43,0.045) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to bottom, black 75%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(67,83,255,0.22),rgba(67,83,255,0)_68%)] sm:h-[620px] sm:w-[620px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 top-[420px] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(124,134,255,0.18),rgba(124,134,255,0)_68%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.6 }}
              className="font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[72px] lg:leading-[1.02]"
            >
              Find jobs through{' '}
              <span className="inline-block -rotate-[1.5deg] rounded-xl bg-primary px-2.5 pb-1 text-white sm:rounded-[20px] sm:px-4 sm:pb-1.5">
                people
              </span>
              ,<br className="hidden sm:block" /> not portals.
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-slate-600 sm:mt-5 sm:text-lg"
            >
              Every role comes with someone on the inside who can refer you — so your application reaches a person, not a pile.
            </motion.p>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-4 flex items-start gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 text-left text-[12.5px] font-semibold leading-snug text-ink sm:mt-5 sm:items-center sm:rounded-full sm:px-4 sm:py-2 sm:text-sm"
            >
              <Clock className="mt-px h-4 w-4 shrink-0 text-primary sm:mt-0" aria-hidden="true" />
              {REFERRER_RESPONSE_LINE}
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-5 flex w-full flex-col items-center gap-2.5 sm:mt-7 sm:w-auto"
            >
              <div className="flex w-full items-center gap-6 sm:w-auto">
                <button
                  id="hero-cta"
                  type="button"
                  onClick={onJoinNow}
                  className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-7 text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(67,83,255,0.35)] transition-colors hover:bg-primary-hover sm:h-14 sm:w-auto sm:text-base"
                >
                  Start getting referred
                  <ArrowRight className="h-4 w-4" />
                </button>
                <HowItWorksLink className="hidden sm:inline-flex" />
              </div>
              <p className="text-xs text-slate-500 sm:text-[13.5px]">{ONE_CLICK_SIGNUP_LINE}</p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="mt-4 flex flex-col items-center gap-1.5 sm:mt-6 sm:flex-row sm:gap-3"
            >
              <span className="text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-slate-500 sm:text-[11px]">
                Open roles at
              </span>
              <span className="font-display text-[14px] font-extrabold text-ink sm:text-[15px]">
                {OPEN_ROLE_COMPANIES.join(' · ')}
              </span>
            </motion.div>

            <HowItWorksLink className="mt-4 inline-flex text-[13.5px] sm:hidden" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28 }}
            className="mt-10 sm:mt-14 lg:mt-16"
          >
            <HeroProductPreview />
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
};

export default Hero;
