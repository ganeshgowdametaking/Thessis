import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck } from 'lucide-react';

interface HeroProps {
  onJoinNow?: () => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const Hero: React.FC<HeroProps> = ({ onJoinNow }) => {
  const scrollToServices = () => {
    const el = document.getElementById('services');
    if (!el) return;
    // Self-driven animation: native smooth scroll gets cancelled by the
    // floating header's mid-scroll re-render
    const start = window.scrollY;
    const target = el.getBoundingClientRect().top + start - 16;
    if (document.hidden) {
      window.scrollTo(0, target);
      return;
    }
    const duration = 600;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      window.scrollTo(0, start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <section className="flex-grow flex flex-col justify-center relative overflow-hidden bg-parchment min-h-[560px] sm:min-h-[620px] lg:min-h-[680px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-24 relative z-10 w-full">
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center text-4xl sm:text-5xl lg:text-6xl font-poppins font-semibold text-ink tracking-[-0.04em] mb-10 sm:mb-12 lg:mb-16"
        >
          Connect. <span className="font-playfair italic font-semibold text-sage">Refer.</span> Succeed
        </motion.p>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left: message + CTAs */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7">
            <motion.p
              {...fadeUp}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-ink/70"
            >
              <span className="h-px w-8 bg-gold" aria-hidden="true" />
              Referrals from verified employees
            </motion.p>

            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-ink"
            >
              Find jobs through{' '}
              <span className="relative inline-block">
                people
                <svg
                  className="absolute -bottom-1.5 left-0 w-full"
                  viewBox="0 0 120 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6 Q 60 1 118 5"
                    fill="none"
                    stroke="#4353FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              , not portals.
            </motion.h1>

            <motion.p
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-xl leading-relaxed"
            >
              Connect with verified employees at top companies, get referred
              into real openings, and interview 10x more often than with cold
              applications.
            </motion.p>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1"
            >
              <button
                onClick={onJoinNow}
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-sage px-6 py-3.5 text-base font-bold text-white hover:bg-sage-dark transition-all"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={scrollToServices}
                className="inline-flex items-center justify-center rounded-lg border border-hairline-strong bg-white px-6 py-3.5 text-base font-bold text-slate-700 hover:bg-parchment-sunken transition-all"
              >
                See how it works
              </button>
            </motion.div>

          </div>

          {/* Right: referral card visual */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block lg:col-span-5 relative"
            aria-hidden="true"
          >
            <div className="absolute -top-4 -right-4 w-full h-full rounded-2xl bg-gold/15" />
            <div className="relative rounded-2xl bg-white border border-hairline shadow-xl shadow-ink/5 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-ink-wash flex items-center justify-center font-bold text-ink">
                    AK
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Ananya K.</p>
                    <p className="text-sm text-slate-500 leading-tight">Product Designer</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-gold-800">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Referred
                </span>
              </div>

              <div className="rounded-xl bg-parchment border border-hairline px-4 py-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Referred by <span className="font-bold text-ink">Rahul M.</span>
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-gold" />
                  Verified employee · Salesforce
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                {['Applied', 'Referred', 'Interview'].map((step, i) => (
                  <React.Fragment key={step}>
                    {i > 0 && <span className="flex-1 mx-2 h-px bg-hairline" />}
                    <span
                      className={
                        i < 2
                          ? 'flex items-center gap-1.5 text-xs font-bold text-ink'
                          : 'flex items-center gap-1.5 text-xs font-bold text-white bg-sage rounded-full px-3 py-1'
                      }
                    >
                      {i < 2 && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                      {step}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
