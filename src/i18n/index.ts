import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

const SUPPORTED_LANGS = ['en', 'ru', 'kk'];

const normalizeLanguage = (value?: string | null) => {
  if (!value) return 'en';
  const lower = value.toLowerCase();
  if (SUPPORTED_LANGS.includes(lower)) return lower;
  const short = lower.split('-')[0];
  return SUPPORTED_LANGS.includes(short) ? short : 'en';
};

const storedLang = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null;
const browserLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
const initialLang = normalizeLanguage(storedLang || browserLang);

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('lang', lng);
  }
});

export default i18n;
