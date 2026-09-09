/* The 30 interface languages, ported from the iOS `GrammarLanguage` list so web
   and app offer the same set. Order = display order in the picker: the language
   family groups iOS uses (Romance/Germanic, Slavic, other European, Nordic,
   Baltic). Native names, so you can find your language without reading the one
   currently active. */

export interface AppLanguage {
  /** BCP-47 / ISO 639-1 code — also the folder name under src/locales. */
  code: string;
  /** The language's own name for itself. */
  nativeName: string;
  /** English name, used for the title attribute and for search. */
  englishName: string;
}

export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'fr', nativeName: 'Français', englishName: 'French' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese' },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch' },
  { code: 'ca', nativeName: 'Català', englishName: 'Catalan' },
  { code: 'gl', nativeName: 'Galego', englishName: 'Galician' },
  { code: 'eo', nativeName: 'Esperanto', englishName: 'Esperanto' },

  { code: 'pl', nativeName: 'Polski', englishName: 'Polish' },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian' },
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech' },
  { code: 'sk', nativeName: 'Slovenčina', englishName: 'Slovak' },
  { code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian' },
  { code: 'sr', nativeName: 'Српски', englishName: 'Serbian' },
  { code: 'sl', nativeName: 'Slovenščina', englishName: 'Slovenian' },
  { code: 'bg', nativeName: 'Български', englishName: 'Bulgarian' },

  { code: 'ro', nativeName: 'Română', englishName: 'Romanian' },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian' },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish' },

  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish' },
  { code: 'da', nativeName: 'Dansk', englishName: 'Danish' },
  { code: 'no', nativeName: 'Norsk', englishName: 'Norwegian' },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish' },

  { code: 'lt', nativeName: 'Lietuvių', englishName: 'Lithuanian' },
  { code: 'lv', nativeName: 'Latviešu', englishName: 'Latvian' },
  { code: 'et', nativeName: 'Eesti', englishName: 'Estonian' },
];

export const LANGUAGE_CODES = APP_LANGUAGES.map((l) => l.code);

export const DEFAULT_LANGUAGE = 'en';

export const languageByCode = (code: string | undefined): AppLanguage | undefined =>
  APP_LANGUAGES.find((l) => l.code === code);

/** Search for the picker on /profile/language. Matches the native name, the
    English name and the code, so "Ukrainian", "Українська" and "uk" all find
    the same row — you should be able to find your language whichever of the
    two you happen to be reading in. An empty query keeps the full list. */
export const filterLanguages = (query: string): AppLanguage[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return APP_LANGUAGES;
  return APP_LANGUAGES.filter(
    (language) =>
      language.nativeName.toLowerCase().includes(needle) ||
      language.englishName.toLowerCase().includes(needle) ||
      language.code.includes(needle),
  );
};
