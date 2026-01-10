// src/content/components/SubscriptionModal/SubscriptionModal.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { showSubscriptionModalAtom } from '@/store/uiAtoms';
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
  
  // Get the brand image URL using chrome.runtime.getURL
  const brandImageUrl = chrome.runtime.getURL('src/assets/photos/brand-name.png');

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
          <p className={getClassName('subscriptionModalTrialEnded')}>Your free trial has ended</p>
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

        {/* View All Plans Button */}
        <button
          className={getClassName('pricingButton')}
          onClick={handleGoToPricing}
          type="button"
        >
          <span className={getClassName('pricingButtonText')}>
            View all plans
          </span>
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

