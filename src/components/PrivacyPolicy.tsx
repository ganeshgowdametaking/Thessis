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
              Last updated: June 15, 2025
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-slate-700">
              TankTide ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
            <p className="text-slate-700">
              We process personal data both as a Processor and as a Controller as defined in the EU General Data Protection Regulation (GDPR).
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Information We Collect</h2>
            <p className="text-slate-700">
              We collect information that you provide directly to us, information we obtain automatically when you use the Platform, and information from third-party sources.
            </p>
            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Account information (name, email, password)</li>
              <li>Profile information (title, company, location, bio, profile picture)</li>
              <li>Content you create (posts, comments, messages)</li>
              <li>Job and application information</li>
              <li>Survey responses and feedback</li>
            </ul>
            
            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">2.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Cookies and similar technologies</li>
              <li>Location information (with your permission)</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-700">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and manage your account</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Personalize your experience</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              <li>Protect the rights and property of TankTide and others</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Legal Basis for Processing (EU Users)</h2>
            <p className="text-slate-700">
              For users in the European Union, we process your personal data under the following legal bases:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Contractual Necessity:</strong> To perform the contract we have with you</li>
              <li><strong>Legitimate Interests:</strong> For our legitimate business interests</li>
              <li><strong>Consent:</strong> Where you have given us consent to do so</li>
              <li><strong>Legal Obligation:</strong> To comply with legal obligations</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-slate-700">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>Service providers who perform services on our behalf</li>
              <li>Business partners with your consent</li>
              <li>Other users, according to your privacy settings</li>
              <li>Legal authorities when required by law</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">6. Data Retention</h2>
            <p className="text-slate-700">
              We retain your personal data for as long as necessary to provide you with our services and as needed to comply with our legal obligations.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">7. Your Rights (EU Users)</h2>
            <p className="text-slate-700">
              If you are located in the European Union, you have the following rights under the GDPR:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Right to Access:</strong> You can request a copy of the personal data we hold about you.</li>
              <li><strong>Right to Rectification:</strong> You can request that we correct inaccurate or incomplete information.</li>
              <li><strong>Right to Erasure:</strong> You can request that we delete your personal data.</li>
              <li><strong>Right to Restriction:</strong> You can request that we restrict the processing of your data.</li>
              <li><strong>Right to Data Portability:</strong> You can request a copy of your data in a structured, commonly used, and machine-readable format.</li>
              <li><strong>Right to Object:</strong> You can object to our processing of your personal data.</li>
              <li><strong>Right to Withdraw Consent:</strong> You can withdraw your consent at any time.</li>
            </ul>
            <p className="text-slate-700 mt-4">
              To exercise these rights, please contact us at <a href="mailto:privacy@tanktide.com" className="text-blue-600 hover:text-blue-800">privacy@tanktide.com</a>.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-slate-700">
              We use cookies and similar tracking technologies to collect information about your browsing activities. You can manage your cookie preferences through our cookie consent banner or your browser settings.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">9. International Data Transfers</h2>
            <p className="text-slate-700">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information when transferred internationally.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">10. Data Security</h2>
            <p className="text-slate-700">
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">11. Children's Privacy</h2>
            <p className="text-slate-700">
              Our services are not intended for individuals under the age of 16. We do not knowingly collect personal data from children.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">13. Contact Us</h2>
            <p className="text-slate-700">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-slate-700">
              Email: <a href="mailto:privacy@tanktide.com" className="text-blue-600 hover:text-blue-800">privacy@tanktide.com</a>
            </p>
            <p className="text-slate-700">
              Address: TankTide Inc., 123 Professional Lane, San Francisco, CA 94107, USA
            </p>
            <p className="text-slate-700">
              For EU users, our EU representative can be contacted at: <a href="mailto:eu-rep@tanktide.com" className="text-blue-600 hover:text-blue-800">eu-rep@tanktide.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;