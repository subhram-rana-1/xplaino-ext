// src/content/components/TryPDFBadge/TryPDFBadge.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, X, MessageSquare, PenLine, Users, Sparkles } from 'lucide-react';
import { ENV } from '@/config/env';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import styles from './TryPDFBadge.module.css';

const FEATURES = [
  { icon: MessageSquare, label: 'Chat with PDF' },
  { icon: PenLine, label: 'Highlight, Add notes' },
  { icon: Users, label: 'Collaborate with team' },
  { icon: Sparkles, label: 'Custom prompts' },
] as const;

export interface TryPDFBadgeProps {
  useShadowDom?: boolean;
}

export const TryPDFBadge: React.FC<TryPDFBadgeProps> = ({ useShadowDom = false }) => {
  const [isDismissed, setIsDismissed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ChromeStorage.getDontShowPdfBadge().then((dismissed) => {
      setIsDismissed(dismissed);
    });
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const cn = useCallback(
    (shadowClass: string, moduleClass: keyof typeof styles) =>
      useShadowDom ? shadowClass : (styles[moduleClass] as string),
    [useShadowDom]
  );

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  }, []);

  const handleNavigate = useCallback(() => {
    window.open(`${ENV.XPLAINO_WEBSITE_BASE_URL}/tools/pdf`, '_blank');
  }, []);

  const handleDismiss = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    await ChromeStorage.setDontShowPdfBadge(true);
  }, []);

  if (isDismissed) return null;

  return (
    <div
      className={cn('tryPDFWrapper', 'wrapper')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`${cn('tryPDFBadge', 'badge')} ${cn('tryPDFBadgeExpanded', 'expanded')}`}
        onClick={handleNavigate}
        aria-label="Try PDF — Free"
        title="Try PDF — Free"
      >
        <span className={cn('tryPDFBadgeIcon', 'badgeIcon')}>
          <FileText size={14} strokeWidth={2} />
        </span>

        <span className={cn('tryPDFBadgeText', 'badgeText')}>
          Try PDF &mdash; Free
        </span>

        <span
          className={cn('tryPDFDismissBtn', 'dismissBtn')}
          onClick={handleDismiss}
          role="button"
          aria-label="Dismiss"
        >
          <X size={10} strokeWidth={2.5} />
        </span>
      </button>

      {isHovered && (
        <div className={cn('tryPDFPopover', 'popover')} role="tooltip" aria-label="PDF features">
          <div className={cn('tryPDFPopoverHeader', 'popoverHeader')}>PDF Features</div>
          <div className={cn('tryPDFPopoverDivider', 'popoverDivider')} />
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className={cn('tryPDFPopoverItem', 'popoverItem')}>
              <span className={cn('tryPDFPopoverItemIcon', 'popoverItemIcon')}>
                <Icon size={11} strokeWidth={2} />
              </span>
              <span className={cn('tryPDFPopoverItemLabel', 'popoverItemLabel')}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

TryPDFBadge.displayName = 'TryPDFBadge';
