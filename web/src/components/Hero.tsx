import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
  onJoinNow?: () => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

const Hero: React.FC<HeroProps> = ({ onJoinNow }) => {
  return (
    <section className="flex-grow flex flex-col justify-center relative z-10 min-h-[236px] sm:min-h-[224px] lg:min-h-[280px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 lg:pt-4 pb-14 sm:pb-16 lg:pb-24 relative z-10 w-full">
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center text-4xl sm:text-5xl lg:text-6xl font-poppins font-semibold text-[#1C1C1C] tracking-[-0.04em] mb-4 sm:mb-5 lg:mb-6"
        >
          Connect. <span className="font-playfair italic font-semibold text-sage">Refer.</span> Succeed
        </motion.p>
        <div className="mx-auto max-w-3xl flex flex-col items-center text-center space-y-6 sm:space-y-7">
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-inter text-[19.2px] sm:text-[21.6px] lg:text-[24px] font-[450] tracking-tight leading-[1.05] text-[#1C1C1C]"
          >
            Find jobs through people, not portals
          </motion.h1>
        </div>
      </div>
    </section>
  );
};

export default Hero;
