import { useEffect, useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CaretLeft, UserCircle } from '@phosphor-icons/react';

import { AuthBackground, type BlobSpec } from '@/components/auth/AuthBackground';
import { AuthField } from '@/components/auth/AuthField';
import { AuthIconGradientDefs } from '@/components/auth/AuthIconGradientDefs';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { isValidEmail, signInSchema, signUpSchema, type SignInValues } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore, waitForAuthReady } from '@/stores/sessionStore';

export const Route = createFileRoute('/auth')({
  beforeLoad: async () => {
    await waitForAuthReady();
    const state = useSessionStore.getState().state;
    if (state.kind === 'authenticated') throw redirect({ to: '/home' });
    if (state.kind === 'emailVerificationRequired') throw redirect({ to: '/verify-email' });
  },
  component: AuthScreen,
});

/* Port of WordAround/Features/Auth/Views/AuthView.swift. Matches iOS
   behavior: one centered error/info message (not per-field errors), and
   "Create Account" submits the same email+password via signUp. */

const BLOBS: BlobSpec[] = [
  { color: '#F2DBA1', width: 240, height: 270, rotation: 18, x: 180, y: -320 },
  { color: '#D1E3D9', width: 150, height: 170, rotation: -14, x: 180, y: 300, opacity: 0.55 },
  { color: '#D4DEF5', width: 150, height: 170, rotation: 20, x: -180, y: 250, opacity: 0.5 },
  { color: '#EBD1DE', width: 120, height: 140, rotation: -18, x: -175, y: -40, opacity: 0.42 },
];

function AuthScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, getValues } = useForm<SignInValues>({
    defaultValues: { email: '', password: '' },
  });

  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.errorMessage);
  const infoMessage = useAuthStore((s) => s.infoMessage);
  const sessionState = useSessionStore((s) => s.state);

  /* iOS-style validation: a single message key shown centered above the
     Sign In button; Firebase errors from the store share the same slot. */
  const [validationKey, setValidationKey] = useState<string | null>(null);
  const errorKey = validationKey ?? storeError;

  /* iOS spins up a fresh view model per screen — start with a clean slate. */
  useEffect(() => {
    useAuthStore.getState().clearMessages();
  }, []);

  /* Leave the screen once the session lands in a signed-in state. */
  useEffect(() => {
    if (sessionState.kind === 'authenticated') {
      void navigate({ to: '/home' });
    } else if (sessionState.kind === 'emailVerificationRequired') {
      void navigate({ to: '/verify-email' });
    }
  }, [sessionState, navigate]);

  const handleSignIn = () => {
    setValidationKey(null);
    const parsed = signInSchema.safeParse(getValues());
    if (!parsed.success) {
      useAuthStore.getState().clearMessages();
      setValidationKey(parsed.error.issues[0].message);
      return;
    }
    void useAuthStore.getState().signIn(parsed.data.email, parsed.data.password);
  };

  const handleSignUp = () => {
    setValidationKey(null);
    const parsed = signUpSchema.safeParse(getValues());
    if (!parsed.success) {
      useAuthStore.getState().clearMessages();
      setValidationKey(parsed.error.issues[0].message);
      return;
    }
    void useAuthStore.getState().signUp(parsed.data.email, parsed.data.password);
  };

  const handleGoogle = () => {
    setValidationKey(null);
    void useAuthStore.getState().signInWithGoogle();
  };

  const handleForgotPassword = () => {
    setValidationKey(null);
    useAuthStore.getState().clearMessages();
    const email = getValues('email').trim();
    if (!email) {
      setValidationKey('errors.emailFirst');
      return;
    }
    if (!isValidEmail(email)) {
      setValidationKey('errors.emailInvalid');
      return;
    }
    void useAuthStore.getState().resetPassword(email);
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#F5F5FB]">
      <AuthIconGradientDefs />
      <AuthBackground blobs={BLOBS} />

      <button
        type="button"
        onClick={() => void navigate({ to: '/onboarding' })}
        aria-label={t('auth.back')}
        className="fixed top-5 left-5 z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/90 text-(--color-auth-title) shadow-[0_3px_6px_rgba(0,0,0,0.04)]"
      >
        <CaretLeft size={18} weight="bold" />
      </button>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-7">
        <div className="h-[50px] shrink-0" />

        {/* Header */}
        <div className="flex flex-col items-center gap-[18px] text-center">
          <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-white/85 shadow-[0_6px_12px_rgba(0,0,0,0.04)]">
            <UserCircle size={72} weight="fill" className="auth-icon-gradient" />
          </div>
          <div className="flex flex-col gap-2.5">
            <h1 className="text-[34px] font-bold text-(--color-auth-title)">
              {t('auth.welcomeBack')}
            </h1>
            <p className="text-[17px] font-medium text-(--color-auth-subtitle)">
              {t('auth.subtitle')}
            </p>
          </div>
        </div>

        {/* Form */}
        {/* noValidate: validation copy must come from our zod rules (iOS
            parity), not the browser's native email tooltip. */}
        <form
          noValidate
          className="mt-9 flex flex-col gap-[18px]"
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }}
        >
          <AuthField
            label={t('auth.email')}
            icon="envelope"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder={t('auth.emailPlaceholder')}
            {...register('email')}
          />
          <AuthField
            label={t('auth.password')}
            icon="lock"
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            {...register('password')}
          />

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isLoading}
              className="text-[14px] font-semibold text-(--color-auth-blue)"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>

          {/* Actions */}
          <div className="mt-2.5 flex flex-col gap-[18px]">
            {errorKey && (
              <p role="alert" className="text-center text-[14px] font-medium text-[#FF3B30]">
                {t(errorKey)}
              </p>
            )}
            {infoMessage && (
              <p className="text-center text-[14px] font-medium text-[#34C759]">
                {t(infoMessage)}
              </p>
            )}

            <PrimaryButton
              isLoading={isLoading}
              loadingLabel={t('auth.signingIn')}
              className="h-16 w-full text-[22px]"
            >
              {t('auth.signIn')}
            </PrimaryButton>

            <GoogleButton
              label={t('auth.continueWithGoogle')}
              onClick={handleGoogle}
              disabled={isLoading}
            />

            <button
              type="button"
              onClick={handleSignUp}
              disabled={isLoading}
              className="mx-auto text-[16px] font-semibold text-(--color-auth-blue)"
            >
              {t('auth.createAccount')}
            </button>
          </div>
        </form>

        <div className="min-h-9 grow" />
      </div>
    </main>
  );
}
