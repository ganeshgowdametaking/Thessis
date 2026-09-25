import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import HeroProductPreview from './HeroProductPreview';

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const Hero: React.FC = () => {
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
        {/* Glows fade out before the hero's bottom edge, so they never end in a hard line. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
        >
          <div className="absolute -right-32 -top-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(67,83,255,0.22),rgba(67,83,255,0)_68%)] sm:h-[620px] sm:w-[620px]" />
          <div className="absolute -left-40 top-[420px] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(124,134,255,0.18),rgba(124,134,255,0)_68%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.h1
              id="hero-heading"
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
          </div>
          <div className="mobile-hero-cta md:hidden"><Link to="/signup">Find your next opportunity</Link></div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
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
