// src/content/components/SidePanel/SettingsView.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Sun, Moon, Layers, RefreshCw } from 'lucide-react';
import { ChromeStorage } from '@/storage/chrome-local/ChromeStorage';
import { DomainStatus } from '@/types/domain';
import { extractDomain } from '@/utils/domain';
import { Dropdown } from './Dropdown';
import { showDisableModal } from '@/content/index';
import styles from './SettingsView.module.css';

export interface SettingsViewProps {
  /** Whether to use Shadow DOM styling */
  useShadowDom?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ useShadowDom = false }) => {
  const getClassName = useCallback((baseClass: string) => {
    if (useShadowDom) {
      return baseClass;
    }
    return styles[baseClass as keyof typeof styles] || baseClass;
  }, [useShadowDom]);

// Inline Toggle component for content script
const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <div
        className={getClassName('toggleContainer')}
      onClick={() => onChange(!checked)}
    >
        <div className={`${getClassName('toggleTrack')} ${checked ? getClassName('checked') : ''}`}>
          <div className={`${getClassName('toggleThumb')} ${checked ? getClassName('thumbChecked') : ''}`} />
        </div>
      </div>
    );
  };

  // Theme Toggle component - single button with Light/Dark options
  const ThemeToggle: React.FC<{
    value: 'light' | 'dark';
    onChange: (value: 'light' | 'dark') => void;
  }> = ({ value, onChange }) => {
    return (
      <div className={getClassName('themeToggleButton')}>
        <button
          className={`${getClassName('themeToggleOption')} ${value === 'light' ? getClassName('themeToggleActive') : ''}`}
          onClick={() => onChange('light')}
          type="button"
        >
          <Sun size={18} strokeWidth={2.5} />
        </button>
        <button
          className={`${getClassName('themeToggleOption')} ${value === 'dark' ? getClassName('themeToggleActive') : ''}`}
          onClick={() => onChange('dark')}
          type="button"
        >
          <Moon size={18} strokeWidth={2.5} />
        </button>
    </div>
  );
};
  const [language, setLanguage] = useState<string>('English');
  const [translationView, setTranslationView] = useState<'append' | 'replace'>('append');
  const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>('light');
  const [domainTheme, setDomainTheme] = useState<'light' | 'dark'>('light');
  const [globalDisabled, setGlobalDisabled] = useState<boolean>(false);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const tabGroupRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);

  const updateSliderPosition = useCallback((activeView: 'append' | 'replace') => {
    if (!sliderRef.current || !tabGroupRef.current) return;
    
    const activeIndex = activeView === 'append' ? 0 : 1;
    const activeTab = tabRefs.current[activeIndex];
    
    if (activeTab && tabGroupRef.current) {
      const groupRect = tabGroupRef.current.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      const offsetX = tabRect.left - groupRect.left;
      const width = tabRect.width;
      
      sliderRef.current.style.transform = `translateX(${offsetX}px)`;
      sliderRef.current.style.width = `${width}px`;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Update slider position when component mounts or translationView changes
    if (!loading) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        updateSliderPosition(translationView);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [translationView, loading, updateSliderPosition]);

  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      if (!loading) {
        updateSliderPosition(translationView);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [translationView, loading, updateSliderPosition]);

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
      if (transView && transView !== 'none') setTranslationView(transView);
      else if (transView === 'none') setTranslationView('append'); // Migrate 'none' to 'append'
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

  const handleTranslationViewChange = async (view: 'append' | 'replace') => {
    setTranslationView(view);
    await ChromeStorage.setTranslationView(view);
    // Update slider position after state update
    requestAnimationFrame(() => {
      updateSliderPosition(view);
    });
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
    // Show disable modal when toggling off
    if (!checked) {
      showDisableModal();
    }
  };

  const handleDomainToggle = async (checked: boolean) => {
    if (!currentDomain) return;
    const newStatus = checked ? DomainStatus.ENABLED : DomainStatus.DISABLED;
    await ChromeStorage.setDomainStatus(currentDomain, newStatus);
    setDomainStatus(newStatus);
    // Show disable modal when toggling off
    if (!checked) {
      showDisableModal();
    }
  };

  // Comprehensive languages list from comp project
  const languageOptions = [
    { value: 'English', label: 'English' },
    { value: 'Español', label: 'Español' },
    { value: 'Français', label: 'Français' },
    { value: 'Deutsch', label: 'Deutsch' },
    { value: 'Italiano', label: 'Italiano' },
    { value: 'Português', label: 'Português' },
    { value: 'Русский', label: 'Русский' },
    { value: '中文', label: '中文' },
    { value: '日本語', label: '日本語' },
    { value: '한국어', label: '한국어' },
    { value: 'العربية', label: 'العربية' },
    { value: 'हिन्दी', label: 'हिन्दी' },
    { value: 'Nederlands', label: 'Nederlands' },
    { value: 'Türkçe', label: 'Türkçe' },
    { value: 'Polski', label: 'Polski' },
    { value: 'Svenska', label: 'Svenska' },
    { value: 'Norsk', label: 'Norsk' },
    { value: 'Dansk', label: 'Dansk' },
    { value: 'Suomi', label: 'Suomi' },
    { value: 'Ελληνικά', label: 'Ελληνικά' },
    { value: 'Čeština', label: 'Čeština' },
    { value: 'Magyar', label: 'Magyar' },
    { value: 'Română', label: 'Română' },
    { value: 'Български', label: 'Български' },
    { value: 'Hrvatski', label: 'Hrvatski' },
    { value: 'Srpski', label: 'Srpski' },
    { value: 'Slovenčina', label: 'Slovenčina' },
    { value: 'Slovenščina', label: 'Slovenščina' },
    { value: 'Українська', label: 'Українська' },
    { value: 'עברית', label: 'עברית' },
    { value: 'فارسی', label: 'فارسی' },
    { value: 'اردو', label: 'اردو' },
    { value: 'বাংলা', label: 'বাংলা' },
    { value: 'தமிழ்', label: 'தமிழ்' },
    { value: 'తెలుగు', label: 'తెలుగు' },
    { value: 'मराठी', label: 'मराठी' },
    { value: 'ગુજરાતી', label: 'ગુજરાતી' },
    { value: 'ಕನ್ನಡ', label: 'ಕನ್ನಡ' },
    { value: 'മലയാളം', label: 'മലയാളം' },
    { value: 'ਪੰਜਾਬੀ', label: 'ਪੰਜਾਬੀ' },
    { value: 'ଓଡ଼ିଆ', label: 'ଓଡ଼ିଆ' },
    { value: 'नेपाली', label: 'नेपाली' },
    { value: 'සිංහල', label: 'සිංහල' },
    { value: 'ไทย', label: 'ไทย' },
    { value: 'Tiếng Việt', label: 'Tiếng Việt' },
    { value: 'Bahasa Indonesia', label: 'Bahasa Indonesia' },
    { value: 'Bahasa Melayu', label: 'Bahasa Melayu' },
    { value: 'Filipino', label: 'Filipino' },
    { value: 'Tagalog', label: 'Tagalog' },
    { value: 'မြန်မာ', label: 'မြန်မာ' },
    { value: 'ភាសាខ្មែរ', label: 'ភាសាខ្មែរ' },
    { value: 'Lao', label: 'Lao' },
    { value: 'Монгол', label: 'Монгол' },
    { value: 'ქართული', label: 'ქართული' },
    { value: 'Հայերեն', label: 'Հայերեն' },
    { value: 'Azərbaycan', label: 'Azərbaycan' },
    { value: 'Қазақ', label: 'Қазақ' },
    { value: 'Oʻzbek', label: 'Oʻzbek' },
    { value: 'Кыргызча', label: 'Кыргызча' },
    { value: 'Türkmen', label: 'Türkmen' },
    { value: 'Afrikaans', label: 'Afrikaans' },
    { value: 'Kiswahili', label: 'Kiswahili' },
    { value: 'Yorùbá', label: 'Yorùbá' },
    { value: 'Hausa', label: 'Hausa' },
    { value: 'Igbo', label: 'Igbo' },
    { value: 'Zulu', label: 'Zulu' },
    { value: 'Xhosa', label: 'Xhosa' },
    { value: 'Amharic', label: 'Amharic' },
    { value: 'አማርኛ', label: 'አማርኛ' },
    { value: 'Somali', label: 'Somali' },
    { value: 'Kinyarwanda', label: 'Kinyarwanda' },
    { value: 'Luganda', label: 'Luganda' },
    { value: 'Shona', label: 'Shona' },
    { value: 'Malagasy', label: 'Malagasy' },
    { value: 'Maltese', label: 'Maltese' },
    { value: 'Íslenska', label: 'Íslenska' },
    { value: 'Gaeilge', label: 'Gaeilge' },
    { value: 'Cymraeg', label: 'Cymraeg' },
    { value: 'Brezhoneg', label: 'Brezhoneg' },
    { value: 'Català', label: 'Català' },
    { value: 'Galego', label: 'Galego' },
    { value: 'Euskara', label: 'Euskara' },
    { value: 'Latviešu', label: 'Latviešu' },
    { value: 'Lietuvių', label: 'Lietuvių' },
    { value: 'Eesti', label: 'Eesti' },
    { value: 'Shqip', label: 'Shqip' },
    { value: 'Македонски', label: 'Македонски' },
    { value: 'Bosanski', label: 'Bosanski' },
    { value: 'Esperanto', label: 'Esperanto' },
    { value: 'Interlingua', label: 'Interlingua' },
    { value: 'Lingua Latina', label: 'Lingua Latina' },
    { value: 'Klingon', label: 'Klingon' },
    { value: 'Toki Pona', label: 'Toki Pona' },
  ];

  if (loading) {
    return (
      <div className={getClassName('loading')}>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={getClassName('settingsView')}>
      {/* Language Section */}
      <div className={getClassName('section')}>
        <div className={getClassName('sectionHeader')}>
          <div className={getClassName('sectionAccent')} />
          <h3 className={getClassName('sectionTitle')}>Language</h3>
          <div className={getClassName('sectionHeaderLine')} />
        </div>
        <div className={getClassName('sectionContent')}>
          <div className={getClassName('settingItem')}>
            <div className={getClassName('languageSettingRow')}>
              <label className={getClassName('settingLabel')}>My native language</label>
              <Dropdown
                key={language}
                options={languageOptions}
                value={language}
                onChange={handleLanguageChange}
                placeholder="Select language"
                useShadowDom={useShadowDom}
              />
            </div>
          </div>
          <div className={getClassName('settingItem')}>
            <div className={getClassName('translationViewRow')}>
              <label className={getClassName('settingLabel')}>Page translation view</label>
              <div className={getClassName('tabGroup')} ref={tabGroupRef}>
                <div className={getClassName('tabSlider')} ref={sliderRef}></div>
                <button
                  ref={(el) => { tabRefs.current[0] = el; }}
                  className={`${getClassName('tab')} ${translationView === 'append' ? getClassName('tabActive') : ''}`}
                  onClick={() => handleTranslationViewChange('append')}
                  title="Show me both"
                >
                  <Layers size={16} strokeWidth={3} />
                </button>
                <button
                  ref={(el) => { tabRefs.current[1] = el; }}
                  className={`${getClassName('tab')} ${translationView === 'replace' ? getClassName('tabActive') : ''}`}
                  onClick={() => handleTranslationViewChange('replace')}
                  title="Replace existing content"
                >
                  <RefreshCw size={16} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div className={getClassName('section')}>
        <div className={getClassName('sectionHeader')}>
          <div className={getClassName('sectionAccent')} />
          <h3 className={getClassName('sectionTitle')}>Theme</h3>
          <div className={getClassName('sectionHeaderLine')} />
        </div>
        <div className={getClassName('sectionContent')}>
          <div className={getClassName('settingItem')}>
            <div className={getClassName('themeToggleRow')}>
              <label className={getClassName('settingLabel')}>Global theme</label>
              <ThemeToggle
                value={globalTheme}
                onChange={handleGlobalThemeChange}
              />
            </div>
          </div>
          {currentDomain && (
            <div className={getClassName('settingItem')}>
              <div className={getClassName('themeToggleRow')}>
                <label className={getClassName('settingLabel')}>Theme on this site</label>
                <ThemeToggle
                  value={domainTheme}
                  onChange={handleDomainThemeChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enable Section */}
      <div className={getClassName('section')}>
        <div className={getClassName('sectionHeader')}>
          <div className={getClassName('sectionAccent')} />
          <h3 className={getClassName('sectionTitle')}>Enable extension</h3>
          <div className={getClassName('sectionHeaderLine')} />
        </div>
        <div className={getClassName('sectionContent')}>
          <div className={getClassName('settingItem')}>
            <div className={getClassName('toggleSetting')}>
              <Toggle
                checked={!globalDisabled}
                onChange={handleGlobalToggle}
              />
              <span className={getClassName('toggleLabel')}>Enable globally</span>
            </div>
          </div>
          {currentDomain && !globalDisabled && domainStatus !== DomainStatus.INVALID && (
            <div className={getClassName('settingItem')}>
              <div className={getClassName('toggleSetting')}>
                <Toggle
                  checked={domainStatus === DomainStatus.ENABLED}
                  onChange={handleDomainToggle}
                />
                <span className={getClassName('toggleLabel')}>
                  Enable on <span className={getClassName('domainName')}>{currentDomain}</span>
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

