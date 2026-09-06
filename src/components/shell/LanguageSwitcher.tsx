/* Interface-language picker. Without this the app language is whatever was
   stored last, with no way back — so the translations are only reachable for
   some readers. The choice persists via i18next's localStorage detector
   (`wa.lang`); the strings for the chosen language load on demand.

   30 languages is too many for a row of pills, so this is a native <select>:
   it gets the platform's own scrolling, type-to-search and keyboard handling
   for free, and on a phone it opens the system wheel. Native names, so you can
   find your language without reading the current one. */
import { useTranslation } from 'react-i18next';
import { CaretDown } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { APP_LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/lib/languages';
import { setAppLanguage } from '@/lib/i18n';

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const active = LANGUAGE_CODES.includes(i18n.resolvedLanguage ?? '')
    ? (i18n.resolvedLanguage as string)
    : DEFAULT_LANGUAGE;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="interface-language"
        className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)"
      >
        <Icon name="character.book.closed.fill" className="size-[14px]" />
        {t('profile.interfaceLanguage')}
      </label>
      <div className="relative">
        <select
          id="interface-language"
          value={active}
          onChange={(e) => void setAppLanguage(e.target.value)}
          className="h-12 w-full appearance-none rounded-2xl border border-(--color-auth-field-border) bg-white px-4 pr-11 text-[15px] font-semibold text-(--color-primary-blue-dark) focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
        >
          {APP_LANGUAGES.map((lng) => (
            <option key={lng.code} value={lng.code} lang={lng.code}>
              {lng.nativeName}
            </option>
          ))}
        </select>
        <CaretDown
          size={16}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-(--color-text-secondary)"
        />
      </div>
    </div>
  );
};
