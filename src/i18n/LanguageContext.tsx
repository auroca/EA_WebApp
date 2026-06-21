/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type Locale, type TranslationKey, translate } from './translations';

const STORAGE_KEY = 'trip2guide:locale';
const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'ca'];

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLocale(): Locale {
  let storedLocale: string | null;

  try {
    storedLocale = localStorage.getItem(STORAGE_KEY);
  } catch {
    storedLocale = null;
  }

  if (SUPPORTED_LOCALES.includes(storedLocale as Locale)) {
    return storedLocale as Locale;
  }

  const browserLocale = navigator.language.slice(0, 2);

  if (SUPPORTED_LOCALES.includes(browserLocale as Locale)) {
    return browserLocale as Locale;
  }

  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Storage can be unavailable in tests or privacy-restricted browsers.
    }
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      locale,
      setLocale: setLocaleState,
      t: (key, values) => translate(locale, key, values)
    };
  }, [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
}
