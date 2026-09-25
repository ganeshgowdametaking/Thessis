import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import HeroProductPreview from './HeroProductPreview';
import { scrollToSection } from '../utils/homeSections';

interface HeroProps {
  onJoinNow?: () => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const Hero: React.FC<HeroProps> = ({ onJoinNow }) => {
  return (
    <MotionConfig reducedMotion="user">
      {/* Pulled up by -mt-20/pt-20 so the background also sits behind the sticky header. */}
      <section className="relative -mt-20 overflow-hidden bg-parchment pt-20">
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

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.span
              {...fadeUp}
              transition={{ duration: 0.5 }}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-hairline bg-white py-0 pl-1 pr-3 text-[11.5px] font-bold text-slate-600 sm:h-[34px] sm:pr-3.5 sm:text-[13px]"
            >
              <span className="flex h-6 items-center gap-1 rounded-full bg-ink-wash px-2 text-[10.5px] text-primary-hover sm:text-[11.5px]">
                <Sparkles className="h-3 w-3" />
                Referral-first
              </span>
              <span className="hidden sm:inline">Every role is posted by someone who works there</span>
              <span className="sm:hidden">Roles posted by insiders</span>
            </motion.span>

            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.06 }}
              className="mt-5 font-display text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[72px] lg:leading-[1.02]"
            >
              Find jobs through{' '}
              <span className="inline-block -rotate-[1.5deg] rounded-xl bg-primary px-2.5 pb-1 text-white sm:rounded-[20px] sm:px-4 sm:pb-1.5">
                people
              </span>
              ,<br className="hidden sm:block" /> not portals.
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-lg"
            >
              Apply to roles posted by employees at the company, and get referred by someone on the inside.
              <span className="hidden sm:inline"> Referrers can post roles and review applicants in minutes.</span>
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row"
            >
              <button
                type="button"
                onClick={onJoinNow}
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(67,83,255,0.35)] transition-colors hover:bg-primary-hover sm:h-[54px]"
              >
                Create your free profile
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#how-it-works"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection('how-it-works');
                }}
                className="inline-flex h-[52px] items-center justify-center rounded-[14px] border border-hairline bg-white px-6 text-[15px] font-bold text-ink transition-colors hover:border-hairline-strong hover:bg-parchment sm:h-[54px]"
              >
                See how it works
              </a>
            </motion.div>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="mt-4 text-[13.5px] text-slate-500"
            >
              Hiring as a company?{' '}
              <Link to="/companies" className="font-bold text-primary hover:text-primary-hover">
                Post roles for free →
              </Link>
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28 }}
            className="mt-10 sm:mt-14 lg:mt-20"
          >
            <HeroProductPreview />
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
};

export default Hero;
