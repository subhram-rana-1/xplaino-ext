// src/content/components/YouTubeAskAIButton/YouTubeAskAIButton.tsx
import React from 'react';
import styles from './YouTubeAskAIButton.module.css';

export interface YouTubeAskAIButtonProps {
  onClick: () => void;
  disabled?: boolean;
  useShadowDom?: boolean;
}

/**
 * Get the icon URL for the Xplaino white icon
 */
function getIconUrl(useShadowDom: boolean): string {
  if (useShadowDom) {
    // For Shadow DOM, use chrome.runtime.getURL
    return chrome.runtime.getURL('src/assets/icons/xplaino-white-icon.ico');
  }
  // For regular React context, import would be used
  return '';
}

export const YouTubeAskAIButton: React.FC<YouTubeAskAIButtonProps> = ({
  onClick,
  disabled = false,
  useShadowDom = false,
}) => {
  const getClassName = (shadowClass: string, moduleClass: string) => {
    return useShadowDom ? shadowClass : moduleClass;
  };

  const iconUrl = getIconUrl(useShadowDom);

  return (
    <button
      className={getClassName('youtubeAskAIButton', styles.button)}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {iconUrl && (
        <img
          src={iconUrl}
          alt="Xplaino"
          className={getClassName('youtubeAskAIIcon', styles.icon)}
        />
      )}
      <span className={getClassName('youtubeAskAIText', styles.text)}>Ask AI</span>
    </button>
  );
};

YouTubeAskAIButton.displayName = 'YouTubeAskAIButton';

