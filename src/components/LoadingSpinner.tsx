import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  text = "Loading...", 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'scale-75',
    medium: 'scale-100',
    large: 'scale-125'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] w-full">
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="loader">
          <div className="dot"></div>
        </div>
        <div className="loader">
          <div className="dot"></div>
        </div>
        <div className="loader">
          <div className="dot"></div>
        </div>
        <div className="loader">
          <div className="dot"></div>
        </div>
        <div className="loader">
          <div className="dot"></div>
        </div>
        <div className="loader">
          <div className="dot"></div>
        </div>
      </div>
      <div className="text">{text}</div>
    </div>
  );
};

export default LoadingSpinner; 