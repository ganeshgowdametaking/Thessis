import React from 'react';

interface LoadingSpinnerProps {
  /** Read out to screen readers only — the loader itself shows no words. */
  text?: string;
  /** small = inside a card or list, medium = full page (default), large = splash */
  size?: 'small' | 'medium' | 'large';
  /** brand = logo blue on light backgrounds, light = white on dark backgrounds */
  tone?: 'brand' | 'light';
  /** A compact ring for use inside buttons — no minimum height. */
  inline?: boolean;
}

// The two leaves of the Thessis symbol (same shapes as /brand/thessis-symbol-indigo.svg).
const TOP_LEAF = 'M60 0H107V58C107 104 59 142 0 142V60C0 27 27 0 60 0Z';
const BOTTOM_LEAF = 'M108 85H152C184 85 210 111 210 143V266H167C134 266 108 240 108 208Z';

const MARK_HEIGHT = { small: 60, medium: 104, large: 128 };

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text,
  size = 'medium',
  tone = 'brand',
  inline = false,
}) => {
  if (inline) {
    return (
      <span className="inline-flex items-center justify-center gap-2" role="status">
        <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
          <path d="M17.5 10A7.5 7.5 0 0 0 10 2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        {text ? <span>{text}</span> : <span className="sr-only">Loading</span>}
      </span>
    );
  }

  const height = MARK_HEIGHT[size];
  const width = Math.round((height * 210) / 266);
  const fill = tone === 'light' ? '#FFFFFF' : '#3E4BFC';

  return (
    <div
      className={`flex items-center justify-center w-full ${size === 'small' ? 'min-h-[200px]' : 'min-h-[260px]'}`}
      role="status"
      aria-live="polite"
    >
      <svg width={width} height={height} viewBox="0 0 210 266" aria-hidden="true" className="overflow-visible">
        <path className="thessis-loader-leaf-a" d={TOP_LEAF} fill={fill} />
        <path className="thessis-loader-leaf-b" d={BOTTOM_LEAF} fill={fill} />
      </svg>
      <span className="sr-only">{text || 'Loading'}</span>
    </div>
  );
};

export default LoadingSpinner;
