// src/content/components/SidePanel/Footer.tsx
import React from 'react';
import styles from './SidePanel.module.css';

export type TabType = 'summary' | 'settings' | 'my';

export interface FooterProps {
  /** Active tab */
  activeTab: TabType;
  /** Tab change handler */
  onTabChange: (tab: TabType) => void;
}

export const Footer: React.FC<FooterProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className={styles.footer}>
      <div className={styles.tabGroup}>
        <button
          className={`${styles.tab} ${activeTab === 'summary' ? styles.active : ''}`}
          onClick={() => onTabChange('summary')}
        >
          Summary
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => onTabChange('settings')}
        >
          Settings
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'my' ? styles.active : ''}`}
          onClick={() => onTabChange('my')}
        >
          My
        </button>
      </div>
    </div>
  );
};

Footer.displayName = 'Footer';
