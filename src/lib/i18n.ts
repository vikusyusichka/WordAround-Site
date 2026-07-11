import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import commonEn from '@/locales/en/common.json';
import commonUk from '@/locales/uk/common.json';
import commonPl from '@/locales/pl/common.json';
import commonDe from '@/locales/de/common.json';

/* Design note: the SwiftUI project is English-only in-app; strings live inline.
   We route every string through i18next from day 1 so adding uk/pl/de later
   is a translation exercise, not a refactor. */
export const supportedLngs = ['en', 'uk', 'pl', 'de'] as const;
export type SupportedLng = (typeof supportedLngs)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: [...supportedLngs],
    ns: ['common'],
    defaultNS: 'common',
    resources: {
      en: { common: commonEn },
      uk: { common: commonUk },
      pl: { common: commonPl },
      de: { common: commonDe },
    },
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wa.lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
