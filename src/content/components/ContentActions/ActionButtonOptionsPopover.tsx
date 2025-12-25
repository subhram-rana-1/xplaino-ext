// src/content/components/ContentActions/ActionButtonOptionsPopover.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { Languages, Replace, ArrowLeftRight } from 'lucide-react';
import { useEmergeAnimation } from '../../../hooks';

export interface ActionButtonOptionsPopoverProps {
  /** Whether the popover is visible */
  visible: boolean;
  /** Whether the current selection is a word (shows more options) */
  isWordSelection: boolean;
  /** Callback when Translate is clicked */
  onTranslate?: () => void;
  /** Callback when Synonym is clicked */
  onSynonym?: () => void;
  /** Callback when Opposite is clicked */
  onOpposite?: () => void;
  /** Callback when mouse enters (to keep container active) */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves (to hide container) */
  onMouseLeave?: (e: React.MouseEvent) => void;
  /** Callback to hide the action button group */
  onHideButtonGroup?: () => void;
}

export const ActionButtonOptionsPopover: React.FC<ActionButtonOptionsPopoverProps> = ({
  visible,
  isWordSelection,
  onTranslate,
  onSynonym,
  onOpposite,
  onMouseEnter,
  onMouseLeave,
  onHideButtonGroup,
}) => {
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
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Slight overshoot for playful feel
    transformOrigin: 'top center', // Animate from top-center (near the button above)
  });

  // Find the source button from DOM (parent button element)
  useEffect(() => {
    const popoverElement = elementRef.current;
    if (popoverElement) {
      // Find the closest button sibling or ancestor
      const wrapper = popoverElement.parentElement;
      const button = wrapper?.querySelector('button.contentActionButton');
      if (button) {
        (sourceRef as React.MutableRefObject<HTMLElement | null>).current = button as HTMLElement;
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

  const handleTranslateClick = useCallback(() => {
    console.log('[ActionButtonOptionsPopover] Translate clicked');
    onTranslate?.();
    onHideButtonGroup?.();
  }, [onTranslate, onHideButtonGroup]);

  const handleSynonymClick = useCallback(() => {
    console.log('[ActionButtonOptionsPopover] Synonym clicked');
    onSynonym?.();
    onHideButtonGroup?.();
  }, [onSynonym, onHideButtonGroup]);

  const handleOppositeClick = useCallback(() => {
    console.log('[ActionButtonOptionsPopover] Opposite clicked');
    onOpposite?.();
    onHideButtonGroup?.();
  }, [onOpposite, onHideButtonGroup]);

  // Don't render if animation is complete and not visible
  if (!shouldRender && !visible) return null;

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`actionButtonOptionsPopover ${animationState === 'shrinking' ? 'closing' : ''}`}
      style={animationStyle}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Translate - always visible */}
      <button
        className="actionButtonOption"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          handleTranslateClick();
        }}
      >
        <Languages size={14} strokeWidth={2.5} />
        <span>Translate</span>
      </button>
      
      {/* Synonym - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleSynonymClick();
          }}
        >
          <Replace size={14} strokeWidth={2.5} />
          <span>Synonym</span>
        </button>
      )}
      
      {/* Opposite - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleOppositeClick();
          }}
        >
          <ArrowLeftRight size={14} strokeWidth={2.5} />
          <span>Opposite</span>
        </button>
      )}
    </div>
  );
};

ActionButtonOptionsPopover.displayName = 'ActionButtonOptionsPopover';

