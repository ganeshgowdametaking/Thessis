import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-card ${className}`}>
    {children}
  </div>
);

interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, action, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 p-5 pb-0 ${className}`}>
    <div className="min-w-0">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardBody: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

export default Card;
