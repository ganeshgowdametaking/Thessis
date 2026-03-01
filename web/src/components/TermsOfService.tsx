import React from 'react';
import BackArrowIcon from './icons/BackArrowIcon';

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
          <BackArrowIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Settings</span>
        </button>
      </div>

      <div className="mb-12 border-b border-slate-200 pb-8">
        <h1 className="mb-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Terms of Service</h1>
        <p className="text-base font-medium text-slate-500">Last Updated: February 6, 2026</p>
      </div>

      <div className="space-y-12">
        <div className="prose prose-slate max-w-none">
          <p className="text-lg leading-relaxed text-slate-700">
            Welcome to TankTide. Please read these Terms of Service ("Terms", "Terms of Service", or "Agreement") carefully before using the TankTide platform, website, and services (collectively, the "Services").
          </p>
          <p className="mt-4 text-slate-700">
            By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use our Services.
          </p>
        </div>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">1</span>
            Introduction
          </h2>
          <div className="pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>
              TankTide ("we", "us", or "our") provides a professional networking and job referral platform designed to connect professionals with career opportunities. These Terms constitute a legally binding agreement between you and TankTide.
            </p>
            <p className="font-semibold">
              Acceptance of Terms: By creating an account, accessing, or using the Services in any way, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">2</span>
            Definitions
          </h2>
          <ul className="ml-[44px] list-disc space-y-2 pl-4 text-slate-700 marker:text-slate-400">
            <li><strong>"Platform"</strong> refers to the TankTide website, mobile applications, and all related technology and services.</li>
            <li><strong>"User"</strong> or <strong>"You"</strong> refers to any individual or entity that accesses or uses the Services.</li>
            <li><strong>"Member"</strong> refers to a registered User with an active account.</li>
            <li><strong>"Content"</strong> refers to all text, data, information, images, photos, videos, graphics, and other materials posted, uploaded, submitted, or transmitted through the Platform.</li>
            <li><strong>"User Content"</strong> refers to Content that you create, post, or share on the Platform.</li>
            <li><strong>"TankTide Content"</strong> refers to Content owned or licensed by TankTide, including the Platform's design, features, logos, and trademarks.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">3</span>
            Eligibility and Account Registration
          </h2>
          <div className="pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <div>
              <h3 className="mb-2 font-bold text-slate-900">3.1 Age Requirement</h3>
              <p>The Services are intended solely for users who are at least eighteen (18) years of age. By using the Services, you represent and warrant that you meet all eligibility requirements.</p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-slate-900">3.2 Account Registration</h3>
              <p>To access certain features, you must create an account. You agree to provide accurate, current, and complete information and maintain the security of your password.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">4</span>
            User Conduct and Prohibited Activities
          </h2>
          <div className="pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>You agree to use the Services only for lawful purposes. Prohibited activities include illegal activity, harmful conduct, content violations, and attempts to compromise platform integrity.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">5</span>
            Content Ownership, License, and Intellectual Property
          </h2>
          <div className="pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>You retain ownership of your User Content but grant TankTide a non-exclusive, worldwide, royalty-free license to use, reproduce, and display it in connection with the Services.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">6</span>
            Jobs, Applications, and Professional Networking
          </h2>
          <div className="pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>Employers are responsible for the accuracy of job postings. Users understand that TankTide is not an employer and does not make hiring decisions.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">7</span>
            Fees, Payments, and Subscription Terms
          </h2>
          <div className="pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>Certain features may be provided for a fee. By purchasing paid Services, you agree to pay all applicable fees as described at the time of purchase.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">8</span>
            Privacy and Data Protection
          </h2>
          <div className="pl-[44px] leading-relaxed text-slate-700">
            <p>
              Your privacy is important to us. Our Privacy Policy is incorporated by reference and explains how we handle your data.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">9</span>
            Third-Party Links, Services, and Integrations
          </h2>
          <div className="pl-[44px] leading-relaxed text-slate-700">
            <p>The Platform may contain links to third-party services. We are not responsible for the content or practices of these third parties.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">10</span>
            Disclaimers and Warranties
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">11</span>
            Limitation of Liability
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TANKTIDE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">12</span>
            Indemnification
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            You agree to defend, indemnify, and hold harmless TankTide from and against any claims arising from your use of the Services or violation of these Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">13</span>
            Dispute Resolution and Governing Law
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            These Terms are governed by the laws of the State of California. Any disputes will be brought exclusively in the courts of San Francisco County.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">14</span>
            Termination and Suspension
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            We reserve the right to suspend or terminate your account immediately for violations of these Terms or for other reasons at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">15</span>
            Modifications to Terms and Services
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            We reserve the right to modify these Terms at any time. We will provide notice of material changes at least 30 days before they take effect.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">16</span>
            General Provisions
          </h2>
          <p className="pl-[44px] leading-relaxed text-slate-700">
            These Terms, along with our Privacy Policy, constitute the entire agreement between you and TankTide.
          </p>
        </section>

        <section>
          <h2 className="mb-4 flex items-center text-xl font-bold text-slate-900">
            <span className="mr-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">17</span>
            Contact Information
          </h2>
          <div className="mt-4 pl-[44px]">
            <div className="rounded-xl bg-slate-50 p-8 shadow-sm border border-slate-200">
              <p className="font-bold text-slate-900">TankTide Team</p>
              <p className="mt-1 text-slate-700">Remote-first company</p>
              <a
                className="mt-4 inline-block font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                href="mailto:info@tanktide.com"
              >
                info@tanktide.com
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
