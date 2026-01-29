import React from 'react';
import CompanyHeader from './CompanyHeader';
import CompanyFooter from './CompanyFooter';

interface CompanyLayoutProps {
  children: React.ReactNode;
}

const CompanyLayout: React.FC<CompanyLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <CompanyHeader />
      <main className="flex-grow">
        {children}
      </main>
      <CompanyFooter />
    </div>
  );
};

export default CompanyLayout; 