// src/content/components/SubscriptionModal/SubscriptionModal.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Crown } from 'lucide-react';
import { showSubscriptionModalAtom, currentThemeAtom } from '@/store/uiAtoms';
import { ENV } from '@/config/env';

export interface SubscriptionModalProps {
  /** Whether component is rendered in Shadow DOM */
  useShadowDom?: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ useShadowDom: _useShadowDom = false }) => {
  // Note: useShadowDom prop reserved for future Shadow DOM compatibility
  void _useShadowDom;
  const [isVisible, setIsVisible] = useAtom(showSubscriptionModalAtom);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const currentTheme = useAtomValue(currentThemeAtom);
  const [brandImageUrl, setBrandImageUrl] = useState('');
  
  // Load theme-aware brand image when theme changes
  useEffect(() => {
    const imageName = currentTheme === 'dark' 
      ? 'brand-name-turquoise.png' 
      : 'brand-name.png';
    const imageUrl = chrome.runtime.getURL(`src/assets/photos/${imageName}`);
    setBrandImageUrl(imageUrl);
  }, [currentTheme]);

  const getClassName = useCallback((baseClass: string) => {
    // For Shadow DOM, use plain class names
    return baseClass;
  }, []);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300); // Match animation duration
  }, [setIsVisible]);

  // Handle click outside modal
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose]);

  // Handle navigation to pricing page
  const handleGoToPricing = useCallback(() => {
    const pricingUrl = `${ENV.XPLAINO_WEBSITE_BASE_URL}/pricing`;
    window.open(pricingUrl, '_blank', 'noopener,noreferrer');
    handleClose();
  }, [handleClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`${getClassName('subscriptionModalOverlay')} ${isClosing ? getClassName('closing') : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`${getClassName('subscriptionModalContainer')} ${isClosing ? getClassName('closing') : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={getClassName('subscriptionModalHeader')}>
          <p className={getClassName('subscriptionModalTrialEnded')}>Now your current plan needs an upgrade</p>
          <h2 className={getClassName('subscriptionModalTitle')}>It's time for your upgrade !</h2>
          <p className={getClassName('subscriptionModalSubtitle')}>
            Unlock all premium features with a subscription
          </p>
        </div>

        {/* Brand Name Image */}
        <div className={getClassName('brandImageContainer')}>
          <img 
            src={brandImageUrl} 
            alt="Xplain" 
            className={getClassName('brandImage')}
          />
        </div>

        {/* Upgrade Button */}
        <button
          className={getClassName('upgradeButton')}
          onClick={handleGoToPricing}
          type="button"
        >
          <Crown size={16} strokeWidth={2.5} />
          <span>Upgrade</span>
        </button>

        {/* Footer */}
        <p className={getClassName('subscriptionModalFooter')}>
          Choose a plan that works best for you
        </p>
      </div>
    </div>
  );
};

SubscriptionModal.displayName = 'SubscriptionModal';

