import React from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, TrendingUp, Mail } from 'lucide-react'
import Waves from './Waves'
import SplitText from './SplitText'

const Hero: React.FC = () => {
  const handleAnimationComplete = () => {
    console.log('All letters have animated!');
  };

  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 pb-20 pt-16 min-h-[11.025vh] md:min-h-[16.5375vh]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="animate-pulse absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500 mix-blend-multiply filter blur-xl"></div>
        <div className="animate-pulse delay-1000 absolute right-10 top-40 h-72 w-72 rounded-full bg-cyan-500 mix-blend-multiply filter blur-xl"></div>
      </div>

      {/* Waves Background */}
      <Waves
        lineColor="#fff"
        backgroundColor="transparent"
        waveSpeedX={0.02}
        waveSpeedY={0.01}
        waveAmpX={40}
        waveAmpY={20}
        friction={0.9}
        tension={0.01}
        maxCursorMove={120}
        xGap={12}
        yGap={36}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center min-h-[28vh] md:min-h-[42vh]">
        <div className="grid items-center gap-12 w-full">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight text-white lg:text-6xl flex flex-wrap items-baseline">
                <SplitText
                  text="Connect.  "
                  className="text-white font-inter font-800"
                  delay={50}
                  duration={0.8}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 40 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.1}
                  rootMargin="-100px"
                  textAlign="left"
                  onLetterAnimationComplete={handleAnimationComplete}
                />
                <SplitText
                  text="Refer.  "
                  className="text-white font-inter font-800"
                  delay={50}
                  duration={0.8}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 40 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.1}
                  rootMargin="-100px"
                  textAlign="left"
                  onLetterAnimationComplete={handleAnimationComplete}
                />
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-inter font-800">Succeed.</span>
              </h1>
              <SplitText
                text="Find jobs through people, not portals. Build meaningful connections and grow your career through the power of referrals."
                className="text-xl leading-relaxed text-white font-inter font-400"
                delay={30}
                duration={0.6}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 20 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="-50px"
                textAlign="left"
                onLetterAnimationComplete={handleAnimationComplete}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero