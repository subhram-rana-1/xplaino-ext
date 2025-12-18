// src/components/ui/Toggle/Toggle.tsx
import React from 'react';
import { COLORS } from '@/constants/colors';
import { TRANSITION } from '@/constants/styles';

export interface ToggleProps {
  /** Toggle checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Label text */
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={handleClick}
    >
      <div
        style={{
          position: 'relative',
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: checked
            ? COLORS.PRIMARY
            : disabled
              ? COLORS.GRAY_300
              : COLORS.GRAY_400,
          transition: `background-color ${TRANSITION.FAST}`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: COLORS.WHITE,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: `left ${TRANSITION.FAST}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </div>
      {label && (
        <span
          style={{
            color: disabled ? COLORS.TEXT_MUTED : COLORS.TEXT_PRIMARY,
            fontSize: '14px',
            userSelect: 'none',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

Toggle.displayName = 'Toggle';

