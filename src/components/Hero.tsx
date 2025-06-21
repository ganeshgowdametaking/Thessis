import React from 'react';
import { Users, Briefcase, TrendingUp, Mail } from 'lucide-react';

const Hero = () => {
  return (
    <section id="home" className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 pt-16 pb-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Connect. Refer.{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Succeed.
                </span>
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                TankTide is the premier professional networking platform where opportunities flow through trusted referrals. 
                Find jobs through people, not portals. Build meaningful connections, discover exclusive job opportunities, and grow your career through the power of referrals.
              </p>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-slate-700">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-900/50 p-3 rounded-xl border border-blue-700">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Real Connections</h3>
                  <p className="text-slate-300">Build relationships with professionals who guide you to opportunities. Get Started Today.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-slate-700">
              <div className="flex items-start space-x-4">
                <div className="bg-cyan-900/50 p-3 rounded-xl border border-cyan-700">
                  <Briefcase className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Real Opportunities</h3>
                  <p className="text-slate-300">Access jobs that match your skills through trusted insights.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-lg p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-slate-700">
              <div className="flex items-start space-x-4">
                <div className="bg-green-900/50 p-3 rounded-xl border border-green-700">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Real Success</h3>
                  <p className="text-slate-300">Land roles where you thrive, with teams that value you.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact Support Section */}
        <div className="mt-12 pt-8 border-t border-slate-700/50 text-center">
          <div className="flex items-center justify-center space-x-2 text-slate-300">
            <Mail className="h-5 w-5 text-blue-400" />
            <span>Contact Support: <a href="mailto:info@tanktide.com" className="text-blue-400 hover:text-blue-300 transition-colors">info@tanktide.com</a></span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;