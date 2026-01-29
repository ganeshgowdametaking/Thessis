import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TermsOfServiceProps {
  onBack: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    onBack();
    navigate('/');
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Terms of Service</h1>
          </div>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600">
              Last updated: June 15, 2025
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-slate-700">
              Welcome to TankTide. These Terms of Service ("Terms") govern your access to and use of the TankTide platform, including any content, functionality, and services offered on or through tanktide.com (the "Platform").
            </p>
            <p className="text-slate-700">
              Please read these Terms carefully before you start to use the Platform. By using the Platform, you accept and agree to be bound and abide by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the Platform.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Eligibility</h2>
            <p className="text-slate-700">
              The Platform is intended for users who are at least 16 years of age. By using the Platform, you represent and warrant that you are of legal age to form a binding contract with TankTide and meet all of the foregoing eligibility requirements. If you do not meet all of these requirements, you must not access or use the Platform.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Account Registration</h2>
            <p className="text-slate-700">
              To access certain features of the Platform, you may be required to register for an account. When you register, you must provide accurate and complete information and keep this information updated. You are solely responsible for the activity that occurs on your account, and you must keep your account password secure.
            </p>
            <p className="text-slate-700">
              You must notify us immediately of any breach of security or unauthorized use of your account. We will not be liable for any losses caused by any unauthorized use of your account.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. User Content</h2>
            <p className="text-slate-700">
              Our Platform allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("User Content"). You are responsible for the User Content that you post on or through the Platform, including its legality, reliability, and appropriateness.
            </p>
            <p className="text-slate-700">
              By posting User Content on or through the Platform, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>The User Content is yours or you have the right to use it and grant us the rights and license as provided in these Terms.</li>
              <li>The posting of your User Content on or through the Platform does not violate the privacy rights, publicity rights, copyrights, contract rights, or any other rights of any person.</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Intellectual Property Rights</h2>
            <p className="text-slate-700">
              The Platform and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by TankTide, its licensors, or other providers of such material and are protected by copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">6. Prohibited Uses</h2>
            <p className="text-slate-700">
              You may use the Platform only for lawful purposes and in accordance with these Terms. You agree not to use the Platform:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li>In any way that violates any applicable federal, state, local, or international law or regulation.</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any other similar solicitation.</li>
              <li>To impersonate or attempt to impersonate TankTide, a TankTide employee, another user, or any other person or entity.</li>
              <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Platform, or which, as determined by us, may harm TankTide or users of the Platform, or expose them to liability.</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">7. Termination</h2>
            <p className="text-slate-700">
              We may terminate or suspend your account and bar access to the Platform immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>
            <p className="text-slate-700">
              If you wish to terminate your account, you may simply discontinue using the Platform, or contact us to request account deletion.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="text-slate-700">
              In no event will TankTide, its affiliates, or their licensors, service providers, employees, agents, officers, or directors be liable for damages of any kind, under any legal theory, arising out of or in connection with your use, or inability to use, the Platform, any websites linked to it, any content on the Platform or such other websites, including any direct, indirect, special, incidental, consequential, or punitive damages.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">9. Governing Law</h2>
            <p className="text-slate-700">
              These Terms shall be governed by and defined following the laws of the United States and the State of California. TankTide and yourself irrevocably consent that the courts of California shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these Terms.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">10. EU Users</h2>
            <p className="text-slate-700">
              If you are a user from the European Union, you agree that any disputes arising under these Terms will be resolved in accordance with the laws of your country of residence to the extent required by applicable EU law.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">11. Changes to Terms</h2>
            <p className="text-slate-700">
              We may revise these Terms at any time by amending this page. Please check this page regularly to take notice of any changes, as they are binding on you.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">12. Contact Us</h2>
            <p className="text-slate-700">
              If you have any questions about these Terms, please contact us at <a href="mailto:legal@tanktide.com" className="text-blue-600 hover:text-blue-800">legal@tanktide.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;