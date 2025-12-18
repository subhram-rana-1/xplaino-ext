// src/content/components/SidePanel/ResizeHandle.tsx
import React from 'react';
import styles from './SidePanel.module.css';

export type ResizeHandlePosition = 'top-left' | 'left' | 'bottom-left';

export interface ResizeHandleProps {
  /** Handle position */
  position: ResizeHandlePosition;
  /** Mouse down handler */
  onMouseDown: (e: React.MouseEvent, position: ResizeHandlePosition) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  position,
  onMouseDown,
}) => {
  const getClassName = () => {
    switch (position) {
      case 'top-left':
        return styles.resizeHandleTopLeft;
      case 'left':
        return styles.resizeHandleLeft;
      case 'bottom-left':
        return styles.resizeHandleBottomLeft;
      default:
        return '';
    }
  };

  return (
    <div
      className={getClassName()}
      onMouseDown={(e) => onMouseDown(e, position)}
      role="button"
      aria-label={`Resize handle ${position}`}
      tabIndex={0}
    />
  );
};

ResizeHandle.displayName = 'ResizeHandle';
