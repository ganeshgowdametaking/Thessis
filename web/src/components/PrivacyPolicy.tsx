import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  console.log('PrivacyPolicy mounted');

  const handleBack = () => {
    console.log('BACK CLICKED');
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={handleBack}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Privacy Policy</h1>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600">
              Last updated: February 6, 2026
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-slate-700">
              TankTide ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform (the "Platform").
            </p>
            <p className="text-slate-700 mt-4">
              We process personal data in accordance with the EU General Data Protection Regulation (GDPR) and other applicable data protection laws.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Information We Collect</h2>
            <p className="text-slate-700">
              We collect information that you provide directly to us, information we obtain automatically when you use the Platform, and information from third-party sources.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">2.1 Information You Provide to Us</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Account information:</strong> Name, email address, password</li>
              <li><strong>Profile information:</strong> Job title, company name, location, bio, profile picture</li>
              <li><strong>User-generated content:</strong> Posts, comments, messages, and other content you create</li>
              <li><strong>Job-related information:</strong> Job postings, applications, resumes, and work history</li>
              <li><strong>Communications:</strong> Survey responses, feedback, and correspondence with us</li>
              <li><strong>Payment information:</strong> Billing details (processed by third-party payment processors)</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">2.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Usage data:</strong> Pages visited, features used, time spent on the Platform, interaction patterns</li>
              <li><strong>Device information:</strong> IP address, browser type and version, operating system, device identifiers</li>
              <li><strong>Cookies and tracking technologies:</strong> Session data, preferences, and analytics (see Section 9)</li>
              <li><strong>Location information:</strong> General location based on IP address; precise location only with your explicit consent</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">2.3 Information from Third-Party Sources</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Social media:</strong> Profile information if you connect your social media accounts</li>
              <li><strong>Public sources:</strong> Publicly available information to verify profile details or prevent fraud</li>
              <li><strong>Business partners:</strong> Information from companies you interact with through our Platform</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-700">
              We process your personal data for the following purposes, based on specific legal grounds:
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.1 Contractual Necessity (to provide our services to you)</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Create and manage your account</li>
              <li>Provide Platform features and functionality</li>
              <li>Process transactions and payments</li>
              <li>Provide customer support</li>
              <li>Communicate service updates and changes</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.2 Legitimate Interests (for our business operations)</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Improve and optimize the Platform</li>
              <li>Develop new features and services</li>
              <li>Conduct analytics and research</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Protect our rights and property</li>
              <li>Enforce our Terms of Service</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.3 Consent (where you have given us permission)</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Send you marketing communications and newsletters</li>
              <li>Use precise location data</li>
              <li>Share data with third-party partners for specific purposes</li>
              <li>Use non-essential cookies</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.4 Legal Obligation (to comply with laws)</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Respond to legal requests and prevent harm</li>
              <li>Comply with tax, accounting, and regulatory requirements</li>
              <li>Maintain records as required by law</li>
            </ul>

            <p className="text-slate-700 mt-6 font-medium">
              Note: Certain information (email address and name) is required to create an account and use our services. Without this information, we cannot provide the Platform to you. All other information is optional, though it may enhance your experience.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Legal Basis for Processing (EU Users)</h2>
            <p className="text-slate-700">
              For users in the European Economic Area (EEA), United Kingdom, and Switzerland, we process your personal data only when we have a valid legal basis:
            </p>
            <ul className="list-disc pl-6 text-slate-700 mt-4 space-y-2">
              <li><strong>Performance of a contract:</strong> When necessary to provide our services</li>
              <li><strong>Legitimate interests:</strong> When necessary for our business interests (balanced against your rights)</li>
              <li><strong>Consent:</strong> When you have explicitly agreed to the processing</li>
              <li><strong>Legal obligation:</strong> When required by law</li>
            </ul>
            <p className="text-slate-700 mt-4">
              You have the right to object to processing based on legitimate interests. See Section 8 for details on your rights.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-slate-700">
              We may share your information with the following categories of recipients:
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">5.1 Service Providers</h3>
            <p className="text-slate-700">We work with third-party companies that provide services on our behalf:</p>
            <ul className="list-disc pl-6 text-slate-700 mt-2 space-y-2">
              <li><strong>Cloud hosting providers</strong> (e.g., AWS, Google Cloud) - to store data and host the Platform</li>
              <li><strong>Email service providers</strong> - to send transactional and marketing emails</li>
              <li><strong>Analytics providers</strong> (e.g., Google Analytics) - to understand Platform usage</li>
              <li><strong>Payment processors</strong> - to handle billing and payments</li>
              <li><strong>Customer support tools</strong> - to manage user inquiries</li>
            </ul>
            <p className="text-slate-700 mt-3 text-sm italic">These providers are contractually bound to protect your data and use it only for specified purposes.</p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">5.2 Other Users</h3>
            <p className="text-slate-700">Based on your privacy settings and activity:</p>
            <ul className="list-disc pl-6 text-slate-700 mt-2 space-y-2">
              <li>Profile information you choose to make public</li>
              <li>Content you post or share on the Platform</li>
              <li>Professional information in job applications</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">5.3 Business Partners</h3>
            <p className="text-slate-700">With your consent, we may share information with:</p>
            <ul className="list-disc pl-6 text-slate-700 mt-2 space-y-2">
              <li>Companies you interact with through the Platform</li>
              <li>Integration partners (when you connect third-party services)</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">5.4 Legal and Safety Reasons</h3>
            <p className="text-slate-700">We may disclose information when required to:</p>
            <ul className="list-disc pl-6 text-slate-700 mt-2 space-y-2">
              <li>Comply with legal obligations, court orders, or government requests</li>
              <li>Enforce our Terms of Service and other agreements</li>
              <li>Protect the rights, property, or safety of TankTide, our users, or the public</li>
              <li>Detect and prevent fraud, security issues, or technical problems</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">5.5 Business Transfers</h3>
            <p className="text-slate-700">
              If TankTide is involved in a merger, acquisition, or sale of assets, your information may be transferred to the new entity. We will notify you before your data is transferred and becomes subject to a different privacy policy.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-slate-700">
              We retain your personal data only as long as necessary for the purposes described in this Privacy Policy:
            </p>
            <ul className="list-disc pl-6 text-slate-700 mt-4 space-y-2">
              <li><strong>Active accounts:</strong> For the duration of your account use</li>
              <li><strong>Deleted accounts:</strong> 30 days after deletion request (to allow account recovery), then permanently deleted</li>
              <li><strong>Marketing data:</strong> Until you withdraw consent or unsubscribe</li>
              <li><strong>Legal/compliance records:</strong> Up to 7 years where required by law (e.g., tax, accounting)</li>
              <li><strong>Analytics data:</strong> Aggregated and anonymized data may be retained indefinitely</li>
            </ul>
            <p className="text-slate-700 mt-4">
              You can request deletion of your data at any time by contacting us at <a href="mailto:info@tanktide.com" className="text-blue-600 hover:text-blue-800 transition-colors">info@tanktide.com</a>.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">7. International Data Transfers</h2>
            <p className="text-slate-700">
              Your information may be transferred to and processed in countries other than your country of residence, including the United States and other countries where our service providers operate.
            </p>
            <p className="text-slate-700 mt-4">
              When we transfer personal data outside the European Economic Area (EEA), we ensure appropriate safeguards are in place:
            </p>
            <ul className="list-disc pl-6 text-slate-700 mt-4 space-y-2">
              <li><strong>Standard Contractual Clauses (SCCs):</strong> Approved by the European Commission</li>
              <li><strong>Adequacy Decisions:</strong> Transfers to countries deemed adequate by the EU</li>
              <li><strong>Your Consent:</strong> Where you have explicitly agreed to the transfer</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">8. Your Rights</h2>
            <p className="text-slate-700">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">8.1 Rights for EU/EEA Users (GDPR)</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2 text-sm sm:text-base">
              <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your personal data</li>
              <li><strong>Right to Restriction:</strong> Request that we limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable, machine-readable format</li>
              <li><strong>Right to Object:</strong> Object to our processing of your data based on legitimate interests or for direct marketing</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time (without affecting prior processing)</li>
              <li><strong>Right to Lodge a Complaint:</strong> File a complaint with your local data protection authority</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">8.2 Exercising Your Rights</h3>
            <p className="text-slate-700">
              To exercise any of these rights, please contact us at <a href="mailto:info@tanktide.com" className="text-blue-600 hover:text-blue-800 transition-colors">info@tanktide.com</a>. We will respond within 30 days.
            </p>
            <p className="text-slate-700 mt-4">
              You also have the right to lodge a complaint with a supervisory authority if you believe we have not handled your personal data properly. For EU users, you can find your data protection authority at: <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://edpb.europa.eu/about-edpb/board/members_en</a>
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">9. Cookies and Tracking Technologies</h2>
            <p className="text-slate-700">
              We use cookies and similar technologies to collect information about your browsing activities and improve your experience.
            </p>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">9.1 Types of Cookies We Use</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the Platform to function (login, security, preferences)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Platform</li>
              <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (with your consent)</li>
              <li><strong>Third-party Cookies:</strong> Set by our service providers (e.g., Google Analytics)</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">9.2 Managing Cookies</h3>
            <p className="text-slate-700">You can manage your cookie preferences through:</p>
            <ul className="list-disc pl-6 text-slate-700 mt-2 space-y-2">
              <li>Our cookie consent banner (when you first visit)</li>
              <li>Your browser settings (to block or delete cookies)</li>
              <li>Opting out of Google Analytics: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">https://tools.google.com/dlpage/gaoptout</a></li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">10. Automated Decision-Making and Profiling</h2>
            <p className="text-slate-700">
              We do not use automated decision-making or profiling that produces legal effects or similarly significant effects on you.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">11. Data Security</h2>
            <p className="text-slate-700">
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, loss, destruction, or alteration:
            </p>
            <ul className="list-disc pl-6 text-slate-700 mt-4 space-y-2">
              <li>Encryption of data in transit (SSL/TLS)</li>
              <li>Encryption of sensitive data at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication</li>
              <li>Employee training on data protection</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">11.1 Data Breach Notification</h3>
            <p className="text-slate-700">
              In the event of a data breach that is likely to result in a high risk to your rights and freedoms, we will notify you and the relevant supervisory authority within 72 hours of becoming aware of the breach, as required by law.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">12. Children's Privacy</h2>
            <p className="text-slate-700">
              Our Platform is not intended for individuals under the age of 16 (or the minimum age in your country).
            </p>
            <p className="text-slate-700 mt-4">
              We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us at <a href="mailto:info@tanktide.com" className="text-blue-600 hover:text-blue-800">info@tanktide.com</a>, and we will delete the information promptly.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">13. Third-Party Links</h2>
            <p className="text-slate-700">
              The Platform may contain links to third-party websites or services that are not operated by us. We are not responsible for the privacy practices of these third parties.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">14. Marketing Communications</h2>
            <p className="text-slate-700">
              If you have consented to receive marketing emails from us, you can opt out at any time by:
            </p>
            <ul className="list-disc pl-6 text-slate-700 mt-4 space-y-2">
              <li>Clicking the "unsubscribe" link in any marketing email</li>
              <li>Updating your preferences in your account settings</li>
              <li>Contacting us at <a href="mailto:info@tanktide.com" className="text-blue-600 hover:text-blue-800">info@tanktide.com</a></li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">15. Changes to This Privacy Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by:
            </p>
            <ul className="list-disc pl-6 text-slate-700 mt-4 space-y-2">
              <li>Posting the new Privacy Policy on this page with an updated "Last updated" date</li>
              <li>Sending you an email notification (for significant changes)</li>
              <li>Displaying a prominent notice on the Platform</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">16. Contact Us</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mt-6">
              <p className="text-slate-700"><strong>Email:</strong> <a href="mailto:info@tanktide.com" className="text-blue-600 hover:text-blue-800">info@tanktide.com</a></p>
              <p className="text-slate-700 mt-2"><strong>Company:</strong> TankTide (Remote-first company)</p>
            </div>

            <p className="text-slate-500 text-sm mt-12 text-center">
              Your privacy matters to us. Thank you for trusting TankTide with your information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;