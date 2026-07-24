import React from 'react';

// Uniform brand tiles: color carries no meaning across companies, so one
// ink-on-wash style keeps the list calm and on-palette
const PALETTE = [
  { bg: 'bg-ink-wash', text: 'text-ink' },
];

function getColorForCompany(company: string) {
  let hash = 0;
  for (let i = 0; i < company.length; i++) {
    hash = company.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface CompanyAvatarProps {
  company: string;
  size?: 'sm' | 'lg';
}

const CompanyAvatar: React.FC<CompanyAvatarProps> = ({ company, size = 'sm' }) => {
  const safeName = (company || '?').trim();
  const { bg, text } = getColorForCompany(safeName || '?');
  const initial = safeName.charAt(0).toUpperCase() || '?';
  const sizeClass = size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={`w-full h-full rounded-[inherit] flex items-center justify-center font-black ${bg} ${text} ${sizeClass}`}>
      {initial}
    </div>
  );
};

export default CompanyAvatar;
