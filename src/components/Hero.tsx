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
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight text-white lg:text-6xl">
                Connect. Refer. <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Succeed.</span>
              </h1>
              <p className="text-xl leading-relaxed text-slate-300">
                TankTide is the premier professional networking platform where opportunities flow through trusted referrals. Find jobs through people, not
                portals. Build meaningful connections, discover exclusive job opportunities, and grow your career through the power of referrals.
              </p>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl backdrop-blur-lg">
              <div className="flex items-start space-x-4">
                <div className="rounded-xl border border-blue-700 bg-blue-900/50 p-3">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-white">Real Connections</h3>
                  <p className="text-slate-300">Build relationships with professionals who guide you to opportunities. Get Started Today.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl backdrop-blur-lg">
              <div className="flex items-start space-x-4">
                <div className="rounded-xl border border-cyan-700 bg-cyan-900/50 p-3">
                  <Briefcase className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-white">Real Opportunities</h3>
                  <p className="text-slate-300">Access jobs that match your skills through trusted insights.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl backdrop-blur-lg">
              <div className="flex items-start space-x-4">
                <div className="rounded-xl border border-green-700 bg-green-900/50 p-3">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-white">Real Success</h3>
                  <p className="text-slate-300">Land roles where you thrive, with teams that value you.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support Section */}
        <div className="mt-12 border-t border-slate-700/50 pt-8 text-center">
          <div className="flex items-center justify-center space-x-2 text-slate-300">
            <Mail className="h-5 w-5 text-blue-400" />
            <span>
              Contact Support:{' '}
              <a href="mailto:info@tanktide.com" className="text-blue-400 transition-colors hover:text-blue-300">
                info@tanktide.com
              </a>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero