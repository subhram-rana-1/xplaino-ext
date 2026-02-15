// src/hooks/useLanguageOptions.ts
import { useState, useEffect, useMemo } from 'react';
import { UserSettingsService } from '@/api-services/UserSettingsService';

export interface LanguageDropdownOption {
  value: string;
  label: string;
}

export interface UseLanguageOptionsOptions {
  /** Prepend a "None" option for settings-style dropdowns */
  includeNone?: boolean;
}

export interface UseLanguageOptionsResult {
  languageOptions: LanguageDropdownOption[];
  loading: boolean;
  error: Error | null;
}

/**
 * Fetches language list from backend and maps to dropdown options with
 * "English (अंग्रेज़ी)" style labels (Hindi / regional + English).
 * Reusable for Settings native language and Text Explanation translation tab.
 */
export function useLanguageOptions(
  options: UseLanguageOptionsOptions = {}
): UseLanguageOptionsResult {
  const { includeNone = false } = options;
  const [languages, setLanguages] = useState<Array<{
    languageCode: string;
    languageNameInEnglish: string;
    languageNameInNative: string;
  }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLanguages() {
      setLoading(true);
      setError(null);
      try {
        const response = await UserSettingsService.getAllLanguages();
        if (!cancelled) {
          const sorted = [...response.languages].sort((a, b) =>
            a.languageNameInEnglish.localeCompare(b.languageNameInEnglish)
          );
          setLanguages(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLanguages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLanguages();
    return () => {
      cancelled = true;
    };
  }, []);

  const languageOptions = useMemo((): LanguageDropdownOption[] => {
    if (!languages) return [];
    const opts = languages.map((lang) => ({
      value: lang.languageCode,
      label: `${lang.languageNameInEnglish} (${lang.languageNameInNative})`,
    }));
    if (includeNone) {
      return [{ value: '', label: 'None' }, ...opts];
    }
    return opts;
  }, [languages, includeNone]);

  return { languageOptions, loading, error };
}
