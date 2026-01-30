import React from 'react';

interface TermsOfServiceProps {
  onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 md:p-12 lg:p-16">
      <div className="mb-8">
        <button 
          onClick={onBack}
          className="group flex items-center gap-2 rounded-lg py-2 pr-4 text-sm font-bold text-slate-600 transition-colors hover:text-slate-900"
        >
          <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span>Back to Settings</span>
        </button>
      </div>

      <div className="mb-12 border-b border-slate-200 pb-8">
        <h1 className="mb-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Terms of Service</h1>
        <p className="text-base font-medium text-slate-500">Last updated: October 24, 2023</p>
      </div>

      <div className="space-y-12">
        <div className="prose prose-slate max-w-none">
          <p className="text-lg leading-relaxed text-slate-700">
            Welcome to TankTide. These Terms of Service ("Terms") govern your access to and use of the TankTide platform, 
            website, and services (collectively, the "Services"). By accessing or using our Services, you agree to be bound 
            by these Terms. If you do not agree to these Terms, please do not use our Services.
          </p>
        </div>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">1</span>
            Introduction
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            TankTide provides a premium professional networking and job referral platform designed to connect high-caliber 
            professionals with exclusive opportunities. These Terms constitute a legally binding agreement between you and TankTide, Inc.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">2</span>
            Definitions
          </h2>
          <ul className="ml-[44px] list-disc space-y-2 pl-4 text-slate-700 marker:text-sage">
            <li className="pl-1">
              <strong>"Platform"</strong> refers to the TankTide website, mobile applications, and underlying technology.
            </li>
            <li className="pl-1">
              <strong>"User"</strong> or <strong>"You"</strong> refers to any individual who accesses or uses the Services.
            </li>
            <li className="pl-1">
              <strong>"Member"</strong> refers to a registered User who has an active account.
            </li>
            <li className="pl-1">
              <strong>"Content"</strong> refers to text, images, data, and other materials posted or transmitted through the Platform.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">3</span>
            Eligibility
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            The Services are intended solely for users who are eighteen (18) years of age or older. By using the Services, 
            you represent and warrant that you are of legal age to form a binding contract and meet all eligibility requirements. 
            If you are using the Services on behalf of an entity, you represent that you are authorized to bind that entity to these Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">4</span>
            Account Registration
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            To access certain features, you must register for an account. You agree to provide accurate, current, and complete 
            information during the registration process and to update such information to keep it accurate, current, and complete. 
            You are responsible for safeguarding your password and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">5</span>
            User Conduct
          </h2>
          <div className="pl-[44px]">
            <p className="mb-3 text-slate-700">You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc space-y-2 pl-4 text-slate-700 marker:text-sage">
              <li className="pl-1">Using the Services for any illegal purpose or in violation of any local, state, national, or international law.</li>
              <li className="pl-1">Harassing, threatening, or defrauding other users.</li>
              <li className="pl-1">Posting content that is infringing, libelous, defamatory, obscene, or otherwise objectionable.</li>
              <li className="pl-1">Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Platform.</li>
              <li className="pl-1">Using any robot, spider, crawler, scraper, or other automated means to access the Services for any purpose without our express written permission.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">6</span>
            Content Ownership & License
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            You retain all ownership rights to the Content you post on TankTide. However, by posting Content, you grant us a 
            non-exclusive, worldwide, royalty-free, transferable license to use, reproduce, modify, distribute, and display 
            such Content in connection with operating and providing the Services.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">7</span>
            Fees and Payment
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            Certain aspects of the Services may be provided for a fee. If you elect to use paid aspects of the Services, 
            you agree to the pricing and payment terms as we may update them from time to time. All fees are non-refundable 
            except as required by law.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">8</span>
            Privacy Policy
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            Your privacy is important to us. Please read our{' '}
            <a 
              className="font-semibold text-sage underline decoration-sage/30 underline-offset-2 transition-colors hover:text-sage-dark hover:decoration-sage" 
              href="#"
            >
              Privacy Policy
            </a>{' '}
            carefully for information relating to our collection, use, storage, and disclosure of your personal information. 
            The Privacy Policy is incorporated by reference into these Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">9</span>
            Third-Party Links and Services
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            The Services may contain links to third-party websites or services that are not owned or controlled by TankTide. 
            We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any 
            third-party websites or services. Accessing them is at your own risk.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">10</span>
            Termination
          </h2>
          <div className="pl-[44px]">
            <p className="mb-3 text-slate-700">
              We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, 
              for any reason whatsoever, including without limitation if you breach the Terms. Upon termination:
            </p>
            <ul className="list-disc space-y-2 pl-4 text-slate-700 marker:text-sage">
              <li className="pl-1">Your right to use the Services will immediately cease.</li>
              <li className="pl-1">Any data associated with your account may be deleted.</li>
              <li className="pl-1">All provisions of the Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">11</span>
            Disclaimer of Warranties & Limitation of Liability
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            The Services are provided "AS IS" and "AS AVAILABLE" without warranties of any kind, whether express or implied. 
            In no event shall TankTide, its directors, employees, partners, agents, suppliers, or affiliates, be liable for 
            any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, 
            data, use, goodwill, or other intangible losses.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">12</span>
            Contact Information
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            If you have any questions about these Terms, please contact us at:
          </p>
          <div className="mt-4 pl-[44px]">
            <div className="rounded-lg bg-white p-6 shadow-sm border border-slate-100">
              <p className="font-bold text-slate-900">TankTide Legal Team</p>
              <p className="mt-1 text-slate-700">123 Innovation Drive, Suite 400</p>
              <p className="text-slate-700">San Francisco, CA 94103</p>
              <a 
                className="mt-3 block font-medium text-sage hover:underline" 
                href="mailto:legal@tanktide.com"
              >
                legal@tanktide.com
              </a>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-20 border-t border-slate-200 pt-8 text-center">
        <p className="text-sm text-slate-500">© 2023 TankTide, Inc. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-6 text-sm font-medium text-sage">
          <a className="hover:text-sage-dark" href="#">Privacy Policy</a>
          <a className="hover:text-sage-dark" href="#">Cookie Policy</a>
          <a className="hover:text-sage-dark" href="#">Support</a>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;