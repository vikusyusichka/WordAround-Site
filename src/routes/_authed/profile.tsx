import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { LanguageSwitcher } from '@/components/shell/LanguageSwitcher';
import { useSessionStore } from '@/stores/sessionStore';

export const Route = createFileRoute('/_authed/profile')({
  component: ProfilePage,
});

/* Minimal real profile — shows the signed-in email and a working sign-out.
   The full profile/settings screen lands in a later phase. */
function ProfilePage() {
  const { t } = useTranslation();
  const currentEmail = useSessionStore((s) => s.currentEmail);
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <ContentContainer>
      <PageHeader title={t('home.title.profile')} subtitle={currentEmail} />

      <div className="flex max-w-md flex-col gap-5 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <Icon name="person.crop.circle.fill" className="home-avatar-gradient size-11" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] font-bold text-(--color-primary-blue-dark)">
              {currentEmail}
            </span>
          </div>
        </div>

        <div className="h-px bg-(--color-auth-field-border)" />

        <LanguageSwitcher />

        <div className="h-px bg-(--color-auth-field-border)" />

        <button
          type="button"
          onClick={() => void signOut()}
          className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white text-[15px] font-semibold text-(--color-cs-red) transition-colors hover:bg-(--color-cs-soft-red) focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </ContentContainer>
  );
}
