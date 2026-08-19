import { motion } from 'framer-motion';
import DashboardPreviewMock from './DashboardPreviewMock';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const Services = () => {
  return (
    <section id="services" className="relative z-10 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-16">

          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl md:text-3xl font-bold text-[#1C1C1C] mb-3 md:mb-4"
          >
            Better Referrals. Zero Friction
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-slate-500 text-sm md:text-base max-w-xl md:max-w-2xl mx-auto"
          >
            Connect with verified roles through our high precision referral engine
          </motion.p>
        </div>

        <div className="flex items-center">
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="w-full max-w-4xl mx-auto"
          >
            {/* Laptop frame: thin, uniform dark bezel around the screen, no base. */}
            <div className="rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-1 sm:p-1.5 shadow-lg lg:shadow-2xl transition-transform duration-500 lg:hover:scale-[1.005]">
              <div className="relative rounded-md overflow-hidden border border-slate-950/40">
                <DashboardPreviewMock />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Services;
