/* /profile/appearance — port of AppearanceView.swift.

   Three rows, each with a 44px tinted icon circle, a name, a one-line hint and
   a checkmark. Dark is DISABLED with a "Coming soon" badge: the site has no
   dark palette yet, and offering a switch that leaves everything white would
   be worse than saying so. The setting itself is already stored and applied
   (see src/lib/appearance.ts), so the dark phase only has to add colours. */
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileSubScreenLayout } from '@/components/profile/ProfileSubScreenLayout';
import { APPEARANCE_THEMES, type AppearanceTheme } from '@/lib/appearance';
import { usePreferences } from '@/stores/preferencesStore';

export const Route = createFileRoute('/_authed/profile/appearance')({
  component: AppearanceScreen,
});

const THEME_META: Record<AppearanceTheme, { icon: string; tint: string }> = {
  system: { icon: 'circle.lefthalf.filled', tint: 'var(--color-primary-blue)' },
  light: { icon: 'sun.max.fill', tint: 'var(--color-appearance-light)' },
  dark: { icon: 'moon.fill', tint: 'var(--color-appearance-dark)' },
};

function AppearanceScreen() {
  const { t } = useTranslation();
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);

  return (
    <ProfileSubScreenLayout
      active="appearance"
      title={t('profile.appearance.title')}
      subtitle={t('profile.appearance.subtitle')}
    >
      <ul className="flex flex-col gap-2.5">
        {APPEARANCE_THEMES.map((option) => {
          const meta = THEME_META[option];
          const isActive = theme === option;
          const isDisabled = option === 'dark';

          return (
            <li key={option}>
              <ProfileCard className={isDisabled ? 'opacity-60' : ''}>
                <button
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isActive}
                  onClick={() => setTheme(option)}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors enabled:hover:bg-(--color-primary-blue)/[0.04] disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full"
                    style={{ background: `color-mix(in srgb, ${meta.tint} 14%, transparent)` }}
                  >
                    <Icon name={meta.icon} className="size-[17px]" style={{ color: meta.tint }} />
                  </span>

                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[16px] font-bold text-(--color-primary-blue-dark)">
                        {t(`profile.appearance.${option}`)}
                      </span>
                      {isDisabled && (
                        <span className="rounded-full bg-(--color-primary-blue)/10 px-2 py-0.5 text-[10px] font-black tracking-[0.5px] uppercase text-(--color-primary-blue)">
                          {t('profile.appearance.comingSoon')}
                        </span>
                      )}
                    </span>
                    <span className="text-[12px] leading-[1.45] font-semibold text-(--color-text-secondary)">
                      {t(`profile.appearance.${option}Hint`)}
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

      <p className="flex items-start gap-2.5 rounded-2xl bg-(--color-primary-blue)/[0.06] px-3.5 py-3 text-[12px] leading-[1.6] font-semibold text-(--color-text-secondary)">
        <Icon
          name="info.circle.fill"
          aria-hidden
          className="mt-px size-[13px] shrink-0 text-(--color-primary-blue)/70"
        />
        {t('profile.appearance.note')}
      </p>
    </ProfileSubScreenLayout>
  );
}
