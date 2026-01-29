import React from 'react';

interface OfflineMessageProps {
  title: string;
  message: string;
  icon: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

const OfflineMessage: React.FC<OfflineMessageProps> = ({ 
  title, 
  message, 
  icon, 
  showRetry = false, 
  onRetry 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-stone-off flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-slate-500">{icon}</span>
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 max-w-md leading-relaxed mb-6">{message}</p>
      
      {showRetry && onRetry && (
        <button 
          onClick={onRetry}
          className="bg-sage hover:bg-sage-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          Try Again
        </button>
      )}
    </div>
  );
};

export default OfflineMessage;