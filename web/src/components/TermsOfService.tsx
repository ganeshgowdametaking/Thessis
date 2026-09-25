import React from 'react';
import LegalPageLayout, { LegalHeading } from './LegalPageLayout';

interface TermsOfServiceProps {
  onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = () => {
  return (
    <LegalPageLayout title="Terms of Service" updated="August 19, 2026">
        <div className="prose prose-slate max-w-none">
          <p className="text-base sm:text-lg leading-relaxed text-slate-700">
            Welcome to Thessis. Please read these Terms of Service ("Terms", "Terms of Service", or "Agreement") carefully before using the Thessis platform, website, and services (collectively, the "Services").
          </p>
          <p className="text-base sm:text-lg leading-relaxed text-slate-700 mt-4">
            Thessis was formerly known as Tanktide. Our social media accounts referenced in these Terms still use @tanktide handles during our ongoing brand transition — these are operated by the same company as Thessis.
          </p>
          <p className="mt-4 text-slate-700">
            By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use our Services.
          </p>
        </div>

        <section>
          <LegalHeading id="introduction" number={1}>Introduction</LegalHeading>
          <div className="pl-0 sm:pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>
              Thessis ("we", "us", or "our") provides a professional networking and job referral platform designed to connect professionals with career opportunities. These Terms constitute a legally binding agreement between you and Thessis.
            </p>
            <p className="font-semibold">
              Acceptance of Terms: By creating an account, accessing, or using the Services in any way, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.
            </p>
          </div>
        </section>

        <section>
          <LegalHeading id="definitions" number={2}>Definitions</LegalHeading>
          <ul className="ml-0 sm:ml-[44px] list-disc space-y-2 pl-4 text-slate-700 marker:text-slate-400">
              <li><strong>"Platform"</strong> refers to the Thessis website, mobile applications, and all related technology and services.</li>
            <li><strong>"User"</strong> or <strong>"You"</strong> refers to any individual or entity that accesses or uses the Services.</li>
            <li><strong>"Member"</strong> refers to a registered User with an active account.</li>
            <li><strong>"Content"</strong> refers to all text, data, information, images, photos, videos, graphics, and other materials posted, uploaded, submitted, or transmitted through the Platform.</li>
            <li><strong>"User Content"</strong> refers to Content that you create, post, or share on the Platform.</li>
            <li><strong>"Thessis Content"</strong> refers to Content owned or licensed by Thessis, including the Platform's design, features, logos, and trademarks.</li>
          </ul>
        </section>

        <section>
          <LegalHeading id="eligibility-and-account-registration" number={3}>Eligibility and Account Registration</LegalHeading>
          <div className="pl-0 sm:pl-[44px] space-y-4 leading-relaxed text-slate-700">
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
          <LegalHeading id="user-conduct-and-prohibited-activities" number={4}>User Conduct and Prohibited Activities</LegalHeading>
          <div className="pl-0 sm:pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>You agree to use the Services only for lawful purposes. Prohibited activities include illegal activity, harmful conduct, content violations, and attempts to compromise platform integrity.</p>
          </div>
        </section>

        <section>
          <LegalHeading id="content-ownership-license-and-intellectual-property" number={5}>Content Ownership, License, and Intellectual Property</LegalHeading>
          <div className="pl-0 sm:pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>You retain ownership of your User Content but grant Thessis a non-exclusive, worldwide, royalty-free license to use, reproduce, and display it in connection with the Services.</p>
          </div>
        </section>

        <section>
          <LegalHeading id="jobs-applications-and-professional-networking" number={6}>Jobs, Applications, and Professional Networking</LegalHeading>
          <div className="pl-0 sm:pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>Employers are responsible for the accuracy of job postings. Users understand that Thessis is not an employer and does not make hiring decisions.</p>
          </div>
        </section>

        <section>
          <LegalHeading id="fees-payments-and-subscription-terms" number={7}>Fees, Payments, and Subscription Terms</LegalHeading>
          <div className="pl-0 sm:pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>The Services are currently provided free of charge. If we introduce paid features or subscription plans in the future, we will update these Terms to describe the applicable fees, billing cycle, and cancellation terms before any charges apply.</p>
          </div>
        </section>

        <section>
          <LegalHeading id="privacy-and-data-protection" number={8}>Privacy and Data Protection</LegalHeading>
          <div className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            <p>
              Your privacy is important to us. Our Privacy Policy is incorporated by reference and explains how we handle your data.
            </p>
          </div>
        </section>

        <section>
          <LegalHeading id="third-party-links-services-and-integrations" number={9}>Third-Party Links, Services, and Integrations</LegalHeading>
          <div className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            <p>The Platform may contain links to third-party services. We are not responsible for the content or practices of these third parties.</p>
          </div>
        </section>

        <section>
          <LegalHeading id="disclaimers-and-warranties" number={10}>Disclaimers and Warranties</LegalHeading>
          <p className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND.
          </p>
        </section>

        <section>
          <LegalHeading id="limitation-of-liability" number={11}>Limitation of Liability</LegalHeading>
          <p className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, Thessis SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.
          </p>
        </section>

        <section>
          <LegalHeading id="indemnification" number={12}>Indemnification</LegalHeading>
          <p className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            You agree to defend, indemnify, and hold harmless Thessis from and against any claims arising from your use of the Services or violation of these Terms.
          </p>
        </section>

        <section>
          <LegalHeading id="dispute-resolution-and-governing-law" number={13}>Dispute Resolution and Governing Law</LegalHeading>
          <p className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            These Terms are governed by the laws of the State of California. Any disputes will be brought exclusively in the courts of San Francisco County.
          </p>
        </section>

        <section>
          <LegalHeading id="termination-and-suspension" number={14}>Termination and Suspension</LegalHeading>
          <p className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            We reserve the right to suspend or terminate your account immediately for violations of these Terms or for other reasons at our sole discretion.
          </p>
        </section>

        <section>
          <LegalHeading id="modifications-to-terms-and-services" number={15}>Modifications to Terms and Services</LegalHeading>
          <p className="pl-0 sm:pl-[44px] leading-relaxed text-slate-700">
            We reserve the right to modify these Terms at any time. We will provide notice of material changes at least 30 days before they take effect.
          </p>
        </section>

        <section>
          <LegalHeading id="general-provisions" number={16}>General Provisions</LegalHeading>
          <div className="pl-0 sm:pl-[44px] space-y-4 leading-relaxed text-slate-700">
            <p>
              <strong>Entire Agreement:</strong> These Terms, along with our Privacy Policy, constitute the entire agreement between you and Thessis.
            </p>
            <p>
              <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
            <p>
              <strong>Assignment:</strong> You may not assign or transfer these Terms, by operation of law or otherwise, without our prior written consent. We may assign these Terms without restriction, including in connection with a merger, acquisition, or sale of assets.
            </p>
            <p>
              <strong>Force Majeure:</strong> We will not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including acts of God, natural disasters, war, terrorism, labor disputes, or internet or utility failures.
            </p>
          </div>
        </section>

        <section>
          <LegalHeading id="contact-information" number={17}>Contact Information</LegalHeading>
          <div className="mt-4 pl-0 sm:pl-[44px]">
            <div className="rounded-xl bg-slate-50 p-5 sm:p-8 shadow-sm border border-slate-200">
              <p className="font-bold text-slate-900">Thessis Team</p>
              <p className="mt-1 text-slate-700">Remote-first company</p>
              <a
                className="mt-4 inline-block font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                href="mailto:info@thessis.com"
              >
                info@thessis.com
              </a>
            </div>
          </div>
        </section>
    </LegalPageLayout>
  );
};

export default TermsOfService;
