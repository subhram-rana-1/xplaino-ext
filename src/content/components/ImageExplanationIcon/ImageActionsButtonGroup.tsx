// src/content/components/ImageExplanationIcon/ImageActionsButtonGroup.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, MoreVertical, Bookmark, MessageSquare, BookMarked, Plus, ExternalLink,
  Eye, FileText, ListOrdered, AlignLeft, Tag,
} from 'lucide-react';
import { CustomPromptService } from '@/api-services/CustomPromptService';
import type { CustomPromptResponse } from '@/api-services/dto/CustomPromptDTO';
import { ENV } from '@/config/env';
import { OnHoverMessage } from '../OnHoverMessage';

export interface ImageActionsButtonGroupProps {
  /** Whether the button group is visible */
  visible: boolean;
  /** Whether the image is already bookmarked */
  isBookmarked: boolean;
  /** Called when the Simplify button is clicked */
  onSimplify: () => void;
  /** Called when the Bookmark button is clicked (handles both save and delete) */
  onBookmarkOpen: () => void;
  /** Called when "Ask AI" is selected from the 3-dot menu */
  onAskAI?: () => void;
  /** Called when a custom prompt is clicked: (displayText, apiContent) */
  onPromptClick?: (displayText: string, apiContent: string) => void;
  /** Mouse enter handler (to keep the parent icon active) */
  onMouseEnter?: () => void;
  /** Mouse leave handler */
  onMouseLeave?: (e: React.MouseEvent) => void;
}

// Width for 3 buttons × ~38px + padding
const BUTTON_GROUP_WIDTH = 120;

const DEFAULT_IMAGE_PROMPTS = [
  { label: 'Describe this image',     icon: Eye,         prompt: 'Describe what you see in this image in detail.' },
  { label: 'Summarize this image',    icon: FileText,    prompt: 'Summarize the main message or content of this image.' },
  { label: 'Extract key information', icon: ListOrdered, prompt: 'What are the key pieces of information, data, or facts shown in this image?' },
  { label: 'Explain text in image',   icon: AlignLeft,   prompt: 'Identify and explain any text, labels, or annotations visible in this image.' },
  { label: 'What is the main topic?', icon: Tag,         prompt: 'What is the main topic or subject matter of this image?' },
];

