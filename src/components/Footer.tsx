import React from 'react';
import { Mail, Linkedin, Instagram } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">TankTide</h3>
            <p className="text-slate-400 text-sm">
              The premier professional networking platform where opportunities flow through trusted referrals.
            </p>
            <div className="mt-4 flex items-center space-x-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <a href="mailto:info@tanktide.com" className="text-slate-400 hover:text-white transition-colors text-sm">
                info@tanktide.com
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} TankTide Inc. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <div className="flex space-x-4">
              <a href="https://www.linkedin.com/company/tanktide/posts/?feedView=all" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/tanktideberlin?igsh=MWJ2YXhreWRkbjhjOA==" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                <span className="sr-only">Instagram</span>
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://x.com/tanktide77291?s=11" className="text-slate-400 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                <span className="sr-only">X</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.53 3H21L14.19 10.91L22.24 21H16.16L11.38 14.78L5.94 21H2.23L9.47 12.62L2 3H8.16L12.47 8.7L17.53 3ZM16.37 19.13H18.19L7.72 4.74H5.77L16.37 19.13Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;