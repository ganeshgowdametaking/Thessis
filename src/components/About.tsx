import React from 'react';
import { Target, Eye, Heart, Users } from 'lucide-react';

const About = () => {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                About{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  TankTide
                </span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                TankTide was born from the understanding that the best opportunities often come through personal connections. 
                We've created a platform that harnesses the power of professional referrals to create meaningful career opportunities.
              </p>
            </div>

            {/* Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Mission</h4>
                  <p className="text-sm text-gray-600">Connecting talent with opportunity through trusted referrals</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-cyan-100 p-2 rounded-lg">
                  <Eye className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Vision</h4>
                  <p className="text-sm text-gray-600">A world where everyone has access to career opportunities</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Heart className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Values</h4>
                  <p className="text-sm text-gray-600">Trust, authenticity, and mutual success</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Community</h4>
                  <p className="text-sm text-gray-600">Building lasting professional relationships</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;