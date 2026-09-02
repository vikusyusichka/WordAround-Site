import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { AuthDivider } from '@/components/auth/AuthDivider';
import { AuthField } from '@/components/auth/AuthField';
import { AuthMessages } from '@/components/auth/AuthMessages';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { redirectIfSignedIn } from '@/lib/authGuards';
import { PASSWORD_MIN, signUpSchema, type SignUpValues } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/authStore';
import { takeRedirectErrorKey, useSessionStore } from '@/stores/sessionStore';

export const Route = createFileRoute('/auth/sign-up')({
  beforeLoad: redirectIfSignedIn,
  component: SignUpScreen,
});

function SignUpScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const isLoading = useAuthStore((s) => s.isLoading);
  const errorMessage = useAuthStore((s) => s.errorMessage);
  const infoMessage = useAuthStore((s) => s.infoMessage);
  const sessionState = useSessionStore((s) => s.state);

  useEffect(() => {
    const store = useAuthStore.getState();
    store.clearMessages();
    const redirectError = takeRedirectErrorKey();
    if (redirectError) store.setErrorKey(redirectError);
  }, []);

  useEffect(() => {
    if (sessionState.kind === 'authenticated') {
      void navigate({ to: '/home' });
    } else if (sessionState.kind === 'emailVerificationRequired') {
      void navigate({ to: '/verify-email' });
    }
  }, [sessionState, navigate]);

  const onSubmit = handleSubmit((values) => {
    void useAuthStore.getState().signUp(values.name, values.email, values.password);
  });

  const handleGoogle = () => {
    void useAuthStore.getState().signInWithGoogle();
  };

  return (
    <>
      <AuthTabs active="signUp" />

      <div className="flex flex-col gap-2">
        <h1 className="text-[30px] font-extrabold text-(--color-auth-title) lg:text-[32px]">
          {t('auth.signUpTitle')}
        </h1>
        <p className="text-[16px] font-semibold text-(--color-auth-subtitle)">
          {t('auth.signUpSubtitle')}
        </p>
      </div>

      <GoogleButton
        label={t('auth.signUpWithGoogle')}
        onClick={handleGoogle}
        disabled={isLoading}
      />

      <AuthDivider />

      <form noValidate className="flex flex-col gap-[18px]" onSubmit={onSubmit}>
        <AuthField
          label={t('auth.name')}
          icon="person"
          type="text"
          autoComplete="name"
          placeholder={t('auth.namePlaceholder')}
          error={errors.name?.message ? t(errors.name.message) : undefined}
          {...register('name')}
        />
        <AuthField
          label={t('auth.email')}
          icon="envelope"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder={t('auth.emailPlaceholder')}
          error={errors.email?.message ? t(errors.email.message) : undefined}
          {...register('email')}
        />
        <div className="flex flex-col gap-2">
          <AuthField
            label={t('auth.password')}
            icon="lock"
            type="password"
            /* new-password, so the browser's password manager offers to
               generate one instead of filling the old one in. */
            autoComplete="new-password"
            placeholder={t('auth.passwordPlaceholder')}
            error={errors.password?.message ? t(errors.password.message) : undefined}
            {...register('password')}
          />
          {!errors.password && (
            <span className="text-[13px] font-semibold text-(--color-muted-text)">
              {t('auth.passwordHint', { min: PASSWORD_MIN })}
            </span>
          )}
        </div>

        <AuthMessages errorKey={errorMessage} infoKey={infoMessage} />

        <PrimaryButton
          isLoading={isLoading}
          loadingLabel={t('auth.creatingAccount')}
          className="h-16 w-full text-[21px]"
        >
          {t('auth.createAccount')}
        </PrimaryButton>
      </form>
    </>
  );
}
