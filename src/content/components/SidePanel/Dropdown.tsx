// src/content/components/SidePanel/Dropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
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
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  label,
}) => {
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
    <div className={styles.dropdownContainer}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.dropdown} ref={dropdownRef}>
        <button
          className={`${styles.dropdownButton} ${isOpen ? styles.open : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <span className={styles.dropdownValue}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
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
          <div className={styles.dropdownMenu}>
            {options.map((option) => (
              <div
                key={option.value}
                className={`${styles.dropdownItem} ${
                  value === option.value ? styles.selected : ''
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