export const ImageActionsButtonGroup: React.FC<ImageActionsButtonGroupProps> = ({
  visible,
  isBookmarked,
  onSimplify,
  onBookmarkOpen,
  onAskAI,
  onPromptClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPromptResponse[]>([]);
  const buttonGroupRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs and mount-tracking for tooltip targets
  const simplifyBtnRef = useRef<HTMLButtonElement>(null);
  const [simplifyMounted, setSimplifyMounted] = useState(false);
  const optionsBtnRef = useRef<HTMLButtonElement>(null);
  const [optionsMounted, setOptionsMounted] = useState(false);
  const bookmarkBtnRef = useRef<HTMLButtonElement>(null);
  const [bookmarkMounted, setBookmarkMounted] = useState(false);

  useEffect(() => {
    if (simplifyBtnRef.current) {
      const t = setTimeout(() => setSimplifyMounted(true), 10);
      return () => clearTimeout(t);
    }
    setSimplifyMounted(false);
  }, []);

  useEffect(() => {
    if (optionsBtnRef.current) {
      const t = setTimeout(() => setOptionsMounted(true), 10);
      return () => clearTimeout(t);
    }
    setOptionsMounted(false);
  }, []);

  useEffect(() => {
    if (bookmarkBtnRef.current) {
      const t = setTimeout(() => setBookmarkMounted(true), 10);
      return () => clearTimeout(t);
    }
    setBookmarkMounted(false);
  }, []);

  // Fetch custom prompts once on mount
  useEffect(() => {
    CustomPromptService.listCustomPrompts()
      .then((res) => setCustomPrompts(res.prompts.filter((p) => !p.isHidden)))
      .catch(() => { /* user may not be logged in */ });
  }, []);

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  // Drive the width animation via CSS variable
  useEffect(() => {
    const el = buttonGroupRef.current;
    if (!el) return;
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    if (visible) {
      setAnimationComplete(false);
      el.style.setProperty('--button-group-width', '0px');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.setProperty('--button-group-width', `${BUTTON_GROUP_WIDTH}px`);
          // Match the 400ms CSS transition + small buffer before allowing overflow
          animationTimeoutRef.current = setTimeout(() => setAnimationComplete(true), 500);
        });
      });
    } else {
      el.style.setProperty('--button-group-width', '0px');
      setAnimationComplete(false);
      setShowOptionsPopover(false);
    }
  }, [visible]);

  const handleOptionsMouseEnter = useCallback(() => {
    setShowOptionsPopover(true);
    onMouseEnter?.();
  }, [onMouseEnter]);

  const handleOptionsMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget;
    const wrapper = e.currentTarget as HTMLElement;
    if (relatedTarget instanceof Node && wrapper.contains(relatedTarget)) return;
    setShowOptionsPopover(false);
  }, []);

  const handlePopoverMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget;
    const popover = e.currentTarget as HTMLElement;
    const wrapper = popover.closest('.optionsButtonWrapper');
    if (relatedTarget instanceof Node && wrapper && wrapper.contains(relatedTarget)) return;
    setShowOptionsPopover(false);
  }, []);

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent ?? tmp.innerText ?? '').replace(/\s+/g, ' ').trim();
  };

  return (
    <div
      ref={buttonGroupRef}
      className={`contentActionsButtonGroup imageActionsButtonGroup ${visible ? 'visible' : ''} ${animationComplete ? 'animationComplete' : ''}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Simplify / Explain button */}
      <div className="contentActionButtonWrapper">
        <button
          ref={simplifyBtnRef}
          className="contentActionButton"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSimplify();
          }}
          aria-label="Simplify image"
        >
          <Sparkles size={18} strokeWidth={2.5} />
        </button>
        {simplifyMounted && simplifyBtnRef.current && (
          <OnHoverMessage
            message="Simplify"
            targetRef={simplifyBtnRef}
            position="bottom"
            offset={8}
          />
        )}
      </div>

      {/* 3-dot / More options button with full custom-prompts popover */}
      <div
        className="optionsButtonWrapper"
        onMouseEnter={handleOptionsMouseEnter}
        onMouseLeave={handleOptionsMouseLeave}
      >
        <div className="contentActionButtonWrapper">
          <button
            ref={optionsBtnRef}
            className="contentActionButton optionsButton"
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="More options"
          >
            <MoreVertical size={18} strokeWidth={2.5} />
          </button>
          {optionsMounted && optionsBtnRef.current && !showOptionsPopover && (
            <OnHoverMessage
              message="More options"
              targetRef={optionsBtnRef}
              position="bottom"
              offset={8}
            />
          )}
        </div>

        {/* Options popover */}
        {showOptionsPopover && (
          <div
            className="actionButtonOptionsPopover imageOptionsPopover"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={handleOptionsMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
          >
            {/* Ask AI */}
            <button
              className="actionButtonOption"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAskAI?.();
                setShowOptionsPopover(false);
              }}
            >
              <MessageSquare size={18} strokeWidth={2.5} />
              <span>Ask AI about this image</span>
            </button>

            {/* Default image prompts */}
            <div className="optionsPopoverSeparator" />
            {DEFAULT_IMAGE_PROMPTS.map(({ label, icon: Icon, prompt }) => (
              <button
                key={label}
                className="actionButtonOption"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onPromptClick?.(label, prompt);
                  setShowOptionsPopover(false);
                }}
              >
                <Icon size={18} strokeWidth={2.5} />
                <span>{label}</span>
              </button>
            ))}

            {/* Custom prompts — only when available */}
            {customPrompts.length > 0 && (
              <>
                <div className="optionsPopoverSeparator" />
                {customPrompts.map((p) => (
                  <button
                    key={p.id}
                    className="actionButtonOption"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const apiContent = p.description ? stripHtml(p.description) : p.title;
                      onPromptClick?.(p.title, apiContent);
                      setShowOptionsPopover(false);
                    }}
                  >
                    <BookMarked size={18} strokeWidth={2.5} />
                    <span>{p.title}</span>
                  </button>
                ))}
              </>
            )}

            {/* Footer: Add / Manage */}
            <div className="optionsPopoverSeparator" />
            <button
              className="actionButtonOption"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                window.open(`${ENV.XPLAINO_WEBSITE_BASE_URL}/user/account/custom-prompt`, '_blank');
                setShowOptionsPopover(false);
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Add custom prompt</span>
            </button>
            <button
              className="actionButtonOption"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                window.open(`${ENV.XPLAINO_WEBSITE_BASE_URL}/user/account/custom-prompt`, '_blank');
                setShowOptionsPopover(false);
              }}
            >
              <ExternalLink size={18} strokeWidth={2.5} />
              <span>Manage custom prompts</span>
            </button>
          </div>
        )}
      </div>

      {/* Bookmark button */}
      <div className="contentActionButtonWrapper">
        <button
          ref={bookmarkBtnRef}
          className="contentActionButton"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onBookmarkOpen();
          }}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Save image'}
        >
          <Bookmark
            size={18}
            strokeWidth={2.5}
            fill={isBookmarked ? 'currentColor' : 'none'}
          />
        </button>
        {bookmarkMounted && bookmarkBtnRef.current && (
          <OnHoverMessage
            message={isBookmarked ? 'Remove bookmark' : 'Save image'}
            targetRef={bookmarkBtnRef}
            position="bottom"
            offset={8}
          />
        )}
      </div>
    </div>
  );
};

ImageActionsButtonGroup.displayName = 'ImageActionsButtonGroup';
