// src/content/components/SidePanel/MyView.tsx
import React from 'react';
import styles from './MyView.module.css';

interface LinkItem {
  icon: React.ReactNode;
  text: string;
  url: string;
}

export const MyView: React.FC = () => {
  const links: LinkItem[] = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
      text: 'View my saved words',
      url: 'https://xplaino.com/my-words',
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      text: 'View my saved paragraphs',
      url: 'https://xplaino.com/my-paragraphs',
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      text: 'View my saved pages',
      url: 'https://xplaino.com/my-pages',
    },
  ];

  const handleLinkClick = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div className={styles.myView}>
      <div className={styles.linksList}>
        {links.map((link, index) => (
          <div
            key={index}
            className={styles.linkItem}
            onClick={() => handleLinkClick(link.url)}
          >
            <div className={styles.linkIcon}>{link.icon}</div>
            <span className={styles.linkText}>{link.text}</span>
            <div className={styles.linkRefIcon}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

MyView.displayName = 'MyView';

