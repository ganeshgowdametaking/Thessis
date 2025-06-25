import React from 'react'
import { Link } from 'react-router-dom'
import { Users, Briefcase, TrendingUp, Mail } from 'lucide-react'

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 pb-20 pt-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="animate-pulse absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500 mix-blend-multiply filter blur-xl"></div>
        <div className="animate-pulse delay-1000 absolute right-10 top-40 h-72 w-72 rounded-full bg-cyan-500 mix-blend-multiply filter blur-xl"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight text-white lg:text-6xl">
                Connect. Refer. <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Succeed.</span>
              </h1>
              <p className="text-xl leading-relaxed text-slate-300">
                Find jobs through people, not portals. Build meaningful connections and grow your career through the power of referrals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero