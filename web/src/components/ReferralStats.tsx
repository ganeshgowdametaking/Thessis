import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { number: '13', unit: '×', unitOffset: 'top-[0.117em]', label: 'More interviews' },
  { number: '30', unit: '%', unitOffset: 'top-0', label: 'Referral hire rate vs 7% from job boards' },
  { number: '29', unit: ' days', unitOffset: 'top-0', label: 'Average time to hire' },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const ReferralStats: React.FC = () => {
  return (
    <section className="bg-ink-deep">
      <motion.div
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUp}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 lg:py-16 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12"
      >
        <h2 className="font-poppins text-xl sm:text-2xl lg:text-3xl font-semibold text-white leading-tight lg:max-w-sm">
          Backed by hiring data from thousands of referrals.
        </h2>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-6 lg:gap-x-12 lg:ml-auto shrink-0">
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && (
                <span className="hidden sm:block h-12 w-px bg-white/15" aria-hidden="true" />
              )}
              <div>
                <p className="font-poppins text-4xl sm:text-5xl font-bold text-gold">
                  {stat.number}
                  <span className={`text-xl sm:text-2xl align-baseline relative ${stat.unitOffset}`}>
                    {stat.unit}
                  </span>
                </p>
                <p className="font-poppins mt-1 text-sm text-white/60">{stat.label}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default ReferralStats;
