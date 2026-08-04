import React, { useState, useEffect } from 'react';

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
  logoUrl?: string | null;
  size?: 'sm' | 'lg';
}

const CompanyAvatar: React.FC<CompanyAvatarProps> = ({ company, logoUrl, size = 'sm' }) => {
  const safeName = (company || '?').trim();
  const [imgFailed, setImgFailed] = useState(false);

  // Reset failure state when a new URL comes in (e.g. a different company)
  useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  if (logoUrl && !imgFailed) {
    return (
      <div className="w-full h-full rounded-[inherit] bg-white flex items-center justify-center overflow-hidden p-0.5">
        <img
          src={logoUrl}
          alt={`${safeName} logo`}
          className="w-full h-full object-contain"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

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
