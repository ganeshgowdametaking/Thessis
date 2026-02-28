import React from 'react';
import heroDots from '../assets/hero-dots.png';

const Hero: React.FC = () => {
  return (
    <section className="flex-grow flex flex-col justify-center relative overflow-hidden bg-white min-h-[600px]">
      {/* Background Dots Image - anchored to top-right, covering right half */}
      <div className="absolute top-0 right-0 w-1/2 h-full z-0 overflow-hidden pointer-events-none select-none">
        <img
          src={heroDots}
          alt=""
          className="w-full h-full object-cover object-left-top opacity-80"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10 w-full">
        <div className="space-y-8">
          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.8] flex flex-col items-start gap-2">
            <span className="text-slate-900 block">Connect. Refer.</span>
            <span className="text-sage block">Succeed.</span>
          </h1>

          <p className="text-2xl font-semibold text-slate-900 max-w-2xl tracking-tight leading-tight">
            Find jobs through people, not portals.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Hero;