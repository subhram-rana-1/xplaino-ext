// src/content/components/SidePanel/LoadingDots.tsx
import React from 'react';

export interface LoadingDotsProps {
  /** Current dot count (1-3) */
  dotCount: number;
  /** Function to get className based on useShadowDom */
  getClassName: (baseClass: string) => string;
}

/**
 * Reusable loading dots animation component
 * Displays animated dots (1-3) for loading states
 */
export const LoadingDots: React.FC<LoadingDotsProps> = ({
  dotCount,
  getClassName,
}) => {
  return (
    <div className={getClassName('loadingDots')}>
      {'.'.repeat(dotCount)}
    </div>
  );
};

LoadingDots.displayName = 'LoadingDots';

