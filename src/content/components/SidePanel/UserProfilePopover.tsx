// src/content/components/SidePanel/UserProfilePopover.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { LogOut } from 'lucide-react';
import { AuthService } from '@/api-services/AuthService';
import { useSetAtom } from 'jotai';
import { userAuthInfoAtom } from '@/store/uiAtoms';
import { useEmergeAnimation } from '@/hooks/useEmergeAnimation';
import styles from './UserProfilePopover.module.css';

export interface UserProfilePopoverProps {
  /** User's full name */
  userName: string;
  /** Whether component is rendered in Shadow DOM */
  useShadowDom?: boolean;
  /** Callback when popover should close */
  onClose?: () => void;
  /** Ref to the source element (profile button) for animation */
  sourceRef?: RefObject<HTMLElement>;
  /** Expose close method to parent */
  onCloseRequest?: (closeFn: () => Promise<void>) => void;
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  userName,
  useShadowDom = false,
  onClose,
  sourceRef,
  onCloseRequest,
}) => {
  const setUserAuthInfo = useSetAtom(userAuthInfoAtom);
  const hasEmergedRef = useRef(false);
  const isUnmountingRef = useRef(false);

  // Animation hook
  const {
    elementRef,
    sourceRef: animationSourceRef,
    emerge,
    shrink,
    shouldRender,
    style: animationStyle,
  } = useEmergeAnimation({
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transformOrigin: 'top right',
  });

  // Sync sourceRef with animation hook's sourceRef
  useEffect(() => {
    if (sourceRef?.current) {
      (animationSourceRef as React.MutableRefObject<HTMLElement | null>).current = sourceRef.current;
    }
  }, [sourceRef, animationSourceRef]);

  // Trigger emerge animation when component mounts (only once)
  useEffect(() => {
    if (!hasEmergedRef.current && !isUnmountingRef.current) {
      hasEmergedRef.current = true;
      // Use a small delay to ensure element is in DOM
      const timeoutId = setTimeout(() => {
        if (!isUnmountingRef.current) {
          emerge().catch((error) => {
            // Ignore errors if component is unmounting or if it's an abort error
            if (!isUnmountingRef.current && (error as Error)?.name !== 'AbortError') {
              console.error('[UserProfilePopover] Emerge animation error:', error);
            }
          });
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty deps - only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  // Handle close with shrink animation
  const handleClose = useCallback(async () => {
    if (isUnmountingRef.current) {
      return; // Already closing/unmounting
    }
    isUnmountingRef.current = true;
    try {
      await shrink();
    } catch (error) {
      // Ignore errors during shrink (component might be unmounting or animation was aborted)
      if ((error as Error)?.name !== 'AbortError') {
        console.error('[UserProfilePopover] Shrink animation error:', error);
      }
    } finally {
      onClose?.();
    }
  }, [shrink, onClose]);

  // Expose close method to parent
  useEffect(() => {
    if (onCloseRequest) {
      onCloseRequest(handleClose);
    }
  }, [onCloseRequest, handleClose]);

  const getClassName = useCallback((baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    const styleClass = styles[baseClass as keyof typeof styles];
    return styleClass || baseClass;
  }, [useShadowDom]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the popover
      const element = elementRef.current;
      if (element && !element.contains(event.target as Node)) {
        // Also check if click is on the profile picture button (it has class 'profilePictureButton')
        const target = event.target as HTMLElement;
        const isProfileButton = target.closest('.profilePictureButton') || target.closest('.profileContainer');
        
        // Don't close if clicking on profile button - let the toggle handle it
        if (!isProfileButton) {
          handleClose();
        }
      }
    };

    // Add event listener after a short delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClose, elementRef]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  // Handle logout
  const handleLogout = async () => {
    console.log('[UserProfilePopover] Logout button clicked, calling AuthService.logout()');
    try {
      await AuthService.logout();
      console.log('[UserProfilePopover] Logout successful, clearing auth info');
      // Only clear auth info atom if logout API succeeded
      // AuthService.logout() already removes from storage on success
      setUserAuthInfo(null);
      await handleClose();
    } catch (error) {
      console.error('[UserProfilePopover] Logout error:', error);
      // Don't clear auth info if API call failed
      // Just close the popover
      await handleClose();
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={getClassName('userProfilePopover')}
      style={animationStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* User Name */}
      <div className={getClassName('userName')}>
        {userName}
      </div>

      {/* Logout Button */}
      <button
        className={getClassName('logoutButton')}
        onClick={handleLogout}
        type="button"
        aria-label="Logout"
      >
        <LogOut size={18} strokeWidth={2.5} />
        <span className={getClassName('logoutButtonText')}>Logout</span>
      </button>
    </div>
  );
};

UserProfilePopover.displayName = 'UserProfilePopover';

