import { motion } from 'framer-motion';
import capgeminiLogo from '../assets/logo-capgemini.png';
import tcsLogo from '../assets/logo-tcs.png';
import salesforceLogo from '../assets/logo-salesforce.png';
import charlesHudsonLogo from '../assets/logo-charles-hudson.png';
import deloitteLogo from '../assets/logo-deloitte.png';
import DashboardPreviewMock from './DashboardPreviewMock';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const Services = () => {
  return (
    <section id="services" className="bg-parchment py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-16">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-lg md:text-xl font-extrabold text-slate-900 mb-7 md:mb-10"
          >
            The preferred referral platform for top performers across the industry
          </motion.h2>

          {/* Trust Logos Row */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-wrap justify-center items-center gap-6 md:gap-12 mb-12 md:mb-24 opacity-60 grayscale md:hover:grayscale-0 transition-all duration-700"
          >
            <img src={capgeminiLogo} alt="Capgemini" className="h-6 md:h-10 w-auto object-contain" />
            <img src={tcsLogo} alt="TCS" className="h-7 md:h-12 w-auto object-contain" />
            <img src={salesforceLogo} alt="Salesforce" className="h-7 md:h-12 w-auto object-contain" />
            <img src={charlesHudsonLogo} alt="Charles Hudson" className="h-6 md:h-10 w-auto object-contain" />
            <img src={deloitteLogo} alt="Deloitte" className="h-6 md:h-10 w-auto object-contain" />
          </motion.div>

          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 md:mb-4"
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

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-0 items-center">
          {/* Dashboard Preview Image - Left Side (Maximized Size) */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="w-full lg:w-[70%] z-10"
          >
            <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-lg lg:shadow-2xl transition-transform duration-500 lg:hover:scale-[1.005]">
              <DashboardPreviewMock />
            </div>
          </motion.div>

          {/* Feature Cards - Overlapping Right Side (Wider & Spaced) */}
          <div className="flex flex-col justify-between w-full lg:w-[50%] lg:-ml-48 relative z-20 lg:self-stretch py-0 lg:py-8 gap-3 md:gap-4 lg:gap-0">
            {[
              {
                title: 'CONNECT',
                copy: 'Every referrer is authenticated via corporate email or LinkedIn',
              },
              {
                title: 'REFER',
                copy: '10x higher interview rate than direct applications',
              },
              {
                title: 'SUCCESS',
                copy: 'Referrers earn company bonuses & Seekers land dream roles',
              },
            ].map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, x: 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
                className="group bg-white/90 backdrop-blur-sm py-4 md:py-6 px-5 md:px-10 rounded-2xl shadow-sm lg:shadow-xl lg:hover:shadow-2xl transition-all border border-slate-100 flex gap-4 md:gap-8 items-start"
              >
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1.5 md:mb-2 uppercase">{card.title}</h3>
                  <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                    {card.copy}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
