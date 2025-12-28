// src/content/components/WelcomeModal/WelcomeModal.tsx
import React, { useCallback, useState, useEffect, useRef } from 'react';

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
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger animation when visible becomes true
  useEffect(() => {
    if (visible && !isClosing && containerRef.current) {
      // Force reflow to ensure animation triggers
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.offsetHeight; // Force reflow
        }
      });
    }
  }, [visible, isClosing]);

  const handleOk = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onOk?.();
      setIsClosing(false);
    }, 300); // Match animation duration
  }, [onOk]);

  const handleDontShowAgain = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onDontShowAgain?.();
      setIsClosing(false);
    }, 300); // Match animation duration
  }, [onDontShowAgain]);

  // Get the brand image URL using chrome.runtime.getURL
  const brandImageUrl = chrome.runtime.getURL('src/assets/photos/brand-name.png');

  if (!visible && !isClosing) return null;

  return (
    <div 
      ref={containerRef}
      className={`welcomeModalContainer ${isClosing ? 'closing' : ''} ${visible ? 'visible' : ''}`}
    >
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

