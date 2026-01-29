import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CookiePolicyProps {
  onBack: () => void;
}

const CookiePolicy: React.FC<CookiePolicyProps> = ({ onBack }) => {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Cookie Policy</h1>
          </div>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600">
              Last updated: June 15, 2025
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
            <p className="text-slate-700">
              This Cookie Policy explains how TankTide ("we", "our", or "us") uses cookies and similar technologies to recognize you when you visit our website. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. What Are Cookies?</h2>
            <p className="text-slate-700">
              Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
            </p>
            <p className="text-slate-700">
              Cookies set by the website owner (in this case, TankTide) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics).
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Types of Cookies We Use</h2>
            
            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.1 Necessary Cookies</h3>
            <p className="text-slate-700">
              These cookies are essential for the website to function properly. They enable core functionality such as security, network management, and account access. You may disable these by changing your browser settings, but this may affect how the website functions.
            </p>
            <p className="text-slate-700">
              Examples:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              <li>Authentication cookies</li>
              <li>Security cookies</li>
              <li>Load balancing cookies</li>
            </ul>
            
            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.2 Functional Cookies</h3>
            <p className="text-slate-700">
              These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.
            </p>
            <p className="text-slate-700">
              Examples:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              <li>Language preference cookies</li>
              <li>Region preference cookies</li>
              <li>User interface customization cookies</li>
            </ul>
            
            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.3 Analytics Cookies</h3>
            <p className="text-slate-700">
              These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.
            </p>
            <p className="text-slate-700">
              Examples:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              <li>Google Analytics cookies</li>
              <li>Performance monitoring cookies</li>
              <li>Traffic analysis cookies</li>
            </ul>
            
            <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-3">3.4 Marketing Cookies</h3>
            <p className="text-slate-700">
              These cookies track your browsing habits to enable us to show advertising which is more likely to be of interest to you. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.
            </p>
            <p className="text-slate-700">
              Examples:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              <li>Behavioral advertising cookies</li>
              <li>Social media cookies</li>
              <li>Ad delivery and measurement cookies</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. How Can You Control Cookies?</h2>
            <p className="text-slate-700">
              You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences through our cookie consent banner that appears when you first visit our site.
            </p>
            <p className="text-slate-700">
              You can also set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.
            </p>
            <p className="text-slate-700">
              Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.aboutcookies.org" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">www.aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a>.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Specific Browser Instructions</h2>
            <p className="text-slate-700">
              Find out how to manage cookies on popular browsers:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">6. Third-Party Cookies</h2>
            <p className="text-slate-700">
              We may use third-party services that use cookies on our website, including:
            </p>
            <ul className="list-disc pl-6 text-slate-700 space-y-2">
              <li><strong>Google Analytics:</strong> We use Google Analytics to analyze the use of our website. Google Analytics gathers information about website use by means of cookies. The information gathered is used to create reports about the use of our website. Google's privacy policy is available at: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
              <li><strong>Social Media:</strong> We use social media buttons and/or plugins on this site that allow you to connect with your social network in various ways. For these to work, social media sites will set cookies through our site which may be used to enhance your profile on their site or contribute to the data they hold for various purposes outlined in their respective privacy policies.</li>
            </ul>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">7. Updates to This Cookie Policy</h2>
            <p className="text-slate-700">
              We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
            </p>
            <p className="text-slate-700">
              The date at the top of this Cookie Policy indicates when it was last updated.
            </p>
            
            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">8. Contact Us</h2>
            <p className="text-slate-700">
              If you have any questions about our use of cookies or other technologies, please email us at <a href="mailto:privacy@tanktide.com" className="text-blue-600 hover:text-blue-800">privacy@tanktide.com</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;