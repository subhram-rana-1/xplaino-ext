// src/content/components/SidePanel/Dropdown.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Dropdown.module.css';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  /** Options list */
  options: DropdownOption[];
  /** Selected value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Whether to use Shadow DOM styling */
  useShadowDom?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  label,
  useShadowDom = false,
}) => {
  const getClassName = useCallback((baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    return styles[baseClass as keyof typeof styles] || baseClass;
  }, [useShadowDom]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={getClassName('dropdownContainer')}>
      {label && <label className={getClassName('label')}>{label}</label>}
      <div className={getClassName('dropdown')} ref={dropdownRef}>
        <button
          className={`${getClassName('dropdownButton')} ${isOpen ? getClassName('open') : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <span className={getClassName('dropdownValue')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`${getClassName('chevron')} ${isOpen ? getClassName('chevronOpen') : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {isOpen && (
          <div className={getClassName('dropdownMenu')}>
            {options.map((option) => (
              <div
                key={option.value}
                className={`${getClassName('dropdownItem')} ${
                  value === option.value ? getClassName('selected') : ''
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

Dropdown.displayName = 'Dropdown';
