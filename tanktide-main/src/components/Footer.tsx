import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-stone border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center justify-center text-slate-900 mb-4">
            <img 
              src="/logo2.png" 
              alt="TankTide Logo" 
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="/privacy-policy">
              Privacy Policy
            </a>
            <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="/terms">
              Terms of Service
            </a>
            <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="mailto:info@tanktide.com">
              Contact Support
            </a>
          </div>
          <p className="text-slate-400 text-sm mt-4">© 2024 TankTide. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;