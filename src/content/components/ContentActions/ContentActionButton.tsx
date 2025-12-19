// src/content/components/ContentActions/ContentActionButton.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, SpellCheck, Languages, Bookmark, Power } from 'lucide-react';

export interface ContentActionButtonProps {
  /** Icon type */
  icon: 'explain' | 'grammar' | 'translate' | 'bookmark' | 'power';
  /** Tooltip text */
  tooltip: string;
  /** Click handler */
  onClick?: () => void;
  /** Animation delay index */
  delay?: number;
  /** Children to render (for popover) */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Whether to hide the tooltip (e.g., when popover is open) */
  hideTooltip?: boolean;
}

const iconMap = {
  explain: Sparkles,
  grammar: SpellCheck,
  translate: Languages,
  bookmark: Bookmark,
  power: Power,
};

export const ContentActionButton: React.FC<ContentActionButtonProps> = ({
  icon,
  tooltip,
  onClick,
  delay = 0,
  children,
  className = '',
  hideTooltip = false,
}) => {
  const IconComponent = iconMap[icon];
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

  // Sync tooltip state with hideTooltip prop
  useEffect(() => {
    if (hideTooltip) {
      setShowTooltip(false);
    }
  }, [hideTooltip]);

  return (
    <div className={`contentActionButtonWrapper ${className}`}>
      <button
        ref={buttonRef}
        className="contentActionButton"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(false); // Clear tooltip on click
          onClick?.();
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={tooltip}
        style={{ animationDelay: `${delay * 50}ms` }}
      >
        <IconComponent
          size={18}
          strokeWidth={2.5}
        />
      </button>
      {showTooltip && !hideTooltip && (
        <div className="contentActionTooltip">
          {tooltip}
        </div>
      )}
      {children}
    </div>
  );
};

ContentActionButton.displayName = 'ContentActionButton';

