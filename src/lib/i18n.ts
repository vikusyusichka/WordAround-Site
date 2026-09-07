import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import commonEn from '@/locales/en/common.json';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/lib/languages';

/* Design note: the SwiftUI project is English-only in-app; strings live inline.
   We route every string through i18next, and ship the same 30 interface
   languages the iOS language list offers (see languages.ts).

   English is the default on purpose: the browser's language is a guess (a
   Ukrainian browser in a Spanish household guesses wrong), so the app opens in
   English until you pick a language in Profile — and that choice is what
   persists in localStorage (`wa.lang`).

   Only English is bundled. The other 29 files are ~60 KB each, so they load on
   demand — the initial download stays one locale, not thirty. */
export const supportedLngs = LANGUAGE_CODES;
export type SupportedLng = string;

/* Vite resolves this glob at build time into one lazy chunk per locale. */
const localeLoaders = import.meta.glob<Record<string, unknown>>('../locales/*/common.json', {
  import: 'default',
});

const loaderFor = (lng: string) => localeLoaders[`../locales/${lng}/common.json`];

/** Loads a locale's strings into i18next (no-op for one already loaded). */
export const loadLanguage = async (lng: string): Promise<void> => {
  if (lng === DEFAULT_LANGUAGE || i18n.hasResourceBundle(lng, 'common')) return;
  const loader = loaderFor(lng);
  if (!loader) return;
  try {
    i18n.addResourceBundle(lng, 'common', await loader(), true, true);
  } catch {
    /* A locale chunk that fails to load just leaves that language on the
       English fallback — never a blank screen. */
  }
};

/** Switches the interface language, fetching its strings first. */
export const setAppLanguage = async (lng: string): Promise<void> => {
  await loadLanguage(lng);
  await i18n.changeLanguage(lng);
};

const initPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    /* No `lng` here: passing one would override the stored choice AND make
       the detector write that override back to localStorage, wiping it. The
       detector reads `wa.lang` and falls back to English on its own. */
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...supportedLngs],
    ns: ['common'],
    defaultNS: 'common',
    resources: {
      en: { common: commonEn },
    },
    interpolation: {
      escapeValue: false,
    },
    detection: {
      /* localStorage only — no `navigator`, so the app opens in English until
         the reader picks a language themselves. */
      order: ['localStorage'],
      lookupLocalStorage: 'wa.lang',
      caches: ['localStorage'],
    },
  });

/* Resolves once the stored language (if any) is in place, so the first paint is
   already translated instead of flashing English. */
export const i18nReady: Promise<void> = (async () => {
  await initPromise;
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('wa.lang') : null;
  if (stored && stored !== DEFAULT_LANGUAGE && supportedLngs.includes(stored)) {
    await setAppLanguage(stored);
  }
})();

export default i18n;
