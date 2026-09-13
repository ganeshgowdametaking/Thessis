import socialX from '../assets/social-x.png';
import socialInstagram from '../assets/social-instagram.png';
import socialLinkedin from '../assets/social-linkedin.png';

interface FooterProps {
  compact?: boolean;
  /** Authenticated app views: one-line utility strip instead of the marketing footer */
  slim?: boolean;
}

const Footer: React.FC<FooterProps> = ({ compact = false, slim = false }) => {
  if (slim) {
    return (
      <footer className="bg-parchment border-t border-hairline">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>© 2026 Thessis</span>
          <span aria-hidden="true">·</span>
          <a className="hover:text-ink transition-colors" href="/privacy-policy">Privacy</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-ink transition-colors" href="/cookie-policy">Cookies</a>
          <span aria-hidden="true">·</span>
          <a className="hover:text-ink transition-colors" href="/terms">Terms</a>
        </div>
      </footer>
    );
  }

  if (compact) {
    return (
      <footer className="bg-parchment-sunken border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center text-slate-900 min-w-0">
              <img
                src="/logo2.png?v=2"
                alt="Thessis Logo"
                className="h-8 w-8 object-contain shrink-0"
              />
              <span className="ml-2 font-bold font-display text-sm text-slate-900 truncate">Thessis</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://x.com/thessisngl?s=11"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-80 hover:opacity-100 transition-opacity"
                aria-label="X"
              >
                <img src={socialX} alt="X" className="h-4 w-4 object-contain brightness-0" />
              </a>
              <a
                href="https://www.instagram.com/thethessis/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Instagram"
              >
                <img src={socialInstagram} alt="Instagram" className="h-5 w-5 object-contain brightness-0" />
              </a>
              <a
                href="https://www.linkedin.com/company/thessisai/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-80 hover:opacity-100 transition-opacity"
                aria-label="LinkedIn"
              >
                <img src={socialLinkedin} alt="LinkedIn" className="h-5 w-5 object-contain brightness-0" />
              </a>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <a className="hover:text-sage transition-colors" href="/privacy-policy">
              Privacy
            </a>
            <a className="hover:text-sage transition-colors" href="/cookie-policy">
              Cookies
            </a>
            <a className="hover:text-sage transition-colors" href="/terms">
              Terms
            </a>
            <a className="hover:text-sage transition-colors" href="mailto:info@thessis.com">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-parchment-sunken border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center text-slate-900">
              <img
                src="/logo2.png?v=2"
                alt="Thessis Logo"
                className="h-8 w-8 object-contain"
              />
              <span className="ml-3 font-bold font-display text-xl text-slate-900">Thessis</span>
            </div>
            <p className="text-slate-400 text-sm">© 2026 Thessis. All rights reserved.</p>
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
              <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="/cookie-policy">
                Cookie Policy
              </a>
              <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="mailto:info@thessis.com">
                Contact Support
              </a>
            </div>

            {/* Socials */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <span className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-2">Socials</span>
              <div className="flex gap-4 items-center">
                <a
                  href="https://x.com/thessisngl?s=11"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity"
                >
                  <img src={socialX} alt="X" className="h-5 w-5 object-contain brightness-0" />
                </a>
                <a
                  href="https://www.instagram.com/thethessis/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity"
                >
                  <img src={socialInstagram} alt="Instagram" className="h-6 w-6 object-contain brightness-0" />
                </a>
                <a
                  href="https://www.linkedin.com/company/thessisai/"
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
