// src/content/components/ContentActions/ContentActionsTrigger.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ContentActionsButtonGroup } from './ContentActionsButtonGroup';

export interface ContentActionsTriggerProps {
  /** Whether component is rendered in Shadow DOM */
  useShadowDom?: boolean;
  /** Callback when Explain is clicked */
  onExplain?: (selectedText: string) => void;
  /** Callback when Grammar is clicked */
  onGrammar?: (selectedText: string) => void;
  /** Callback when Translate is clicked */
  onTranslate?: (selectedText: string) => void;
  /** Callback when Bookmark is clicked */
  onBookmark?: (selectedText: string) => void;
  /** Callback to show disable notification modal */
  onShowModal?: () => void;
}

interface SelectionState {
  text: string;
  isWord: boolean;
  position: { x: number; y: number };
}

/**
 * Get the icon URL for the xplaino icon
 */
function getIconUrl(): string {
  return chrome.runtime.getURL('src/assets/icons/xplaino-purple-icon.ico');
}

export const ContentActionsTrigger: React.FC<ContentActionsTriggerProps> = ({
  // useShadowDom is used to determine if we're in Shadow DOM context (always true for content scripts)
  useShadowDom: _useShadowDom = false,
  onExplain,
  onGrammar,
  onTranslate,
  onBookmark,
  onShowModal,
}) => {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [showButtonGroup, setShowButtonGroup] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const popoverOpenRef = useRef(false);

  // Track mouse position for text selection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Check if selection is a single word
  const isWordSelection = useCallback((text: string): boolean => {
    const trimmed = text.trim();
    // A word has no spaces and is a reasonable length
    return trimmed.length > 0 && !trimmed.includes(' ') && trimmed.length <= 50;
  }, []);

  // Get position for the icon button based on selection type
  const getSelectionPosition = useCallback((isDoubleClick: boolean): { x: number; y: number } | null => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.rangeCount === 0) return null;

    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) return null;

    if (isDoubleClick) {
      // For word double-click: position above the word (not overlapping)
      // Position slightly to the right of center, above the word
      return {
        x: rect.left + rect.width / 2 + 15, // 15px to the right of center
        y: rect.top - 8, // Position above the word with 8px gap
      };
    } else {
      // For text selection: position lower-right of mouse release point
      return {
        x: lastMousePosition.current.x + 12, // 12px to the right
        y: lastMousePosition.current.y + 8,  // 8px below mouse
      };
    }
  }, []);

  // Handle double-click (word selection)
  const handleDoubleClick = useCallback((e: MouseEvent) => {
    // Ignore if clicking on our own component
    if (containerRef.current?.contains(e.target as Node)) return;

    const windowSelection = window.getSelection();
    if (!windowSelection) return;

    const text = windowSelection.toString().trim();
    if (!text) return;

    const position = getSelectionPosition(true);
    if (!position) return;

    setSelection({
      text,
      isWord: true, // Double-click always selects a word
      position,
    });
    setIsHovering(false);
    setShowButtonGroup(false);
  }, [getSelectionPosition]);

  // Handle mouse up (text selection)
  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Ignore if clicking on our own component - check both target and relatedTarget
    const target = e.target as Node;
    if (containerRef.current?.contains(target)) {
      return;
    }
    
    // Also check if the click originated from within our component
    // by checking if the event path includes our container
    const path = e.composedPath?.() || [];
    if (path.some(node => node === containerRef.current || 
        (node instanceof Node && containerRef.current?.contains(node)))) {
      return;
    }

    // Small delay to let selection complete
    setTimeout(() => {
      // Double-check that we're not inside our container (in case selection changed)
      const currentTarget = document.activeElement;
      if (containerRef.current?.contains(currentTarget as Node)) {
        return;
      }

      const windowSelection = window.getSelection();
      if (!windowSelection) return;

      const text = windowSelection.toString().trim();
      if (!text || text.length < 2) return;

      // If it's a double-click, the dblclick handler will take care of it
      // This is for drag selection only
      const position = getSelectionPosition(false);
      if (!position) return;

      // Check if this is the same selection we already have
      if (selection && selection.text === text) {
        // Same selection - don't reset UI state
        return;
      }

      setSelection({
        text,
        isWord: isWordSelection(text),
        position,
      });
      // Only reset UI state if this is a NEW selection (not clicking on existing UI)
      setIsHovering(false);
      setShowButtonGroup(false);
    }, 10);
  }, [getSelectionPosition, isWordSelection, selection]);

  // Handle selection change (to hide component when selection is cleared)
  const handleSelectionChange = useCallback(() => {
    // Small delay to avoid race conditions with other handlers
    setTimeout(() => {
      const windowSelection = window.getSelection();
      if (!windowSelection) {
        // No selection object - clear our state
        if (selection) {
          setSelection(null);
        }
        return;
      }

      const text = windowSelection.toString().trim();
      
      // If selection is empty and we have a selection state, clear it
      if (!text && selection) {
        setSelection(null);
      }
    }, 10);
  }, [selection]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('dblclick', handleDoubleClick);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleDoubleClick, handleMouseUp, handleSelectionChange]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse enter on icon button
  const handleIconMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setIsHovering(true);
    // Small delay before showing button group for smoother transition
    setTimeout(() => {
      setShowButtonGroup(true);
    }, 50);
  }, []);

  // Handle mouse leave from container
  const handleContainerMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as HTMLElement;
    
    // Check if we're leaving from the button group specifically
    // Check both currentTarget and the actual target that triggered the event
    const target = (e.target as HTMLElement) || currentTarget;
    const isLeavingButtonGroup = 
      target.classList?.contains('contentActionsButtonGroup') ||
      target.closest?.('.contentActionsButtonGroup') ||
      currentTarget.classList?.contains('contentActionsButtonGroup') ||
      currentTarget.closest?.('.contentActionsButtonGroup');
    
    // Check if we're leaving from the popover
    const isLeavingPopover = 
      target.classList?.contains('disablePopover') ||
      target.closest?.('.disablePopover') ||
      currentTarget.classList?.contains('disablePopover') ||
      currentTarget.closest?.('.disablePopover');
    
    // Check if moving to popover
    const isMovingToPopover = relatedTarget && containerRef.current && (
      (relatedTarget as HTMLElement).classList?.contains('disablePopover') ||
      (relatedTarget as HTMLElement).closest?.('.disablePopover') ||
      containerRef.current.querySelector('.disablePopover')?.contains(relatedTarget)
    );
    
    // Special case: leaving popover and moving to button group - don't hide
    if (isLeavingPopover && !isMovingToPopover) {
      // Only return early if moving to button group, otherwise continue to hide logic
      const isMovingToButtonGroup = relatedTarget && containerRef.current && (
        (relatedTarget as HTMLElement).classList?.contains('contentActionsButtonGroup') ||
        (relatedTarget as HTMLElement).closest?.('.contentActionsButtonGroup') ||
        containerRef.current.querySelector('.contentActionsButtonGroup')?.contains(relatedTarget)
      );
      if (isMovingToButtonGroup) {
        return;
      }
    }
    
    // Special case: leaving button group and moving to popover - don't hide
    if (isLeavingButtonGroup && isMovingToPopover) {
      return;
    }
    
    // If leaving button group (and not moving to popover) - hide
    if (isLeavingButtonGroup) {
      const delay = popoverOpenRef.current ? 300 : 200;
      hideTimeoutRef.current = setTimeout(() => {
        setShowButtonGroup(false);
        setIsHovering(false); // This will show the icon
        popoverOpenRef.current = false;
      }, delay);
      return;
    }
    
    // If leaving container entirely
    if (!relatedTarget || !containerRef.current?.contains(relatedTarget)) {
      const delay = popoverOpenRef.current ? 300 : 200;
      hideTimeoutRef.current = setTimeout(() => {
        setShowButtonGroup(false);
        setIsHovering(false);
        popoverOpenRef.current = false;
      }, delay);
    }
  }, []);

  // Handle mouse enter on container (to cancel hide timeout)
  const handleContainerMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Ensure states are correct when mouse enters
    setIsHovering(true);
    setShowButtonGroup(true);
  }, []);

  // Handle keep active (for when popover opens)
  const handleKeepActive = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    popoverOpenRef.current = true; // Mark popover as open
    setIsHovering(true);
    setShowButtonGroup(true);
  }, []);

  // Action handlers
  const handleExplain = useCallback(() => {
    if (selection) {
      console.log('[ContentActions] Explain:', selection.text);
      onExplain?.(selection.text);
    }
  }, [selection, onExplain]);

  const handleGrammar = useCallback(() => {
    if (selection) {
      console.log('[ContentActions] Grammar:', selection.text);
      onGrammar?.(selection.text);
    }
  }, [selection, onGrammar]);

  const handleTranslate = useCallback(() => {
    if (selection) {
      console.log('[ContentActions] Translate:', selection.text);
      onTranslate?.(selection.text);
    }
  }, [selection, onTranslate]);

  const handleBookmark = useCallback(() => {
    if (selection) {
      console.log('[ContentActions] Bookmark:', selection.text);
      onBookmark?.(selection.text);
    }
  }, [selection, onBookmark]);

  // Don't render if no selection
  if (!selection) return null;

  const iconUrl = getIconUrl();

  // Calculate position styles based on selection type
  const positionStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${selection.position.x}px`,
    top: `${selection.position.y}px`,
    // For word: center horizontally and position above (translate up by 100%)
    // For text: position at the point (lower-right of mouse)
    transform: selection.isWord ? 'translate(-50%, -100%)' : 'translate(0, 0)',
    zIndex: 2147483647,
  };

  return (
    <div
      ref={containerRef}
      className="contentActionsContainer"
      style={positionStyle}
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      {/* Xplaino Icon Button */}
      <button
        className={`xplainoIconButton ${isHovering ? 'hidden' : 'visible'}`}
        onMouseEnter={handleIconMouseEnter}
        aria-label="Xplaino Actions"
      >
        <img
          src={iconUrl}
          alt="Xplaino"
          className="xplainoIcon"
        />
      </button>

      {/* Content Actions Button Group */}
      <ContentActionsButtonGroup
        visible={showButtonGroup}
        isWordSelection={selection.isWord}
        onExplain={handleExplain}
        onGrammar={handleGrammar}
        onTranslate={handleTranslate}
        onBookmark={handleBookmark}
        onMouseEnter={handleContainerMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
        onKeepActive={handleKeepActive}
        onShowModal={onShowModal}
      />
    </div>
  );
};

ContentActionsTrigger.displayName = 'ContentActionsTrigger';

