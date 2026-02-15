import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './MinimizeIcon.module.css';

export interface MinimizeIconProps {
  onClick?: () => void;
  size?: number;
  className?: string;
  useShadowDom?: boolean;
  /** Icon direction: right (>) for settings/summary panel, left (<) for others */
  direction?: 'left' | 'right';
}

export const MinimizeIcon: React.FC<MinimizeIconProps> = ({
  onClick,
  size = 18,
  className = '',
  useShadowDom = false,
  direction = 'left',
}) => {
  const buttonClass = useShadowDom ? 'minimizeIcon' : styles.minimizeIcon;
  const Icon = direction === 'right' ? ChevronRight : ChevronLeft;

  return (
    <button
      className={`${buttonClass} ${className}`}
      onClick={onClick}
      aria-label="Minimize"
      type="button"
    >
      <Icon size={size} strokeWidth={2} />
    </button>
  );
};
