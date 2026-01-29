import React from 'react';
import Particles from './Particles';
import BlurText from './BlurText';

const About = () => {
  const handleAnimationComplete = () => {
    console.log('Animation completed!');
  };

  return (
    <section id="about" className="py-20 bg-slate-900 relative overflow-hidden border-b border-white">
      {/* Particles Background */}
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: 0,
          pointerEvents: 'auto'
        }}
      >
        <Particles
          particleColors={['#ffffff', '#ffffff', '#ffffff']}
          particleCount={150}
          particleSpread={8}
          speed={0.05}
          particleBaseSize={80}
          moveParticlesOnHover={true}
          particleHoverFactor={3}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" style={{ pointerEvents: 'none' }}>
        <div className="grid lg:grid-cols-2 gap-16 items-center" style={{ pointerEvents: 'none' }}>
          {/* Left Content */}
          <div className="space-y-8" style={{ pointerEvents: 'none' }}>
            <div>
              <div className="text-4xl font-bold mb-6">
                <BlurText
                  text="About TankTide"
                  delay={100}
                  animateBy="words"
                  direction="top"
                  onAnimationComplete={handleAnimationComplete}
                  className="text-white"
                />
              </div>
              <p className="text-lg text-white leading-relaxed mb-6">
                TankTide was born from the understanding that the best opportunities often come through personal connections. 
                We've created a platform that harnesses the power of professional referrals to create meaningful career opportunities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;