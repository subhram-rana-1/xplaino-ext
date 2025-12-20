// src/components/ui/ButtonGroup/ButtonGroup.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './ButtonGroup.module.css';

export interface ButtonItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

export interface ButtonGroupProps {
  /** Array of button configurations */
  buttons: ButtonItem[];
  /** Currently active button ID */
  activeButtonId: string;
  /** Handler called when a button is clicked */
  onButtonChange: (buttonId: string) => void;
  /** Whether component is rendered in Shadow DOM (uses plain class names) */
  useShadowDom?: boolean;
  /** Icon size in pixels */
  iconSize?: number;
  /** Icon stroke width (thickness) */
  strokeWidth?: number;
  /** Distance between consecutive buttons in pixels */
  gap?: number;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  buttons,
  activeButtonId,
  onButtonChange,
  useShadowDom = false,
  iconSize = 24,
  strokeWidth = 2.0,
  gap = 0,
}) => {
  const getClassName = (baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    const styleClass = styles[baseClass as keyof typeof styles];
    return styleClass || baseClass;
  };

  return (
    <div 
      className={getClassName('buttonGroup')} 
      style={{ gap: `${gap}px` }}
    >
      {buttons.map((button) => {
        const IconComponent = button.icon;
        const isActive = activeButtonId === button.id;

        const buttonClassName = useShadowDom
          ? `button ${isActive ? 'active' : ''}`
          : `${styles.button} ${isActive ? styles.active : ''}`;

        return (
          <button
            key={button.id}
            className={buttonClassName}
            onClick={() => onButtonChange(button.id)}
            aria-label={button.label}
            type="button"
          >
            <span className={getClassName('buttonIcon')}>
              <IconComponent size={iconSize} strokeWidth={strokeWidth} />
            </span>
            <span className={getClassName('buttonLabel')}>{button.label}</span>
          </button>
        );
      })}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';

