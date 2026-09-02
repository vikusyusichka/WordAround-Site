import { useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
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
import { isValidEmail, signInSchema, type SignInValues } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/authStore';
import { takeRedirectErrorKey, useSessionStore } from '@/stores/sessionStore';

export const Route = createFileRoute('/auth/sign-in')({
  beforeLoad: redirectIfSignedIn,
  component: SignInScreen,
});

function SignInScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const isLoading = useAuthStore((s) => s.isLoading);
  const errorMessage = useAuthStore((s) => s.errorMessage);
  const infoMessage = useAuthStore((s) => s.infoMessage);
  const sessionState = useSessionStore((s) => s.state);

  /* Fresh slate on mount — plus whatever a Google redirect left behind while
     nothing was mounted to show it. */
  useEffect(() => {
    const store = useAuthStore.getState();
    store.clearMessages();
    const redirectError = takeRedirectErrorKey();
    if (redirectError) store.setErrorKey(redirectError);
  }, []);

  /* Leave the screen once the session lands in a signed-in state. */
  useEffect(() => {
    if (sessionState.kind === 'authenticated') {
      void navigate({ to: '/home' });
    } else if (sessionState.kind === 'emailVerificationRequired') {
      void navigate({ to: '/verify-email' });
    }
  }, [sessionState, navigate]);

  const onSubmit = handleSubmit((values) => {
    void useAuthStore.getState().signIn(values.email, values.password);
  });

  const handleGoogle = () => {
    void useAuthStore.getState().signInWithGoogle();
  };

  /* Reset works off whatever is typed in the email field — there is no
     separate screen for it, same as the iOS app. */
  const handleForgotPassword = () => {
    const store = useAuthStore.getState();
    store.clearMessages();
    const email = getValues('email').trim();
    if (!email) {
      store.setErrorKey('errors.emailFirst');
      return;
    }
    if (!isValidEmail(email)) {
      store.setErrorKey('errors.emailInvalid');
      return;
    }
    void store.resetPassword(email);
  };

  return (
    <>
      <AuthTabs active="signIn" />

      <div className="flex flex-col gap-2">
        <h1 className="text-[30px] font-extrabold text-(--color-auth-title) lg:text-[32px]">
          {t('auth.welcomeBack')}
        </h1>
        <p className="text-[16px] font-semibold text-(--color-auth-subtitle)">
          {t('auth.subtitle')}
        </p>
      </div>

      <GoogleButton
        label={t('auth.continueWithGoogle')}
        onClick={handleGoogle}
        disabled={isLoading}
      />

      <AuthDivider />

      {/* noValidate: validation copy comes from our zod rules, not the
          browser's native email tooltip. */}
      <form noValidate className="flex flex-col gap-[18px]" onSubmit={onSubmit}>
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
        <AuthField
          label={t('auth.password')}
          icon="lock"
          type="password"
          autoComplete="current-password"
          placeholder={t('auth.passwordPlaceholder')}
          error={errors.password?.message ? t(errors.password.message) : undefined}
          {...register('password')}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isLoading}
            className="text-[14px] font-bold text-(--color-auth-blue)"
          >
            {t('auth.forgotPassword')}
          </button>
        </div>

        <AuthMessages errorKey={errorMessage} infoKey={infoMessage} />

        <PrimaryButton
          isLoading={isLoading}
          loadingLabel={t('auth.signingIn')}
          className="h-16 w-full text-[21px]"
        >
          {t('auth.signIn')}
        </PrimaryButton>
      </form>

      <Link
        to="/auth/link"
        className="mx-auto text-[15px] font-bold text-(--color-auth-blue)"
      >
        {t('auth.magicLinkCta')}
      </Link>
    </>
  );
}
