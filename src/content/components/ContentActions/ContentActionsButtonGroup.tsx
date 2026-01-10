// src/content/components/ContentActions/ContentActionsButtonGroup.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ContentActionButton } from './ContentActionButton';
import { DisablePopover } from './DisablePopover';
import { ActionButtonOptionsPopover } from './ActionButtonOptionsPopover';

export interface ContentActionsButtonGroupProps {
  /** Whether the button group is visible */
  visible: boolean;
  /** Whether the current selection is a word (shows different options in popover) */
  isWordSelection: boolean;
  /** Callback when Explain is clicked */
  onExplain: () => void;
  /** Callback when Grammar is clicked */
  onGrammar: () => void;
  /** Callback when Translate is clicked */
  onTranslate: () => void;
  /** Callback when Bookmark is clicked */
  onBookmark: () => void;
  /** Callback when Synonym is clicked */
  onSynonym?: () => void;
  /** Callback when Opposite is clicked */
  onOpposite?: () => void;
  /** Callback when mouse enters (to keep container active) */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves (to hide container) */
  onMouseLeave?: (e: React.MouseEvent) => void;
  /** Callback to force keep states active (e.g., when popover opens) */
  onKeepActive?: () => void;
  /** Callback to show disable notification modal */
  onShowModal?: () => void;
  /** Callback when action is complete (clear selection) */
  onActionComplete?: () => void;
}

