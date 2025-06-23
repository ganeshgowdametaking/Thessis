import React from 'react';
import { Users, Briefcase, MessageSquare, Award, Shield, Zap } from 'lucide-react';

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
      icon: MessageSquare,
      title: 'Interactive Feed',
      description: 'Share insights, engage with content, and stay updated with the latest industry trends and opportunities.',
      color: 'green'
    },
    {
      icon: Award,
      title: 'Profile Showcase',
      description: 'Create a comprehensive professional profile that highlights your skills, experience, and achievements.',
      color: 'purple'
    },
    {
      icon: Shield,
      title: 'Trusted Referrals',
      description: 'Our verification system ensures authentic referrals and maintains the integrity of our platform.',
      color: 'orange'
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
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
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
            Everything You Need for{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Professional Success
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            TankTide provides a comprehensive suite of tools and features designed to accelerate your career 
            through the power of professional networking and referrals.
          </p>
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

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Career?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join thousands of professionals who are already leveraging the power of referrals to advance their careers.
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;