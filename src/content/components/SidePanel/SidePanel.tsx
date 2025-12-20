// src/content/components/SidePanel/SidePanel.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './SidePanel.module.css';
import { Header } from './Header';
import { Footer } from './Footer';

export interface SidePanelProps {
  /** Whether panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
}

type TabType = 'summary' | 'settings' | 'my';

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 400;

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  useShadowDom = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isVerticallyExpanded, setIsVerticallyExpanded] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(DEFAULT_WIDTH);

  // Get class name based on context (Shadow DOM vs CSS Modules)
  const getClassName = useCallback((shadowClass: string, moduleClass: string) => {
    return useShadowDom ? shadowClass : moduleClass;
  }, [useShadowDom]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    },
    [width]
  );

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = startXRef.current - e.clientX;
      let newWidth = startWidthRef.current + deltaX;

      // Clamp width
      newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  // Reset tab and states when panel closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('summary');
      setIsVerticallyExpanded(false);
      setIsSlidingOut(false);
    }
  }, [isOpen]);

  const handleSlideOut = useCallback(() => {
    setIsSlidingOut(true);
    setTimeout(() => {
      onClose?.();
    }, 300); // Match transition duration
  }, [onClose]);

  const handleVerticalExpand = useCallback(() => {
    setIsVerticallyExpanded((prev) => !prev);
  }, []);

  // Class names for Shadow DOM vs CSS Modules
  const sidePanelClass = getClassName(
    `sidePanel ${isOpen ? 'open' : ''} ${isSlidingOut ? 'slidingOut' : ''} ${isVerticallyExpanded ? 'verticallyExpanded' : ''}`,
    `${styles.sidePanel} ${isOpen ? styles.open : ''} ${isSlidingOut ? styles.slidingOut : ''} ${isVerticallyExpanded ? styles.verticallyExpanded : ''}`
  );
  const resizeHandleClass = getClassName('resizeHandle', styles.resizeHandle);
  const contentClass = getClassName('content', styles.content);

  return (
    <div
      ref={panelRef}
      className={sidePanelClass}
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className={resizeHandleClass}
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <Header
        onSlideOut={handleSlideOut}
        onVerticalExpand={handleVerticalExpand}
        brandImageSrc={chrome.runtime.getURL('src/assets/photos/brand-name.png')}
        useShadowDom={useShadowDom}
        isExpanded={isVerticallyExpanded}
      />

      {/* Content */}
      <div className={contentClass}>
        {/* Content components empty for now */}
      </div>

      {/* Footer */}
      <Footer
        activeTab={activeTab}
        onTabChange={setActiveTab}
        useShadowDom={useShadowDom}
      />
    </div>
  );
};

SidePanel.displayName = 'SidePanel';
