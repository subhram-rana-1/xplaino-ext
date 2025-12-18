// src/content/components/SidePanel/SettingsView.tsx
import React, { useEffect, useState } from 'react';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { DomainStatus } from '@/types/domain';
import { extractDomain } from '@/utils/domain';
import { Dropdown } from './Dropdown';
import styles from './SettingsView.module.css';

// Inline Toggle component for content script
const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <div
      className={styles.toggleContainer}
      onClick={() => onChange(!checked)}
    >
      <div className={`${styles.toggleTrack} ${checked ? styles.checked : ''}`}>
        <div className={`${styles.toggleThumb} ${checked ? styles.thumbChecked : ''}`} />
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const [language, setLanguage] = useState<string>('en');
  const [translationView, setTranslationView] = useState<'none' | 'append' | 'replace'>('none');
  const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>('light');
  const [domainTheme, setDomainTheme] = useState<'light' | 'dark'>('light');
  const [globalDisabled, setGlobalDisabled] = useState<boolean>(false);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const domain = extractDomain(window.location.href);
      setCurrentDomain(domain);

      // Load all settings
      const [
        lang,
        transView,
        gTheme,
        dTheme,
        gDisabled,
        dStatus,
      ] = await Promise.all([
        ChromeStorage.getLanguage(),
        ChromeStorage.getTranslationView(),
        ChromeStorage.getGlobalTheme(),
        domain ? ChromeStorage.getDomainTheme(domain) : null,
        ChromeStorage.getGlobalDisabled(),
        domain ? ChromeStorage.getDomainStatus(domain) : null,
      ]);

      if (lang) setLanguage(lang);
      if (transView) setTranslationView(transView);
      if (gTheme) setGlobalTheme(gTheme);
      if (dTheme) setDomainTheme(dTheme);
      setGlobalDisabled(gDisabled);
      if (dStatus) setDomainStatus(dStatus);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (value: string) => {
    setLanguage(value);
    await ChromeStorage.setLanguage(value);
  };

  const handleTranslationViewChange = async (view: 'none' | 'append' | 'replace') => {
    setTranslationView(view);
    await ChromeStorage.setTranslationView(view);
  };

  const handleGlobalThemeChange = async (theme: 'light' | 'dark') => {
    setGlobalTheme(theme);
    await ChromeStorage.setGlobalTheme(theme);
  };

  const handleDomainThemeChange = async (theme: 'light' | 'dark') => {
    if (!currentDomain) return;
    setDomainTheme(theme);
    await ChromeStorage.setDomainTheme(currentDomain, theme);
  };

  const handleGlobalToggle = async (checked: boolean) => {
    await ChromeStorage.setGlobalDisabled(!checked);
    setGlobalDisabled(!checked);
  };

  const handleDomainToggle = async (checked: boolean) => {
    if (!currentDomain) return;
    const newStatus = checked ? DomainStatus.ENABLED : DomainStatus.DISABLED;
    await ChromeStorage.setDomainStatus(currentDomain, newStatus);
    setDomainStatus(newStatus);
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
  ];

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsView}>
      {/* Language Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionAccent} />
          <h3 className={styles.sectionTitle}>Language</h3>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.settingItem}>
            <Dropdown
              options={languageOptions}
              value={language}
              onChange={handleLanguageChange}
              placeholder="Select language"
            />
          </div>
          <div className={styles.settingItem}>
            <label className={styles.settingLabel}>Translation view</label>
            <div className={styles.tabGroup}>
              <button
                className={`${styles.tab} ${translationView === 'none' ? styles.tabActive : ''}`}
                onClick={() => handleTranslationViewChange('none')}
              >
                None
              </button>
              <button
                className={`${styles.tab} ${translationView === 'append' ? styles.tabActive : ''}`}
                onClick={() => handleTranslationViewChange('append')}
              >
                Append
              </button>
              <button
                className={`${styles.tab} ${translationView === 'replace' ? styles.tabActive : ''}`}
                onClick={() => handleTranslationViewChange('replace')}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionAccent} />
          <h3 className={styles.sectionTitle}>Theme</h3>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.settingItem}>
            <label className={styles.settingLabel}>Global theme</label>
            <div className={styles.themeToggle}>
              <button
                className={`${styles.themeOption} ${globalTheme === 'light' ? styles.themeActive : ''}`}
                onClick={() => handleGlobalThemeChange('light')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <span>Light</span>
              </button>
              <button
                className={`${styles.themeOption} ${globalTheme === 'dark' ? styles.themeActive : ''}`}
                onClick={() => handleGlobalThemeChange('dark')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span>Dark</span>
              </button>
            </div>
          </div>
          {currentDomain && (
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                Theme on <span className={styles.domainName}>{currentDomain}</span>
              </label>
              <div className={styles.themeToggle}>
                <button
                  className={`${styles.themeOption} ${domainTheme === 'light' ? styles.themeActive : ''}`}
                  onClick={() => handleDomainThemeChange('light')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  <span>Light</span>
                </button>
                <button
                  className={`${styles.themeOption} ${domainTheme === 'dark' ? styles.themeActive : ''}`}
                  onClick={() => handleDomainThemeChange('dark')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span>Dark</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enable Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionAccent} />
          <h3 className={styles.sectionTitle}>Enable</h3>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.settingItem}>
            <div className={styles.toggleSetting}>
              <Toggle
                checked={!globalDisabled}
                onChange={handleGlobalToggle}
              />
              <span className={styles.toggleLabel}>Enable globally</span>
            </div>
          </div>
          {currentDomain && !globalDisabled && domainStatus !== DomainStatus.INVALID && (
            <div className={styles.settingItem}>
              <div className={styles.toggleSetting}>
                <Toggle
                  checked={domainStatus === DomainStatus.ENABLED}
                  onChange={handleDomainToggle}
                />
                <span className={styles.toggleLabel}>
                  Enable on <span className={styles.domainName}>{currentDomain}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

SettingsView.displayName = 'SettingsView';

