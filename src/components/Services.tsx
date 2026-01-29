import React from 'react';
import { Users, Briefcase, Zap } from 'lucide-react';

const Services = () => {
  const features = [
    {
      icon: Users,
      title: 'Professional Networking',
      description: 'Connect with industry professionals, build meaningful relationships, and expand your network organically.',
      color: 'blue'
    },
    {
      icon: Briefcase,
      title: 'Referral Job Portal',
      description: 'Post referral opportunities and apply for positions through trusted connections in your network.',
      color: 'cyan'
    },
    {
      icon: Zap,
      title: 'Smart Matching',
      description: 'AI-powered algorithms match you with relevant opportunities and connections based on your profile.',
      color: 'pink'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      pink: 'bg-pink-100 text-pink-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Connecting You to Careers That{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Rise with the Tide
            </span>
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              <div className={`inline-flex p-4 rounded-xl mb-6 ${getColorClasses(feature.color)}`}>
                <feature.icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;