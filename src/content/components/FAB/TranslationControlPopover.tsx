// src/content/components/FAB/TranslationControlPopover.tsx
// Popover component for translation controls (toggle view and clear)

import React, { useRef, useEffect } from 'react';
import styles from './TranslationControlPopover.module.css';
import { OnHoverMessage } from '../OnHoverMessage';
import { useEmergeAnimation } from '../../../hooks';

export interface TranslationControlPopoverProps {
  viewMode: 'original' | 'translated';
  onToggleView: (mode: 'original' | 'translated') => void;
  onClear: () => void;
  visible: boolean;
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
  /** Callback when mouse leaves (to hide popover) */
  onMouseLeave?: () => void;
}

export const TranslationControlPopover: React.FC<TranslationControlPopoverProps> = ({
  viewMode,
  onToggleView,
  onClear,
  visible,
  useShadowDom = false,
  onMouseLeave,
}) => {
  const toggleRef = useRef<HTMLDivElement>(null);
  const clearRef = useRef<HTMLDivElement>(null);
  const wasVisible = useRef(false);

  // Animation hook
  const {
    elementRef,
    sourceRef,
    emerge,
    shrink,
    shouldRender,
    style: animationStyle,
    animationState,
  } = useEmergeAnimation({
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'center right', // Animate from the right (near the button)
  });

  // Find the source button from DOM
  useEffect(() => {
    const popoverElement = elementRef.current;
    if (popoverElement) {
      // Structure: wrapper div (position: relative) > [button, outer wrapper > inner animated div (elementRef)]
      // Go up two levels (inner animated div -> outer wrapper -> position: relative wrapper)
      const outerWrapper = popoverElement.parentElement; // The outer wrapper with positioning
      const positionWrapper = outerWrapper?.parentElement; // The wrapper with position: relative
      
      // Find the button sibling in the position wrapper
      const button = positionWrapper?.querySelector('button.actionButton') || positionWrapper?.querySelector('button');
      
      if (button) {
        (sourceRef as React.MutableRefObject<HTMLElement | null>).current = button as HTMLElement;
        console.log('[TranslationControlPopover] Found source button:', button);
      } else {
        console.warn('[TranslationControlPopover] Could not find source button');
      }
    }
  }, [elementRef, sourceRef, shouldRender]);

  // Handle visibility changes with animation
  useEffect(() => {
    if (visible && !wasVisible.current) {
      // Opening
      wasVisible.current = true;
      emerge();
    } else if (!visible && wasVisible.current) {
      // Closing
      wasVisible.current = false;
      shrink();
    }
  }, [visible, emerge, shrink]);

  // Don't render if animation is complete and not visible
  if (!shouldRender && !visible) return null;

  const handleToggleClick = () => {
    const newMode = viewMode === 'original' ? 'translated' : 'original';
    onToggleView(newMode);
  };

  const handleClearClick = () => {
    onClear();
  };

  // Get class names based on context
  const getClassName = (shadowClass: string, moduleClass: string) => {
    return useShadowDom ? shadowClass : moduleClass;
  };

  const popoverClass = getClassName('translationControlPopover', styles.popover);
  const toggleContainerClass = getClassName(
    'translationControlPopoverToggleContainer',
    styles.toggleContainer
  );
  const toggleLabelClass = getClassName(
    'translationControlPopoverToggleLabel',
    styles.toggleLabel
  );
  const toggleSwitchClass = getClassName(
    `translationControlPopoverToggleSwitch ${viewMode === 'translated' ? 'active' : ''}`,
    `${styles.toggleSwitch} ${viewMode === 'translated' ? styles.active : ''}`
  );
  const toggleKnobClass = getClassName(
    'translationControlPopoverToggleKnob',
    styles.toggleKnob
  );
  const clearButtonClass = getClassName(
    'translationControlPopoverClearButton',
    styles.clearButton
  );
  const clearIconClass = getClassName(
    'translationControlPopoverClearIcon',
    styles.clearIcon
  );

  return (
    <div
      style={{
        position: 'absolute',
        right: 'calc(100% + 12px)',
        top: '50%',
        marginTop: '-50px', // Approximate centering (adjust based on content)
        zIndex: 20,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseLeave={onMouseLeave}
    >
      <div 
        ref={elementRef as React.RefObject<HTMLDivElement>}
        className={`${popoverClass} ${animationState === 'shrinking' ? 'closing' : ''}`}
        style={animationStyle}
      >
      {/* Toggle View Control */}
      <div ref={toggleRef} className={toggleContainerClass} onClick={handleToggleClick}>
        <span className={toggleLabelClass}>
          {viewMode === 'translated' ? 'View Original' : 'View Translated'}
        </span>
        <div className={toggleSwitchClass}>
          <div className={toggleKnobClass} />
        </div>
      </div>
      {!useShadowDom && (
        <OnHoverMessage 
          message="Switch between original and translated content"
          targetRef={toggleRef}
          position="left"
        />
      )}

      {/* Clear Button */}
      <div ref={clearRef} className={clearButtonClass} onClick={handleClearClick}>
        <svg 
          className={clearIconClass} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          <path d="M10 11v6M14 11v6" />
        </svg>
        <span>Clear Translations</span>
      </div>
      {!useShadowDom && (
        <OnHoverMessage 
          message="Remove all translations and restore original page"
          targetRef={clearRef}
          position="left"
        />
      )}
      </div>
    </div>
  );
};

