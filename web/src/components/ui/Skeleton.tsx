import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-parchment-sunken/70 ${className}`} aria-hidden="true" />
);

/** A generic list-row skeleton: avatar block + two text lines */
export const SkeletonRow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-3 p-4 ${className}`} aria-hidden="true">
    <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);

export default Skeleton;
