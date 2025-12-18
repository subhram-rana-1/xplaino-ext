// src/content/components/SidePanel/Header.tsx
import React from 'react';
import styles from './SidePanel.module.css';

export interface HeaderProps {
  /** Brand image source */
  brandImageSrc?: string;
  /** Click handler for brand */
  onBrandClick?: () => void;
  /** Close handler */
  onClose?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  brandImageSrc,
  onBrandClick,
  onClose,
}) => {
  const handleBrandClick = () => {
    if (onBrandClick) {
      onBrandClick();
    } else {
      // Default: open xplaino.com
      chrome.tabs.create({ url: 'https://xplaino.com' });
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={styles.header}>
      {brandImageSrc ? (
        <img
          src={brandImageSrc}
          alt="Xplaino"
          className={styles.headerBrand}
          onClick={handleBrandClick}
        />
      ) : (
        <div
          className={styles.headerBrand}
          onClick={handleBrandClick}
          style={{
            color: '#9527F5',
            fontSize: '20px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Xplaino
        </div>
      )}
      <button
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="Close panel"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

Header.displayName = 'Header';