export const ContentActionsButtonGroup: React.FC<ContentActionsButtonGroupProps> = ({
  visible,
  isWordSelection,
  onExplain,
  onGrammar: _onGrammar, // Keep for backward compatibility but don't use
  onTranslate,
  onBookmark,
  onSynonym,
  onOpposite,
  onMouseEnter,
  onMouseLeave,
  onKeepActive,
  onShowModal,
  onActionComplete,
}) => {
  const [showDisablePopover, setShowDisablePopover] = useState(false);
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [showDisableButton, setShowDisableButton] = useState(false);
  const [isDisableButtonHiding, setIsDisableButtonHiding] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonGroupRef = useRef<HTMLDivElement>(null);
  const buttonDelaysRef = useRef<Map<HTMLElement, number>>(new Map());

  const handleDisableExtensionButtonClick = useCallback(() => {
    setShowDisablePopover((prev) => {
      const newValue = !prev;
      if (newValue) {
        // Popover is opening - ensure states stay active
        onKeepActive?.();
      }
      return newValue;
    });
  }, [onKeepActive]);

  const handleDisabled = useCallback(() => {
    setShowDisablePopover(false);
  }, []);

  const hideOptionsAndDisableButton = useCallback(() => {
    // First hide the popover
    setShowOptionsPopover(false);
    // Close the disable popover if it's open
    setShowDisablePopover(false);
    // Then start the slide-out animation for disable button
    setIsDisableButtonHiding(true);
    // Wait for slide-out animation to complete before actually hiding
    setTimeout(() => {
      setShowDisableButton(false);
      setIsDisableButtonHiding(false);
    }, 200); // Match animation duration
  }, []);

  const handleOptionsButtonMouseEnter = useCallback(() => {
    // Cancel any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Show popover immediately
    setShowOptionsPopover(true);
    setIsDisableButtonHiding(false);
    // Delay power button appearance until after width animation completes (0.4s)
    setTimeout(() => {
      setShowDisableButton(true);
    }, 400);
    onKeepActive?.();
  }, [onKeepActive]);

  const handleOptionsButtonMouseLeave = useCallback(() => {
    // Start timeout before hiding both popover and disable button
    hideTimeoutRef.current = setTimeout(() => {
      hideOptionsAndDisableButton();
    }, 250); // Increased delay for smoother UX
  }, [hideOptionsAndDisableButton]);

  const handleOptionsPopoverMouseEnter = useCallback(() => {
    // Cancel hide timeout when entering popover
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Make sure popover stays visible
    setShowOptionsPopover(true);
    onMouseEnter?.();
  }, [onMouseEnter]);

  const handleOptionsPopoverMouseLeave = useCallback((e: React.MouseEvent) => {
    // Start timeout when leaving popover (in case moving to disable button)
    hideTimeoutRef.current = setTimeout(() => {
      hideOptionsAndDisableButton();
    }, 250);
    onMouseLeave?.(e);
  }, [hideOptionsAndDisableButton, onMouseLeave]);

  const handleDisableButtonMouseEnter = useCallback(() => {
    // Cancel hide timeout when entering disable button
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Close the options popover when moving to disable button
    setShowOptionsPopover(false);
    onMouseEnter?.();
  }, [onMouseEnter]);

  const handleDisableButtonMouseLeave = useCallback((e: React.MouseEvent) => {
    // Hide both when leaving disable button
    hideOptionsAndDisableButton();
    onMouseLeave?.(e);
  }, [hideOptionsAndDisableButton, onMouseLeave]);

  const handleHideButtonGroup = useCallback(() => {
    // Clear any pending timeouts
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Hide everything when an option is clicked
    setShowOptionsPopover(false);
    setShowDisableButton(false);
    setIsDisableButtonHiding(false);
    // Trigger action complete to clear selection
    onActionComplete?.();
  }, [onActionComplete]);

  // Measure actual content width and set it dynamically for smooth expansion animation
  // Also calculate button delays based on their positions
  useEffect(() => {
    if (!buttonGroupRef.current) {
      return;
    }

    const element = buttonGroupRef.current;
    
    if (!visible) {
      // Reset CSS variable when hidden
      element.style.setProperty('--button-group-width', '0px');
      buttonDelaysRef.current.clear();
      return;
    }

    // Wait a frame to ensure visibility: visible is applied
    const rafId1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Get current width if it exists (for power button expansion)
        const currentWidthValue = element.style.getPropertyValue('--button-group-width');
        const currentWidth = currentWidthValue ? parseFloat(currentWidthValue) : 0;
        
        // Temporarily remove constraints to measure natural width
        const savedMaxWidth = element.style.maxWidth;
        element.style.maxWidth = 'none';
        element.style.width = 'auto';
        element.style.setProperty('--button-group-width', 'auto');
        
        // Force layout recalculation
        void element.offsetWidth;
        
        // Measure the natural width
        const naturalWidth = element.scrollWidth;
        
        // Calculate button delays based on their positions
        // Width expands over 400ms, buttons should appear when the expanding right edge reaches their position
        const buttons = Array.from(element.querySelectorAll<HTMLElement>('.contentActionButton'));
        const widthExpansionDuration = 400; // ms - time for button group to fully expand
        
        // Restore max-width first
        element.style.maxWidth = savedMaxWidth || '500px';
        element.style.width = ''; // Clear inline width, use CSS variable
        
        // If this is the initial appearance (currentWidth is 0), start from 0
        // If power button is appearing (currentWidth > 0), start from current width
        if (currentWidth === 0) {
          // Initial appearance - animate from 0
          element.style.setProperty('--button-group-width', '0px');
          // Force layout to ensure 0px is applied
          void element.offsetWidth;
        }
        
        // Use multiple RAFs to ensure buttons are positioned after width is set
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Now measure buttons with their actual positions
            const buttonsArray = Array.from(buttons);
            
            // Sort buttons by their left position to get serial order (left to right)
            const buttonsWithPositions = buttonsArray.map((button) => {
              const buttonRect = button.getBoundingClientRect();
              const containerRect = element.getBoundingClientRect();
              const buttonLeft = buttonRect.left - containerRect.left;
              const buttonRight = buttonLeft + buttonRect.width;
              return { button, buttonLeft, buttonRight };
            }).sort((a, b) => a.buttonLeft - b.buttonLeft); // Sort by left position (serial order)
            
            // Calculate delay for each button based on when expanding width reaches its position
            // Each button appears when the expanding right edge reaches its right edge
            buttonsWithPositions.forEach(({ button, buttonRight }) => {
              // Calculate when the expanding right edge reaches this button's right edge
              // delay = (buttonRight / naturalWidth) * widthExpansionDuration
              const delay = Math.max(0, Math.min((buttonRight / naturalWidth) * widthExpansionDuration, widthExpansionDuration));
              buttonDelaysRef.current.set(button, delay);
              
              // Ensure button is visible and ready for animation
              button.style.opacity = '0';
              button.style.transform = 'scale(0)';
              
              // Set the delay on the button element - button will scale from 0 to 1 at this time
              button.style.animationDelay = `${delay}ms`;
              button.style.animationName = 'buttonScaleIn';
              button.style.animationDuration = '0.25s';
              button.style.animationFillMode = 'forwards';
              button.style.animationTimingFunction = 'cubic-bezier(0.4, 0, 0.2, 1)';
              
              // Also set delay on SVG icon inside the button
              const svg = button.querySelector('svg');
              if (svg) {
                svg.style.opacity = '0';
                svg.style.transform = 'scale(0)';
                svg.style.animationDelay = `${delay}ms`;
                svg.style.animationName = 'iconScaleIn';
                svg.style.animationDuration = '0.25s';
                svg.style.animationFillMode = 'forwards';
                svg.style.animationTimingFunction = 'cubic-bezier(0.4, 0, 0.2, 1)';
              }
            });
            
            // Now trigger the width animation
            if (currentWidth === 0) {
              // Then animate to final width
              element.style.setProperty('--button-group-width', `${naturalWidth}px`);
            } else {
              // Power button appearing - animate from current width to new width
              element.style.setProperty('--button-group-width', `${naturalWidth}px`);
            }
          });
        });
      });
    });

    return () => {
      cancelAnimationFrame(rafId1);
    };
  }, [visible, showDisableButton, isDisableButtonHiding]);

  return (
    <div
      ref={buttonGroupRef}
      className={`contentActionsButtonGroup ${visible ? 'visible' : ''} ${!isWordSelection ? 'hasBookmark' : ''} ${showDisableButton ? 'hasPowerButton' : ''}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Explain button */}
      <ContentActionButton
        icon="explain"
        tooltip="Explain"
        onClick={onExplain}
        delay={0}
      />
      
      {/* Bookmark button - only show for text selections, hide for word selections */}
      {!isWordSelection && (
        <ContentActionButton
          icon="bookmark"
          tooltip="Bookmark"
          onClick={() => {
            onBookmark();
            handleHideButtonGroup();
          }}
          delay={1}
        />
      )}
      
      {/* Options button (3 dots) with options popover */}
      <div className="optionsButtonWrapper">
        <ContentActionButton
          icon="options"
          tooltip="Options"
          onClick={() => {}} // No-op, hover shows the popover
          delay={2}
          className="optionsButton"
          hideTooltip={showOptionsPopover}
          onButtonMouseEnter={handleOptionsButtonMouseEnter}
          onButtonMouseLeave={handleOptionsButtonMouseLeave}
        >
          <ActionButtonOptionsPopover
            visible={showOptionsPopover}
            isWordSelection={isWordSelection}
            onTranslate={onTranslate}
            onSynonym={onSynonym}
            onOpposite={onOpposite}
            onMouseEnter={handleOptionsPopoverMouseEnter}
            onMouseLeave={handleOptionsPopoverMouseLeave}
            onHideButtonGroup={handleHideButtonGroup}
          />
        </ContentActionButton>
      </div>
      
      {/* Power button with disable popover - conditionally visible */}
      {showDisableButton && (
        <div 
          className="powerButtonWrapper"
          onMouseEnter={handleDisableButtonMouseEnter}
          onMouseLeave={handleDisableButtonMouseLeave}
        >
          <ContentActionButton
            icon="power"
            tooltip="Disable extension"
            onClick={handleDisableExtensionButtonClick}
            delay={0} // No delay for dynamic appearance
            className={`powerButton ${isDisableButtonHiding ? 'disableButtonSlideOut' : 'disableButtonSlideIn'}`}
            hideTooltip={showDisablePopover}
          >
            <DisablePopover
              visible={showDisablePopover}
              onDisabled={handleDisabled}
              onMouseEnter={handleDisableButtonMouseEnter}
              onMouseLeave={handleDisableButtonMouseLeave}
              onShowModal={onShowModal}
            />
          </ContentActionButton>
        </div>
      )}
    </div>
  );
};

ContentActionsButtonGroup.displayName = 'ContentActionsButtonGroup';

