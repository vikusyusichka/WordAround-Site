/* /profile — web port of Features/Profile/Views/ProfileView.swift.

   Same composition as iOS, top to bottom: the identity card with the avatar and
   an Edit button, two summary tiles, ACCOUNT, SUPPORT and a DANGER ZONE card in
   red. The three ACCOUNT rows are real routes rather than pushed screens, so
   each one has a URL, a back button and a place in history.

   The "Create a password" card between ACCOUNT and SUPPORT has no iOS
   counterpart: a Google-created account has no password at all on the web, so
   the email/password fields on the sign-in screen can never work for it until
   one is linked. It stays.

   ⚠️ Named `profile.index.tsx`, not `profile.tsx` — a flat route with children
   below it becomes a layout without an <Outlet/> and renders nothing. */
import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { SurfaceCard } from '@/components/primitives/SurfaceCard';
import { ProfileStatCard } from '@/components/profile/ProfileStatCard';
import { SectionTitle } from '@/components/profile/SectionTitle';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { AuthField } from '@/components/auth/AuthField';
import { AuthMessages } from '@/components/auth/AuthMessages';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { PASSWORD_MIN, setPasswordSchema, type SetPasswordValues } from '@/lib/authValidation';
import { languageByCode } from '@/lib/languages';
import { PRIVACY_URL, TERMS_URL } from '@/lib/profileLinks';
import { initialsFrom } from '@/lib/profileStats';
import { enabledCount } from '@/lib/webNotifications';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useAuthStore } from '@/stores/authStore';
import { usePreferences } from '@/stores/preferencesStore';
import { useSessionStore } from '@/stores/sessionStore';

export const Route = createFileRoute('/_authed/profile/')({
  component: ProfilePage,
});

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const currentEmail = useSessionStore((s) => s.currentEmail);
  const currentName = useSessionStore((s) => s.currentName);
  const hasPassword = useSessionStore((s) => s.hasPassword);
  const photoURL = useSessionStore((s) =>
    s.state.kind === 'authenticated' ? s.state.user.photoURL : null,
  );
  const signOut = useSessionStore((s) => s.signOut);

  const preferences = usePreferences();
  const stats = useProfileStats();

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);

  const notificationCount = enabledCount(preferences);
  const activeLanguage = languageByCode(i18n.resolvedLanguage);

  return (
    <ContentContainer>
      <PageHeader title={t('home.title.profile')} subtitle={t('profile.subtitle')} />

      <div className="flex max-w-[760px] flex-col gap-[18px]">
        {/* Identity */}
        <SurfaceCard>
          <div className="flex items-center gap-4 p-[18px]">
            <ProfileAvatar
              size={72}
              color={preferences.avatarColor}
              initials={initialsFrom(currentName, currentEmail)}
              photoURL={photoURL}
            />

            <div className="flex min-w-0 flex-col gap-1">
              <span
                className={`truncate text-[18px] font-black ${
                  currentName
                    ? 'text-(--color-primary-blue-dark)'
                    : 'text-(--color-text-secondary)'
                }`}
              >
                {currentName ?? t('profile.addName')}
              </span>
              <span className="truncate text-[13px] font-semibold text-(--color-text-secondary)">
                {currentEmail}
              </span>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-(--color-primary-blue-solid) px-3.5 py-2 text-[13px] font-bold text-white shadow-[0_5px_10px_rgba(43,92,250,0.20)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Icon name="pencil" className="size-[11px]" />
                {t('profile.edit.button')}
              </button>
            </div>
          </div>
        </SurfaceCard>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <ProfileStatCard
            icon="clock.fill"
            value={t('profile.stat.minutes', { value: stats.practiceMinutes })}
            label={t('profile.stat.practiceTime')}
          />
          <ProfileStatCard
            icon="calendar"
            value={stats.memberSince}
            label={t('profile.stat.memberSince')}
          />
        </div>

        {/* Account */}
        <section className="flex flex-col gap-2">
          <SectionTitle>{t('profile.section.account')}</SectionTitle>
          <SurfaceCard>
            <SettingsRow
              icon="globe"
              title={t('profile.row.language')}
              trailing={activeLanguage?.nativeName}
              showsDivider
              onClick={() => void navigate({ to: '/profile/language' })}
            />
            <SettingsRow
              icon="paintbrush.fill"
              title={t('profile.row.appearance')}
              trailing={t(`profile.appearance.${preferences.theme}`)}
              showsDivider
              onClick={() => void navigate({ to: '/profile/appearance' })}
            />
            <SettingsRow
              icon="bell.fill"
              title={t('profile.row.notifications')}
              trailing={notificationCount === null ? null : String(notificationCount)}
              onClick={() => void navigate({ to: '/profile/notifications' })}
            />
          </SurfaceCard>
        </section>

        {!hasPassword && <SetPasswordCard />}

        {/* Support */}
        <section className="flex flex-col gap-2">
          <SectionTitle>{t('profile.section.support')}</SectionTitle>
          <SurfaceCard>
            <SettingsRow
              icon="hand.raised.fill"
              title={t('profile.row.privacy')}
              href={PRIVACY_URL}
              showsDivider
            />
            <SettingsRow icon="doc.text.fill" title={t('profile.row.terms')} href={TERMS_URL} />
          </SurfaceCard>
        </section>

        {/* Danger zone */}
        <section className="flex flex-col gap-2">
          <SectionTitle tone="danger">{t('profile.section.danger')}</SectionTitle>
          <SurfaceCard accent="var(--color-profile-danger)" blobOpacity={0.07}>
            <SettingsRow
              icon="rectangle.portrait.and.arrow.right"
              title={t('profile.row.signOut')}
              tone="danger"
              showsDivider
              onClick={() => setIsConfirmingSignOut(true)}
            />
            <SettingsRow
              icon="trash.fill"
              title={t('profile.row.deleteAccount')}
              tone="danger"
              onClick={() => setIsConfirmingDelete(true)}
            />
          </SurfaceCard>
        </section>
      </div>

      <EditProfileDialog
        open={isEditing}
        email={currentEmail}
        displayName={currentName ?? ''}
        photoURL={photoURL}
        onClose={() => setIsEditing(false)}
      />

      {isConfirmingSignOut && (
        <ConfirmDialog
          title={t('profile.signOut.title')}
          body={t('profile.signOut.message')}
          confirmLabel={t('profile.signOut.confirm')}
          onConfirm={() => {
            setIsConfirmingSignOut(false);
            void signOut();
          }}
          onCancel={() => setIsConfirmingSignOut(false)}
        />
      )}

      {/* Two steps, as iOS does: an alert that explains, then a sheet that
          makes you type the word. */}
      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('profile.delete.title')}
          body={t('profile.delete.firstMessage')}
          confirmLabel={t('profile.delete.continue')}
          onConfirm={() => {
            setIsConfirmingDelete(false);
            setIsDeleteSheetOpen(true);
          }}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}

      <DeleteAccountDialog
        open={isDeleteSheetOpen}
        onClose={() => setIsDeleteSheetOpen(false)}
      />
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
    <SurfaceCard>
      <div className="flex flex-col gap-5 p-6">
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
    </SurfaceCard>
  );
}
