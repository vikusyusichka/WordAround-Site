/* Interface-language picker. Without this the app language is whatever the
   browser reports, with no way back — so the translations are only reachable
   for some users. The choice persists via i18next's localStorage detector
   (`wa.lang`). Native names, so you can find your language without reading
   the current one. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { supportedLngs, type SupportedLng } from '@/lib/i18n';

const NATIVE_NAME: Record<SupportedLng, string> = {
  en: 'English',
  uk: 'Українська',
  pl: 'Polski',
  de: 'Deutsch',
};

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const active = (supportedLngs as readonly string[]).includes(i18n.resolvedLanguage ?? '')
    ? (i18n.resolvedLanguage as SupportedLng)
    : 'en';

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
        <Icon name="character.book.closed.fill" className="size-[14px]" />
        {t('profile.interfaceLanguage')}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {supportedLngs.map((lng) => {
          const selected = lng === active;
          return (
            <button
              key={lng}
              type="button"
              lang={lng}
              aria-pressed={selected}
              onClick={() => void i18n.changeLanguage(lng)}
              className={`h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
                selected
                  ? 'border-(--color-home-brand) bg-(--color-goal-bg) text-(--color-primary-blue-dark)'
                  : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary) hover:bg-black/[0.03]'
              }`}
            >
              {NATIVE_NAME[lng]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
