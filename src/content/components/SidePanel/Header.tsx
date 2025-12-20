// src/content/components/SidePanel/Header.tsx
import React from 'react';
import { ChevronRight } from 'lucide-react';
import styles from './Header.module.css';

// Custom expand icon - arrows pointing away from center (up and down)
const ExpandVerticalIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Arrow pointing up */}
    <polyline points="8 5 12 1 16 5" />
    {/* Arrow pointing down */}
    <polyline points="8 19 12 23 16 19" />
    {/* Center line */}
    <line x1="12" y1="1" x2="12" y2="23" />
  </svg>
);

// Custom contract icon - arrows pointing toward center
const ContractVerticalIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Arrow pointing down (from top) */}
    <polyline points="8 8 12 12 16 8" />
    {/* Arrow pointing up (from bottom) */}
    <polyline points="8 16 12 12 16 16" />
    {/* Top line */}
    <line x1="12" y1="1" x2="12" y2="12" />
    {/* Bottom line */}
    <line x1="12" y1="12" x2="12" y2="23" />
  </svg>
);

export interface HeaderProps {
  /** Brand image source */
  brandImageSrc?: string;
  /** Click handler for brand */
  onBrandClick?: () => void;
  /** Slide out handler */
  onSlideOut?: () => void;
  /** Vertical expand handler */
  onVerticalExpand?: () => void;
  /** Login handler */
  onLogin?: () => void;
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
  /** Whether the panel is vertically expanded */
  isExpanded?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  brandImageSrc,
  onBrandClick,
  onSlideOut,
  onVerticalExpand,
  onLogin,
  useShadowDom = false,
  isExpanded = false,
}) => {
  const getClassName = (baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    const styleClass = styles[baseClass as keyof typeof styles];
    return styleClass || baseClass;
  };

  const handleBrandClick = () => {
    if (onBrandClick) {
      onBrandClick();
    } else {
      // Default: open xplaino.com in new tab
      window.open('https://xplaino.com', '_blank');
    }
  };

  const handleSlideOut = () => {
    onSlideOut?.();
  };

  const handleVerticalExpand = () => {
    onVerticalExpand?.();
  };

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      // Default: open xplaino.com login page
      chrome.tabs.create({ url: 'https://xplaino.com/login' });
    }
  };

  return (
    <div className={getClassName('header')}>
      {/* Left: Action Icons */}
      <div className={getClassName('headerLeft')}>
        <button
          className={getClassName('headerIconButton')}
          onClick={handleSlideOut}
          aria-label="Slide out panel"
          type="button"
        >
          <ChevronRight size={18} />
        </button>
        <button
          className={getClassName('headerIconButton')}
          onClick={handleVerticalExpand}
          aria-label={isExpanded ? "Contract vertically" : "Expand vertically"}
          type="button"
        >
          {isExpanded ? <ContractVerticalIcon size={18} /> : <ExpandVerticalIcon size={18} />}
        </button>
      </div>

      {/* Center: Branding */}
      <div className={getClassName('headerCenter')}>
        {brandImageSrc ? (
          <img
            src={brandImageSrc}
            alt="Xplaino"
            className={getClassName('headerBrand')}
            onClick={handleBrandClick}
          />
        ) : (
          <div
            className={getClassName('headerBrand')}
            onClick={handleBrandClick}
          >
            Xplaino
          </div>
        )}
      </div>

      {/* Right: Login */}
      <div className={getClassName('headerRight')}>
        <button
          className={getClassName('loginButton')}
          onClick={handleLogin}
          aria-label="Login"
          type="button"
        >
          Login
        </button>
      </div>
    </div>
  );
};

Header.displayName = 'Header';
