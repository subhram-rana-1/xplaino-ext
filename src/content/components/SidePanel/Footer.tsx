// src/content/components/SidePanel/Footer.tsx
import React from 'react';
import { FileText, Settings, User } from 'lucide-react';
import styles from './Footer.module.css';
import { IconTabGroup, IconTab } from '@/components/ui/IconTabGroup';

export type TabType = 'summary' | 'settings' | 'my';

export interface FooterProps {
  /** Active tab */
  activeTab: TabType;
  /** Tab change handler */
  onTabChange: (tab: TabType) => void;
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
}

const tabs: IconTab[] = [
  { id: 'summary', icon: FileText, label: 'Summary' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'my', icon: User, label: 'My' },
];

export const Footer: React.FC<FooterProps> = ({ activeTab, onTabChange, useShadowDom = false }) => {
  const getClassName = (baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    const styleClass = styles[baseClass as keyof typeof styles];
    return styleClass || baseClass;
  };

  const handleTabChange = (tabId: string) => {
    // Type guard to ensure tabId is a valid TabType
    if (tabId === 'summary' || tabId === 'settings' || tabId === 'my') {
      onTabChange(tabId);
    }
  };

  return (
    <div className={getClassName('footer')}>
      <IconTabGroup
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={handleTabChange}
        useShadowDom={useShadowDom}
        iconSize={24}
      />
    </div>
  );
};

Footer.displayName = 'Footer';
