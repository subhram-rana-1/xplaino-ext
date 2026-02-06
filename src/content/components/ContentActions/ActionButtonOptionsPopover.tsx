// src/content/components/ContentActions/ActionButtonOptionsPopover.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { Languages, Replace, ArrowLeftRight, Sparkles, BookOpen, Lightbulb, HelpCircle, AlertTriangle, GraduationCap, MessageSquare, PenLine } from 'lucide-react';
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
  /** Callback when Ask AI is clicked */
  onAskAI?: () => void;
  /** Callback when Etymology is clicked */
  onEtymology?: () => void;
  /** Callback when Mnemonic is clicked */
  onMnemonic?: () => void;
  /** Callback when Quiz is clicked */
  onQuiz?: () => void;
  /** Callback when Common Mistakes is clicked */
  onCommonMistakes?: () => void;
  /** Callback when Better Alternative (formal) is clicked */
  onBetterFormal?: () => void;
  /** Callback when Better Alternative (casual) is clicked */
  onBetterCasual?: () => void;
  /** Callback when Better Alternative (academic) is clicked */
  onBetterAcademic?: () => void;
  /** Callback to hide the action button group */
  onHideButtonGroup?: () => void;
  /** Callback when mouse enters popover (to cancel close timer) */
  onPopoverMouseEnter?: () => void;
  /** Callback when mouse leaves popover (to start close timer) */
  onPopoverMouseLeave?: (e: React.MouseEvent) => void;
}

export const ActionButtonOptionsPopover: React.FC<ActionButtonOptionsPopoverProps> = ({
  visible,
  isWordSelection,
  onTranslate,
  onSynonym,
  onOpposite,
  onAskAI,
  onEtymology,
  onMnemonic,
  onQuiz,
  onCommonMistakes,
  onBetterFormal,
  onBetterCasual,
  onBetterAcademic,
  onHideButtonGroup,
  onPopoverMouseEnter,
  onPopoverMouseLeave,
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

  // Callback ref that sets BOTH element ref AND finds source button synchronously
  const setPopoverRef = useCallback((element: HTMLDivElement | null) => {
    // Set the element ref from the hook
    (elementRef as React.MutableRefObject<HTMLElement | null>).current = element;
    
    if (element) {
      // Set initial transform to scale(0) via inline style
      // This ensures the element is hidden BEFORE the animation starts
      element.style.transform = 'scale(0)';
      element.style.transformOrigin = 'top center';
      
      // Find and set source button IMMEDIATELY when element mounts
      const wrapper = element.closest('.optionsButtonWrapper');
      const button = wrapper?.querySelector('button.contentActionButton');

      if (button) {
        (sourceRef as React.MutableRefObject<HTMLElement | null>).current = button as HTMLElement;
      }
    }
  }, [elementRef, sourceRef]);

  // Handle visibility changes with animation
  useEffect(() => {
    if (visible && !wasVisible.current) {
      // Opening
      wasVisible.current = true;
      // Use double RAF to ensure refs are set before animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          emerge();
        });
      });
    } else if (!visible && wasVisible.current) {
      // Closing
      wasVisible.current = false;
      shrink();
    }
  }, [visible, emerge, shrink]);

  const handleTranslateClick = useCallback(() => {
    onTranslate?.();
    onHideButtonGroup?.();
  }, [onTranslate, onHideButtonGroup]);

  const handleSynonymClick = useCallback(() => {
    onSynonym?.();
    onHideButtonGroup?.();
  }, [onSynonym, onHideButtonGroup]);

  const handleOppositeClick = useCallback(() => {
    onOpposite?.();
    onHideButtonGroup?.();
  }, [onOpposite, onHideButtonGroup]);

  const handleAskAIClick = useCallback(() => {
    onAskAI?.();
    onHideButtonGroup?.();
  }, [onAskAI, onHideButtonGroup]);

  const handleEtymologyClick = useCallback(() => {
    onEtymology?.();
    onHideButtonGroup?.();
  }, [onEtymology, onHideButtonGroup]);

  const handleMnemonicClick = useCallback(() => {
    onMnemonic?.();
    onHideButtonGroup?.();
  }, [onMnemonic, onHideButtonGroup]);

  const handleQuizClick = useCallback(() => {
    onQuiz?.();
    onHideButtonGroup?.();
  }, [onQuiz, onHideButtonGroup]);

  const handleCommonMistakesClick = useCallback(() => {
    onCommonMistakes?.();
    onHideButtonGroup?.();
  }, [onCommonMistakes, onHideButtonGroup]);

  const handleBetterFormalClick = useCallback(() => {
    onBetterFormal?.();
    onHideButtonGroup?.();
  }, [onBetterFormal, onHideButtonGroup]);

  const handleBetterCasualClick = useCallback(() => {
    onBetterCasual?.();
    onHideButtonGroup?.();
  }, [onBetterCasual, onHideButtonGroup]);

  const handleBetterAcademicClick = useCallback(() => {
    onBetterAcademic?.();
    onHideButtonGroup?.();
  }, [onBetterAcademic, onHideButtonGroup]);

  // Don't render if animation is complete and not visible
  if (!shouldRender && !visible) return null;

  return (
    <div
      ref={setPopoverRef}
      className={`actionButtonOptionsPopover ${animationState === 'shrinking' ? 'closing' : ''}`}
      style={animationStyle}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={onPopoverMouseEnter}
      onMouseLeave={onPopoverMouseLeave}
    >
      {/* Ask AI - only for word selection, at the top */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleAskAIClick();
          }}
        >
          <Sparkles size={14} strokeWidth={2.5} />
          <span>Ask AI</span>
        </button>
      )}

      {/* Separator after Ask AI - only for word selection */}
      {isWordSelection && <div className="optionsPopoverSeparator" />}

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

      {/* Etymology - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleEtymologyClick();
          }}
        >
          <BookOpen size={14} strokeWidth={2.5} />
          <span>Etymology</span>
        </button>
      )}

      {/* Separator - Learning aids group */}
      {isWordSelection && <div className="optionsPopoverSeparator" />}

      {/* Mnemonic - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleMnemonicClick();
          }}
        >
          <Lightbulb size={14} strokeWidth={2.5} />
          <span>Memory trick (Mnemonic)</span>
        </button>
      )}

      {/* Quiz - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleQuizClick();
          }}
        >
          <HelpCircle size={14} strokeWidth={2.5} />
          <span>Quiz me on this word</span>
        </button>
      )}

      {/* Common Mistakes - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleCommonMistakesClick();
          }}
        >
          <AlertTriangle size={14} strokeWidth={2.5} />
          <span>Common mistakes</span>
        </button>
      )}

      {/* Separator - Better alternatives group */}
      {isWordSelection && <div className="optionsPopoverSeparator" />}

      {/* Better alternative (formal) - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleBetterFormalClick();
          }}
        >
          <PenLine size={14} strokeWidth={2.5} />
          <span>Better alternative (formal)</span>
        </button>
      )}

      {/* Better alternative (casual) - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleBetterCasualClick();
          }}
        >
          <MessageSquare size={14} strokeWidth={2.5} />
          <span>Better alternative (casual)</span>
        </button>
      )}

      {/* Better alternative (academic) - only for word selection */}
      {isWordSelection && (
        <button
          className="actionButtonOption"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleBetterAcademicClick();
          }}
        >
          <GraduationCap size={14} strokeWidth={2.5} />
          <span>Better alternative (academic)</span>
        </button>
      )}
    </div>
  );
};

ActionButtonOptionsPopover.displayName = 'ActionButtonOptionsPopover';
