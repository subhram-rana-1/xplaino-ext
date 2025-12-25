// src/content/components/ContentActions/ContentActionsButtonGroup.tsx
import React, { useState, useCallback, useRef } from 'react';
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
    // Show both popover and disable button
    setShowOptionsPopover(true);
    setShowDisableButton(true);
    setIsDisableButtonHiding(false);
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

  return (
    <div
      className={`contentActionsButtonGroup ${visible ? 'visible' : ''}`}
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

