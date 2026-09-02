import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { LanguageSwitcher } from '@/components/shell/LanguageSwitcher';
import { AuthField } from '@/components/auth/AuthField';
import { AuthMessages } from '@/components/auth/AuthMessages';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { PASSWORD_MIN, setPasswordSchema, type SetPasswordValues } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';

export const Route = createFileRoute('/_authed/profile')({
  component: ProfilePage,
});

/* Minimal real profile — the account identity, a working sign-out, and the
   one place a Google-created account can gain a password.
   The full profile/settings screen lands in a later phase. */
function ProfilePage() {
  const { t } = useTranslation();
  const currentEmail = useSessionStore((s) => s.currentEmail);
  const currentName = useSessionStore((s) => s.currentName);
  const hasPassword = useSessionStore((s) => s.hasPassword);
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <ContentContainer>
      <PageHeader title={t('home.title.profile')} subtitle={currentName ?? currentEmail} />

      <div className="flex max-w-md flex-col gap-6">
        <div className="flex flex-col gap-5 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <Icon name="person.crop.circle.fill" className="home-avatar-gradient size-11" />
            </span>
            <div className="flex min-w-0 flex-col">
              {currentName && (
                <span className="truncate text-[17px] font-bold text-(--color-primary-blue-dark)">
                  {currentName}
                </span>
              )}
              <span className="truncate text-[15px] font-semibold text-(--color-text-secondary)">
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

        {!hasPassword && <SetPasswordCard />}
      </div>
    </ContentContainer>
  );
}

/* An account created through Google has no password at all, so the email +
   password fields on the sign-in screen can never work for it. This links one
   on, leaving Google sign-in working exactly as before. */
function SetPasswordCard() {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const isLoading = useAuthStore((s) => s.isLoading);
  const errorMessage = useAuthStore((s) => s.errorMessage);
  const infoMessage = useAuthStore((s) => s.infoMessage);

  useEffect(() => {
    useAuthStore.getState().clearMessages();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    await useAuthStore.getState().setPassword(values.password);
    if (!useAuthStore.getState().errorMessage) reset();
  });

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-2">
        <h2 className="text-[18px] font-bold text-(--color-primary-blue-dark)">
          {t('profile.password.title')}
        </h2>
        <p className="text-[14px] leading-[1.45] font-medium text-(--color-text-secondary)">
          {t('profile.password.body')}
        </p>
      </div>

      <form noValidate className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
        <AuthField
          label={t('action.newPassword')}
          icon="lock"
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.passwordPlaceholder')}
          error={errors.password?.message ? t(errors.password.message) : undefined}
          {...register('password')}
        />
        <AuthField
          label={t('action.confirmPassword')}
          icon="lock"
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.passwordPlaceholder')}
          error={errors.confirm?.message ? t(errors.confirm.message) : undefined}
          {...register('confirm')}
        />

        {!errors.password && (
          <span className="text-[13px] font-semibold text-(--color-muted-text)">
            {t('auth.passwordHint', { min: PASSWORD_MIN })}
          </span>
        )}

        <AuthMessages errorKey={errorMessage} infoKey={infoMessage} />

        <PrimaryButton
          isLoading={isLoading}
          loadingLabel={t('profile.password.saving')}
          className="h-14 w-full text-[17px]"
        >
          {t('profile.password.save')}
        </PrimaryButton>
      </form>
    </div>
  );
}
