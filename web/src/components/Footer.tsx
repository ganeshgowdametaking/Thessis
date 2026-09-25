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
                src="/brand/thessis-logo-primary.svg"
                alt="Thessis"
                className="h-6 w-auto shrink-0"
              />
            </div>

            <div className="flex items-center gap-5 shrink-0">
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
                src="/brand/thessis-logo-primary.svg"
                alt="Thessis"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-slate-500 text-sm">Find jobs through people, not portals.</p>
            <p className="text-slate-400 text-sm">© 2026 Thessis. All rights reserved.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-12 md:gap-24 w-full md:w-auto justify-center md:justify-end">
            {/* Product Links */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <span className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-2">Product</span>
              <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="/companies">
                For companies
              </a>
              <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="/signup">
                Sign up
              </a>
              <a className="text-slate-500 hover:text-sage text-sm font-medium transition-colors" href="/login">
                Log in
              </a>
            </div>

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
              <div className="flex gap-6 items-center">
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
