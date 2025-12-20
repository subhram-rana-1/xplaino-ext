// src/content/components/SidePanel/Footer.tsx
import React, { useRef, useState, useEffect } from 'react';
import { FileText, Settings, User, LucideIcon } from 'lucide-react';
import styles from './Footer.module.css';
import { OnHoverMessage } from '../OnHoverMessage/OnHoverMessage';

export type TabType = 'summary' | 'settings' | 'my';

export interface FooterProps {
  /** Active tab */
  activeTab: TabType;
  /** Tab change handler */
  onTabChange: (tab: TabType) => void;
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
}

interface TabConfig {
  type: TabType;
  icon: LucideIcon;
  label: string;
}

const tabs: TabConfig[] = [
  { type: 'summary', icon: FileText, label: 'Summary' },
  { type: 'settings', icon: Settings, label: 'Settings' },
  { type: 'my', icon: User, label: 'My' },
];

export const Footer: React.FC<FooterProps> = ({ activeTab, onTabChange, useShadowDom = false }) => {
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<{ [key in TabType]?: React.RefObject<HTMLButtonElement> }>({
    summary: React.createRef(),
    settings: React.createRef(),
    my: React.createRef(),
  });

  useEffect(() => {
    if (hoveredTab) {
      // Show tooltip after 1 second
      hoverTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 1000);
    } else {
      // Clear timeout and hide tooltip when not hovering
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setShowTooltip(false);
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [hoveredTab]);

  const handleMouseEnter = (tabType: TabType) => {
    setHoveredTab(tabType);
  };

  const handleMouseLeave = () => {
    setHoveredTab(null);
    setShowTooltip(false);
  };

  const getClassName = (baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    const styleClass = styles[baseClass as keyof typeof styles];
    return styleClass || baseClass;
  };

  return (
    <div className={getClassName('footer')}>
      <div className={getClassName('tabGroup')}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.type;
          const isHovered = hoveredTab === tab.type;
          const buttonRef = tabRefs.current[tab.type];

          const tabClassName = useShadowDom
            ? `tab ${isActive ? 'active' : ''}`
            : `${styles.tab} ${isActive ? styles.active : ''}`;

          return (
            <div key={tab.type} className={getClassName('tabWrapper')}>
              <button
                ref={buttonRef}
                className={tabClassName}
                onClick={() => onTabChange(tab.type)}
                onMouseEnter={() => handleMouseEnter(tab.type)}
                onMouseLeave={handleMouseLeave}
                aria-label={tab.label}
                type="button"
              >
                <IconComponent size={18} strokeWidth={2.5} />
              </button>
              {showTooltip && isHovered && buttonRef?.current && (
                <OnHoverMessage
                  message={tab.label}
                  targetRef={buttonRef}
                  position="top"
                  offset={8}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

Footer.displayName = 'Footer';
