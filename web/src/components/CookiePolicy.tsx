import React from 'react';
import BackArrowIcon from './icons/BackArrowIcon';

interface CookiePolicyProps {
  onBack: () => void;
}

const CookiePolicy: React.FC<CookiePolicyProps> = ({ onBack }) => {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 md:p-12 lg:p-16">
      <div className="flex justify-start mb-5 sm:mb-8">
        <button 
          onClick={onBack}
          className="group flex items-center justify-center rounded-lg h-10 pr-4 text-slate-500 gap-2 text-sm font-bold leading-normal tracking-[0.015em] transition-all hover:text-sage"
        >
          <BackArrowIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span className="truncate">Back to Settings</span>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 mb-8 sm:mb-10 border-b border-slate-200 pb-5 sm:pb-8">
        <h1 className="text-slate-900 text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-[-0.033em]">Cookie Policy</h1>
        <p className="text-slate-500 text-base font-medium">Last updated: October 24, 2023</p>
      </div>

      <div className="space-y-8 sm:space-y-10">
        <section>
          <h2 className="text-slate-900 text-xl sm:text-2xl font-bold leading-tight mb-3 sm:mb-4">1. What are Cookies?</h2>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed">
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
            They are widely used to make websites work more efficiently, as well as to provide information to the owners of the site. 
            At THESSIS, we use cookies to improve your experience, ensuring our platform is secure and easy to use.
          </p>
        </section>

        <section>
          <h2 className="text-slate-900 text-xl sm:text-2xl font-bold leading-tight mb-3 sm:mb-4">2. How THESSIS Uses Cookies</h2>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed mb-4">
            We use both session cookies (which expire once you close your web browser) and persistent cookies 
            (which stay on your device for a set period of time or until you delete them). We use these technologies for the following purposes:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-700 text-base md:text-lg leading-relaxed marker:text-sage">
            <li>To recognize you when you sign in to use our services.</li>
            <li>To keep track of your specified preferences (such as language or time zone).</li>
            <li>To prevent fraudulent activity and improve security.</li>
            <li>To analyze how our services are performing.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-slate-900 text-xl sm:text-2xl font-bold leading-tight mb-4 sm:mb-6">3. Cookie Categories</h2>
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
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 align-top">Functional</td>
                    <td className="p-4 text-sm text-slate-600 font-mono align-top">pref_lang</td>
                    <td className="p-4 text-sm text-slate-600 align-top">
                      Stores the user's preferred language for the interface.
                    </td>
                    <td className="p-4 text-sm text-slate-600 align-top">1 year</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 align-top">Targeting</td>
                    <td className="p-4 text-sm text-slate-600 font-mono align-top">ads_r_1</td>
                    <td className="p-4 text-sm text-slate-600 align-top">
                      Used to deliver advertisements more relevant to you and your interests.
                    </td>
                    <td className="p-4 text-sm text-slate-600 align-top">90 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-slate-900 text-xl sm:text-2xl font-bold leading-tight mb-3 sm:mb-4">4. Managing Your Preferences</h2>
          <p className="text-slate-700 text-base md:text-lg font-normal leading-relaxed mb-6">
            You can change your cookie preferences at any time by changing your browser settings. 
            Please note that if you disable cookies, some features of the THESSIS platform may not function correctly.
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

        <div className="mt-8 p-4 sm:p-6 bg-stone-off rounded-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Have questions about this policy?</h3>
          <p className="text-slate-600 text-sm mb-4">
            If you have any questions about our use of cookies or other technologies, please email us at
          </p>
          <a 
            className="inline-flex items-center text-sage font-bold hover:underline" 
            href="mailto:privacy@tanktide.com"
          >
            <span className="material-symbols-outlined text-lg mr-2">mail</span>
            privacy@tanktide.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
