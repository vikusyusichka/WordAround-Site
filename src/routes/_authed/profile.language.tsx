/* /profile/language — port of LanguageSelectionView.swift.

   One card per language: a circle with the language's own code, its native
   name, the code again in small caps, and a checkmark on the active one.

   Two web adaptations. iOS shows a flag emoji in the circle; Windows has no
   flag emoji font at all, so a Windows reader would see two grey letters in a
   box — the language code is legible everywhere and identifies the entry just
   as well. And 30 entries is a long scroll on a phone, so there is a search
   field: iOS gets away without one because the list is a native scroller with
   its own momentum, the web list is not. */
import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileSubScreenLayout } from '@/components/profile/ProfileSubScreenLayout';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES, filterLanguages } from '@/lib/languages';
import { setAppLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/_authed/profile/language')({
  component: LanguageScreen,
});

function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');

  const active = LANGUAGE_CODES.includes(i18n.resolvedLanguage ?? '')
    ? (i18n.resolvedLanguage as string)
    : DEFAULT_LANGUAGE;

  const results = useMemo(() => filterLanguages(query), [query]);

  return (
    <ProfileSubScreenLayout
      active="language"
      title={t('profile.language.title')}
      subtitle={t('profile.language.subtitle')}
    >
      <div className="relative">
        <Icon
          name="magnifyingglass"
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-(--color-text-secondary)"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('profile.language.searchPlaceholder')}
          aria-label={t('profile.language.searchPlaceholder')}
          className="h-12 w-full rounded-2xl border border-(--color-auth-field-border) bg-white pr-4 pl-11 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
        />
      </div>

      {results.length === 0 ? (
        <p className="rounded-2xl bg-(--color-goal-bg) px-5 py-4 text-[14px] font-semibold text-(--color-text-secondary)">
          {t('profile.language.noResults', { query: query.trim() })}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {results.map((language) => {
            const isActive = language.code === active;
            return (
              <li key={language.code}>
                <ProfileCard>
                  <button
                    type="button"
                    lang={language.code}
                    aria-pressed={isActive}
                    onClick={() => void setAppLanguage(language.code)}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-(--color-primary-blue)/[0.04] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-full text-[14px] font-black text-(--color-primary-blue)"
                      style={{
                        background:
                          'color-mix(in srgb, var(--color-primary-blue) 10%, transparent)',
                      }}
                    >
                      {language.code.toUpperCase()}
                    </span>

                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[16px] font-bold text-(--color-primary-blue-dark)">
                        {language.nativeName}
                      </span>
                      <span className="truncate text-[11px] font-bold tracking-[0.6px] text-(--color-text-secondary)">
                        {language.englishName}
                      </span>
                    </span>

                    <span className="ml-auto shrink-0">
                      {isActive ? (
                        <Icon
                          name="checkmark.circle.fill"
                          className="size-[22px] text-(--color-primary-blue)"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="block size-[22px] rounded-full border-[1.5px] border-(--color-primary-blue)/20"
                        />
                      )}
                    </span>
                  </button>
                </ProfileCard>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-start gap-2.5 rounded-2xl bg-(--color-primary-blue)/[0.06] px-3.5 py-3 text-[12px] leading-[1.6] font-semibold text-(--color-text-secondary)">
        <Icon
          name="info.circle.fill"
          aria-hidden
          className="mt-px size-[13px] shrink-0 text-(--color-primary-blue)/70"
        />
        {t('profile.language.note')}
      </p>
    </ProfileSubScreenLayout>
  );
}
