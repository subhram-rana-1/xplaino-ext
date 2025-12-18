// src/content/components/SidePanel/SidePanel.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { Footer, TabType } from './Footer';
import { SummaryView } from './SummaryView';
import { SettingsView } from './SettingsView';
import { MyView } from './MyView';
import { ResizeHandle, ResizeHandlePosition } from './ResizeHandle';
import styles from './SidePanel.module.css';

export interface SidePanelProps {
  /** Whether panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose?: () => void;
  /** Brand image source */
  brandImageSrc?: string;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 400;

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  brandImageSrc,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(DEFAULT_WIDTH);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, position: ResizeHandlePosition) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = position === 'left' ? 'ew-resize' : position === 'top-left' ? 'nw-resize' : 'sw-resize';
    },
    [width]
  );

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = startXRef.current - e.clientX; // Negative because we're resizing from left
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

  // Reset tab when panel closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('summary');
    }
  }, [isOpen]);

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <SummaryView
            onSendMessage={(msg) => console.log('[Summary] Send:', msg)}
            onVoiceRecord={() => console.log('[Summary] Voice record')}
            onClearChat={() => console.log('[Summary] Clear chat')}
          />
        );
      case 'settings':
        return <SettingsView />;
      case 'my':
        return <MyView />;
      default:
        return null;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={`${styles.sidePanel} ${isOpen ? styles.open : ''}`}
      style={{ width: `${width}px` }}
    >
      {/* Resize Handles */}
      <div className={styles.resizeHandles}>
        <ResizeHandle
          position="top-left"
          onMouseDown={handleResizeStart}
        />
        <ResizeHandle
          position="left"
          onMouseDown={handleResizeStart}
        />
        <ResizeHandle
          position="bottom-left"
          onMouseDown={handleResizeStart}
        />
      </div>

      {/* Header */}
      <Header brandImageSrc={brandImageSrc} onClose={onClose} />

      {/* Content */}
      <div className={styles.content}>{renderContent()}</div>

      {/* Footer */}
      <Footer activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

SidePanel.displayName = 'SidePanel';
