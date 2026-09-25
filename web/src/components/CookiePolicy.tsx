import React, { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import LegalPageLayout, { LegalHeading } from './LegalPageLayout';
import { gdprService } from '../services/gdprService';
import { COOKIE_CHOICE_CHANGED_EVENT, OPEN_COOKIE_SETTINGS_EVENT } from './GDPRBanner';

// Lets visitors change their banner answer at any time (withdrawing consent must be as easy as giving it).
const readChoice = () => {
  const preferences = gdprService.getPreferences();
  if (!preferences) return 'Not chosen yet';
  return preferences.analytics ? 'All cookies accepted' : 'Only strictly necessary';
};

const CookieChoiceCard: React.FC = () => {
  const [choice, setChoice] = useState(readChoice);

  useEffect(() => {
    const refresh = () => setChoice(readChoice());
    window.addEventListener(COOKIE_CHOICE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(COOKIE_CHOICE_CHANGED_EVENT, refresh);
  }, []);

  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] border border-hairline bg-white p-5">
      <p className="flex items-center gap-2 font-display text-[15px] font-extrabold text-ink">
        <Cookie className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
        Your cookie choice
      </p>
      <p className="text-[13px] text-slate-500">
        Currently: <strong className="text-ink">{choice}</strong>
      </p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
        className="mt-1 h-10 rounded-xl bg-primary text-[13.5px] font-bold text-white transition-colors hover:bg-primary-hover"
      >
        Change cookie choice
      </button>
    </div>
  );
};

interface CookiePolicyProps {
  onBack: () => void;
}

const CookiePolicy: React.FC<CookiePolicyProps> = () => {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      updated="August 19, 2026"
      aside={<CookieChoiceCard />}
      contact={{ title: 'Have questions about this policy?', body: 'If you have any questions about our use of cookies or other technologies, please email us at' }}
    >
        <section>
          <LegalHeading id="what-are-cookies" number={1}>What are Cookies?</LegalHeading>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed">
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
            They are widely used to make websites work more efficiently, as well as to provide information to the owners of the site. 
            At Thessis, we use cookies to improve your experience, ensuring our platform is secure and easy to use.
          </p>
        </section>

        <section>
          <LegalHeading id="how-thessis-uses-cookies" number={2}>How Thessis Uses Cookies</LegalHeading>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed mb-4">
            We use both session cookies (which expire once you close your web browser) and persistent cookies 
            (which stay on your device for a set period of time or until you delete them). We use these technologies for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-700 text-base md:text-lg leading-relaxed marker:text-sage">
            <li>To recognize you when you sign in to use our services.</li>
            <li>To prevent fraudulent activity and improve security.</li>
            <li>To analyze how our services are performing.</li>
          </ul>
        </section>

        <section>
          <LegalHeading id="cookie-categories" number={3}>Cookie Categories</LegalHeading>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed mb-6">
            The table below explains the cookies we use and why.
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 sm:hidden">
            Swipe horizontally to view full table
          </p>
          
          <div className="relative w-full overflow-hidden rounded-lg border border-slate-200">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-white to-transparent sm:hidden"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-white to-transparent sm:hidden"></div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-stone-off border-b border-slate-200">
                    <th className="p-4 text-sm font-bold text-slate-900 uppercase tracking-wider w-1/4">Category</th>
                    <th className="p-4 text-sm font-bold text-slate-900 uppercase tracking-wider w-1/4">Name</th>
                    <th className="p-4 text-sm font-bold text-slate-900 uppercase tracking-wider w-1/3">Purpose</th>
                    <th className="p-4 text-sm font-bold text-slate-900 uppercase tracking-wider w-1/6">Expiration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 align-top">Strictly Necessary</td>
                    <td className="p-4 text-sm text-slate-600 font-mono align-top">auth_token</td>
                    <td className="p-4 text-sm text-slate-600 align-top">
                      Used to authenticate users, prevent fraud, and protect user data from unauthorized access.
                    </td>
                    <td className="p-4 text-sm text-slate-600 align-top">Session</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 align-top">Performance</td>
                    <td className="p-4 text-sm text-slate-600 font-mono align-top">_ga</td>
                    <td className="p-4 text-sm text-slate-600 align-top">
                      Used by Google Analytics to distinguish users and allow us to analyze site usage.
                    </td>
                    <td className="p-4 text-sm text-slate-600 align-top">2 years</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <LegalHeading id="managing-your-preferences" number={4}>Managing Your Preferences</LegalHeading>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed mb-4">
            On your first visit, our cookie consent banner lets you choose "Accept All" or "Reject Non-Essential" — rejecting disables Performance cookies (including Google Analytics) for your session, leaving only Strictly Necessary cookies active. You can also change your cookie preferences at any time by changing your browser settings.
            Please note that if you disable cookies, some features of the Thessis platform may not function correctly.
          </p>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed mb-4">
            Find out how to manage cookies on popular browsers:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <a 
              className="flex items-center p-3 rounded-lg border border-stone-border hover:border-sage/50 hover:bg-sage/5 transition-all group" 
              href="https://support.google.com/chrome/answer/95647" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage mr-3">public</span>
              <span className="text-sm font-semibold text-slate-900 group-hover:text-sage">Google Chrome</span>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage ml-auto text-sm">open_in_new</span>
            </a>
            <a 
              className="flex items-center p-3 rounded-lg border border-stone-border hover:border-sage/50 hover:bg-sage/5 transition-all group" 
              href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage mr-3">explore</span>
              <span className="text-sm font-semibold text-slate-900 group-hover:text-sage">Apple Safari</span>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage ml-auto text-sm">open_in_new</span>
            </a>
            <a 
              className="flex items-center p-3 rounded-lg border border-stone-border hover:border-sage/50 hover:bg-sage/5 transition-all group" 
              href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage mr-3">language</span>
              <span className="text-sm font-semibold text-slate-900 group-hover:text-sage">Mozilla Firefox</span>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage ml-auto text-sm">open_in_new</span>
            </a>
            <a 
              className="flex items-center p-3 rounded-lg border border-stone-border hover:border-sage/50 hover:bg-sage/5 transition-all group" 
              href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage mr-3">window</span>
              <span className="text-sm font-semibold text-slate-900 group-hover:text-sage">Microsoft Edge</span>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-sage ml-auto text-sm">open_in_new</span>
            </a>
          </div>
        </section>

    </LegalPageLayout>
  );
};

export default CookiePolicy;
