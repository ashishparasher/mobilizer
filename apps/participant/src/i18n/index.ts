import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import hi from './hi.json';

type Language = 'en' | 'hi';

const translations: Record<Language, any> = { en, hi };

const STORAGE_KEY = '@mobilize:language';

let _currentLanguage: Language = 'en';
let _listeners: Array<(lang: Language) => void> = [];

/** Get a value from a nested object via dot notation: 'common.apply' → 'Apply Now' */
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path; // fallback: return the key itself
    }
  }
  return typeof result === 'string' ? result : path;
}

/** Load persisted language on startup */
export async function initLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'hi' || stored === 'en') {
      _currentLanguage = stored;
    }
  } catch {
    // ignore — default to 'en'
  }
  return _currentLanguage;
}

/** Change the app language and persist to AsyncStorage */
export async function setLanguage(lang: Language): Promise<void> {
  _currentLanguage = lang;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
  _listeners.forEach(fn => fn(lang));
}

/** Get the current language */
export function getLanguage(): Language {
  return _currentLanguage;
}

/**
 * React hook for translations.
 * Returns `t('key.path')` function and current language.
 */
export function useTranslation() {
  const [lang, setLang] = useState<Language>(_currentLanguage);

  useEffect(() => {
    // Load persisted language
    initLanguage().then(setLang);

    // Subscribe to language changes
    const listener = (newLang: Language) => setLang(newLang);
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter(fn => fn !== listener);
    };
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations[lang], key);
    },
    [lang]
  );

  return { t, language: lang, setLanguage };
}
