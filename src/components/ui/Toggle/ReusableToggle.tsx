// src/components/ui/Toggle/ReusableToggle.tsx
// Reusable toggle component that works in both content scripts (Shadow DOM) and regular React contexts

import React from 'react';
import styles from './ReusableToggle.module.css';

export interface ReusableToggleProps {
  /** Toggle checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Whether to use Shadow DOM styling (uses plain class names instead of CSS modules) */
  useShadowDom?: boolean;
}

export const ReusableToggle: React.FC<ReusableToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  useShadowDom = false,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  // Get class names based on context
  const getClassName = (baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    return styles[baseClass as keyof typeof styles] || baseClass;
  };

  const toggleContainerClass = getClassName('toggleContainer');
  const toggleTrackClass = `${getClassName('toggleTrack')} ${checked ? getClassName('checked') : ''}`;
  const toggleThumbClass = `${getClassName('toggleThumb')} ${checked ? getClassName('thumbChecked') : ''}`;

  return (
    <div
      className={toggleContainerClass}
      onClick={handleClick}
      style={disabled ? { cursor: 'not-allowed', opacity: 0.7 } : { cursor: 'pointer' }}
    >
      <div className={toggleTrackClass}>
        <div className={toggleThumbClass} />
      </div>
    </div>
  );
};

ReusableToggle.displayName = 'ReusableToggle';
