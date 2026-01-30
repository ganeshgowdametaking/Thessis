import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="flex-grow flex flex-col justify-center relative overflow-hidden">
      {/* SVG Filter Definition */}
      <svg width="0" height="0">
        <filter id="cracks">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="5"
            seed="10"
            result="noise"
          />
          <feColorMatrix
            type="luminanceToAlpha"
            in="noise"
            result="alphaNoise"
          />
          <feComponentTransfer in="alphaNoise" result="plates">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feConvolveMatrix
            order="3 3"
            kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1"
            in="plates"
            result="edges"
          />
          <feComponentTransfer in="edges" result="invertedEdges">
            <feFuncR type="table" tableValues="1 0" />
            <feFuncG type="table" tableValues="1 0" />
            <feFuncB type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feFlood floodColor="#000" result="bgColor" />
          <feComposite operator="in" in="bgColor" in2="invertedEdges" />
        </filter>
      </svg>
      
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-sage/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/4"></div>
      <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-sage/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/4"></div>
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
        <div className="max-w-4xl mx-auto flex justify-center">
          <div className="relative inline-block px-10 py-10 cracked-wrapper">
            {/* Cracked background */}
            <div className="cracked-earth"></div>
            
            {/* Text content */}
            <div className="relative z-10 flex flex-col gap-8 text-center items-center">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
                Connect. Refer. <br/>
                <span className="text-sage bg-clip-text text-transparent bg-gradient-to-r from-sage-dark to-sage">
                  Succeed.
                </span>
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
                Find jobs through people, not portals. Build meaningful connections and grow your career through the power of referrals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;