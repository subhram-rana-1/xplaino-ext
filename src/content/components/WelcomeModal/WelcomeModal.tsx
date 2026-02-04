// src/content/components/WelcomeModal/WelcomeModal.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { getCurrentTheme } from '@/constants/theme';

export interface WelcomeModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when "Ok" is clicked */
  onOk?: () => void;
  /** Callback when "Don't show me again" is clicked */
  onDontShowAgain?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  visible,
  onOk,
  onDontShowAgain,
}) => {
  const [brandImageUrl, setBrandImageUrl] = useState<string>('');

  // Detect theme and set appropriate brand image
  useEffect(() => {
    const loadBrandImage = async () => {
      const theme = await getCurrentTheme();
      const imageName = theme === 'dark' 
        ? 'brand-name-turquoise.png' 
        : 'brand-name.png';
      const imageUrl = chrome.runtime.getURL(`src/assets/photos/${imageName}`);
      setBrandImageUrl(imageUrl);
    };

    loadBrandImage();
  }, []);

  const handleOk = useCallback(() => {
    onOk?.();
  }, [onOk]);

  const handleDontShowAgain = useCallback(() => {
    onDontShowAgain?.();
  }, [onDontShowAgain]);

  if (!visible) return null;

  return (
    <div className="welcomeModalContainer">
      <div className="welcomeModalContent">
        {/* Brand Image */}
        <div className="welcomeModalImageContainer">
          <img 
            src={brandImageUrl} 
            alt="Xplaino" 
            className="welcomeModalImage"
          />
        </div>

        {/* Instruction Text */}
        <p className="welcomeModalText">
          Double click a word or select a content to understand the contextual meaning
        </p>

        {/* Buttons */}
        <div className="welcomeModalButtons">
          <button
            className="welcomeModalButton okButton"
            onClick={handleOk}
            type="button"
          >
            Ok
          </button>
          <button
            className="welcomeModalButton dontShowButton"
            onClick={handleDontShowAgain}
            type="button"
          >
            Don't show me again
          </button>
        </div>
      </div>
    </div>
  );
};

WelcomeModal.displayName = 'WelcomeModal';

