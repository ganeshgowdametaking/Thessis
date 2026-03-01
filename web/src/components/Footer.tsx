import socialX from '../assets/social-x.png';
import socialInstagram from '../assets/social-instagram.png';
import socialLinkedin from '../assets/social-linkedin.png';

const Footer: React.FC = () => {
  return (
    <footer className="bg-stone border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center text-slate-900">
              <img
                src="/logo2.png"
                alt="TankTide Logo"
                className="h-10 w-10 object-contain filter-sage"
              />
              <span className="ml-3 font-bold text-xl text-slate-900">TankTide</span>
            </div>
            <p className="text-slate-400 text-sm">© 2024 TankTide. All rights reserved.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-12 md:gap-24 w-full md:w-auto justify-center md:justify-end">
            {/* Legal Links */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <span className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-2">Legal</span>
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

            {/* Socials */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <span className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-2">Socials</span>
              <div className="flex gap-4 items-center">
                <a
                  href="https://x.com/tanktide?s=21"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity"
                >
                  <img src={socialX} alt="X" className="h-5 w-5 object-contain brightness-0" />
                </a>
                <a
                  href="https://www.instagram.com/tanktideorg?igsh=MWJ2YXhreWRkbjhjOA=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity"
                >
                  <img src={socialInstagram} alt="Instagram" className="h-6 w-6 object-contain brightness-0" />
                </a>
                <a
                  href="https://www.linkedin.com/company/tanktide/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity"
                >
                  <img src={socialLinkedin} alt="LinkedIn" className="h-6 w-6 object-contain brightness-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
