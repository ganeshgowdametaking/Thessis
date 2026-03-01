import React from 'react';

interface BackArrowIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const BackArrowIcon: React.FC<BackArrowIconProps> = ({ className = 'h-5 w-5', ...props }) => {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        d="M96 64H28M28 64L58 34M28 64L58 94"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BackArrowIcon;
