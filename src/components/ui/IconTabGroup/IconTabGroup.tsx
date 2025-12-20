// src/components/ui/IconTabGroup/IconTabGroup.tsx
import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './IconTabGroup.module.css';

export interface IconTab {
  id: string;
  icon: LucideIcon;
  label?: string; // Optional for accessibility/tooltips
}

export interface IconTabGroupProps {
  /** Array of tab configurations */
  tabs: IconTab[];
  /** Currently active tab ID */
  activeTabId: string;
  /** Handler called when a tab is clicked */
  onTabChange: (tabId: string) => void;
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
  /** Icon size in pixels */
  iconSize?: number;
}

export const IconTabGroup: React.FC<IconTabGroupProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  useShadowDom = false,
  iconSize = 24,
}) => {
  const tabGroupRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Initialize tab refs array
  useEffect(() => {
    tabRefs.current = tabs.map(() => null);
  }, [tabs]);

  const updateSliderPosition = useCallback(() => {
    if (!sliderRef.current || !tabGroupRef.current) return false;

    const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (activeIndex === -1) return false;

    const activeTab = tabRefs.current[activeIndex];
    if (!activeTab) return false;

    const groupRect = tabGroupRef.current.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    
    // Check if we have valid dimensions
    if (groupRect.width === 0 || tabRect.width === 0) return false;

    const offsetX = tabRect.left - groupRect.left;
    const width = tabRect.width;

    sliderRef.current.style.transform = `translateX(${offsetX}px)`;
    sliderRef.current.style.width = `${width}px`;
    return true;
  }, [activeTabId, tabs]);

  // Use layout effect for initial mount to ensure slider is positioned before paint
  useLayoutEffect(() => {
    updateSliderPosition();
  }, [updateSliderPosition]);

  // Also use a regular effect as a fallback for initial mount with retry
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryUpdate = () => {
      const success = updateSliderPosition();
      if (!success && retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryUpdate, 20 * retryCount); // Exponential backoff
      }
    };

    // Initial attempt after a small delay
    const timeoutId = setTimeout(tryUpdate, 10);

    return () => clearTimeout(timeoutId);
  }, []); // Only run on mount

  // Update slider position when activeTabId changes
  useEffect(() => {
    // Use requestAnimationFrame for subsequent updates to allow smooth transitions
    const rafId = requestAnimationFrame(() => {
      updateSliderPosition();
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeTabId, updateSliderPosition]);

  // Handle window resize to recalculate slider position
  useEffect(() => {
    const handleResize = () => {
      updateSliderPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateSliderPosition]);

  const getClassName = (baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    const styleClass = styles[baseClass as keyof typeof styles];
    return styleClass || baseClass;
  };

  return (
    <div className={getClassName('tabGroup')} ref={tabGroupRef}>
      <div className={getClassName('tabSlider')} ref={sliderRef} />
      {tabs.map((tab, index) => {
        const IconComponent = tab.icon;
        const isActive = activeTabId === tab.id;

        const tabClassName = useShadowDom
          ? `tab ${isActive ? 'active' : ''}`
          : `${styles.tab} ${isActive ? styles.active : ''}`;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            className={tabClassName}
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label || tab.id}
            type="button"
          >
            <IconComponent size={iconSize} strokeWidth={3} />
          </button>
        );
      })}
    </div>
  );
};

IconTabGroup.displayName = 'IconTabGroup';

