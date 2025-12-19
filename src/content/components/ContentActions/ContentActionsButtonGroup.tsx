// src/content/components/ContentActions/ContentActionsButtonGroup.tsx
import React, { useState, useCallback } from 'react';
import { ContentActionButton } from './ContentActionButton';
import { DisablePopover } from './DisablePopover';

export interface ContentActionsButtonGroupProps {
  /** Whether the button group is visible */
  visible: boolean;
  /** Whether the current selection is a word (shows Grammar button) */
  isWordSelection: boolean;
  /** Callback when Explain is clicked */
  onExplain: () => void;
  /** Callback when Grammar is clicked */
  onGrammar: () => void;
  /** Callback when Translate is clicked */
  onTranslate: () => void;
  /** Callback when Bookmark is clicked */
  onBookmark: () => void;
  /** Callback when mouse enters (to keep container active) */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves (to hide container) */
  onMouseLeave?: (e: React.MouseEvent) => void;
  /** Callback to force keep states active (e.g., when popover opens) */
  onKeepActive?: () => void;
  /** Callback to show disable notification modal */
  onShowModal?: () => void;
}

export const ContentActionsButtonGroup: React.FC<ContentActionsButtonGroupProps> = ({
  visible,
  isWordSelection,
  onExplain,
  onGrammar,
  onTranslate,
  onBookmark,
  onMouseEnter,
  onMouseLeave,
  onKeepActive,
  onShowModal,
}) => {
  const [showDisablePopover, setShowDisablePopover] = useState(false);

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

  return (
    <div
      className={`contentActionsButtonGroup ${visible ? 'visible' : ''}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <ContentActionButton
        icon="explain"
        tooltip="Explain"
        onClick={onExplain}
        delay={0}
      />
      {isWordSelection && (
        <ContentActionButton
          icon="grammar"
          tooltip="Grammar"
          onClick={onGrammar}
          delay={1}
        />
      )}
      <ContentActionButton
        icon="translate"
        tooltip="Translate"
        onClick={onTranslate}
        delay={isWordSelection ? 2 : 1}
      />
      <ContentActionButton
        icon="bookmark"
        tooltip="Bookmark"
        onClick={onBookmark}
        delay={isWordSelection ? 3 : 2}
      />
      {/* Power button with disable popover */}
      <div className="powerButtonWrapper">
        <ContentActionButton
          icon="power"
          tooltip="Disable extension"
          onClick={handleDisableExtensionButtonClick}
          delay={isWordSelection ? 4 : 3}
          className="powerButton"
          hideTooltip={showDisablePopover}
        >
          <DisablePopover
            visible={showDisablePopover}
            onDisabled={handleDisabled}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onShowModal={onShowModal}
          />
        </ContentActionButton>
      </div>
    </div>
  );
};

ContentActionsButtonGroup.displayName = 'ContentActionsButtonGroup';

