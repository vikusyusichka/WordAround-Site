import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Envelope } from '@phosphor-icons/react';

import { AuthBackground, type BlobSpec } from '@/components/auth/AuthBackground';
import { AuthIconGradientDefs } from '@/components/auth/AuthIconGradientDefs';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore, waitForAuthReady } from '@/stores/sessionStore';

export const Route = createFileRoute('/verify-email')({
  beforeLoad: async () => {
    await waitForAuthReady();
    const state = useSessionStore.getState().state;
    if (state.kind === 'loggedOut') throw redirect({ to: '/auth' });
    if (state.kind === 'authenticated') throw redirect({ to: '/home' });
  },
  component: VerifyEmailScreen,
});

/* Port of WordAround/Features/Auth/Views/VerifyEmailView.swift. */

const BLOBS: BlobSpec[] = [
  { color: '#F2DBA1', width: 250, height: 285, rotation: 16, x: 180, y: -320 },
  { color: '#D1E3D9', width: 150, height: 170, rotation: -12, x: 175, y: 305, opacity: 0.55 },
  { color: '#D4DEF5', width: 155, height: 175, rotation: 18, x: -178, y: 250, opacity: 0.5 },
  { color: '#EBD1DE', width: 125, height: 145, rotation: -20, x: -170, y: -45, opacity: 0.42 },
];

const BADGES = [
  { key: 'verify.badgeInbox', color: '#FAC980', x: -140, y: -14, delay: 0 },
  { key: 'verify.badgeConfirm', color: '#A8D6B8', x: 108, y: -22, delay: 0.45 },
  { key: 'verify.badgeDone', color: '#B8C9FA', x: 82, y: 72, delay: 0.9 },
];

function VerifyEmailScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isLoading = useAuthStore((s) => s.isLoading);
  const errorMessage = useAuthStore((s) => s.errorMessage);
  const infoMessage = useAuthStore((s) => s.infoMessage);
  const sessionState = useSessionStore((s) => s.state);
  const currentEmail = useSessionStore((s) => s.currentEmail);

  /* iOS spins up a fresh view model per screen — start with a clean slate so
     messages from the auth screen don't carry over. */
  useEffect(() => {
    useAuthStore.getState().clearMessages();
  }, []);

  useEffect(() => {
    if (sessionState.kind === 'authenticated') {
      void navigate({ to: '/home' });
    } else if (sessionState.kind === 'loggedOut') {
      void navigate({ to: '/auth' });
    }
  }, [sessionState, navigate]);

  const displayEmail =
    auth.currentUser?.email ||
    (currentEmail !== 'Unknown account' ? currentEmail : '') ||
    t('verify.fallbackEmail');

  const handleUseAnotherAccount = () => {
    useAuthStore.getState().clearMessages();
    void useSessionStore.getState().signOut();
  };

  const steps = [t('verify.step1'), t('verify.step2'), t('verify.step3')];

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#F5F5FB]">
      <AuthIconGradientDefs />
      <AuthBackground blobs={BLOBS} />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-7">
        <div className="h-14 shrink-0" />

        {/* Hero: pulsing envelope + floating badges */}
        <div className="flex flex-col items-center gap-[18px] text-center">
          <div className="relative flex h-[182px] w-full items-center justify-center">
            {BADGES.map((badge) => (
              <span
                key={badge.key}
                className="absolute top-1/2 left-1/2 rounded-full px-3.5 py-[9px] text-[13px] font-bold whitespace-nowrap text-white"
                style={
                  {
                    backgroundColor: badge.color,
                    boxShadow: `0 5px 8px ${badge.color}38`,
                    '--bx': `${badge.x}px`,
                    '--by': `${badge.y}px`,
                    animation: 'wa-badge-float 1.9s ease-in-out infinite alternate',
                    animationDelay: `${badge.delay}s`,
                    /* Start collapsed even during the animation-delay window. */
                    opacity: 0.15,
                    transform: 'translate(-50%, -50%) translate(0, 6px) scale(0.82)',
                  } as CSSProperties
                }
              >
                {t(badge.key)}
              </span>
            ))}

            <div className="relative -ml-1.5 flex h-[130px] w-[130px] items-center justify-center rounded-full bg-white/88 shadow-[0_8px_16px_rgba(0,0,0,0.05)]">
              <div
                className="absolute h-[100px] w-[100px] rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #E0F0FF, #ffffff)',
                  animation: 'wa-pulse-disc 1.8s ease-in-out infinite alternate',
                }}
              />
              <div
                className="absolute h-[112px] w-[112px] rounded-full border-2 border-white/80"
                style={{ animation: 'wa-pulse-ring 1.8s ease-in-out infinite alternate' }}
              />
              <div
                className="relative"
                style={{ animation: 'wa-pulse-icon 1.6s ease-in-out infinite alternate' }}
              >
                <Envelope size={56} weight="fill" className="auth-icon-gradient" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <h1 className="text-[34px] font-bold text-(--color-auth-title)">
              {t('verify.title')}
            </h1>
            <p className="text-[17px] font-medium text-(--color-auth-subtitle)">
              {t('verify.subtitle')}
            </p>
          </div>
        </div>

        {/* Content card */}
        <div className="mt-[26px] flex flex-col gap-[18px]">
          <div className="flex flex-col gap-3.5 rounded-[28px] border border-(--color-auth-field-border) bg-white/88 px-[18px] py-[22px] text-center shadow-[0_6px_10px_rgba(0,0,0,0.03)]">
            <p className="text-[16px] font-medium text-(--color-auth-subtitle)">
              {t('verify.sentTo')}
            </p>
            <p className="px-2 text-[20px] font-bold break-words text-black">{displayEmail}</p>

            <div className="mt-1.5 flex flex-col gap-2">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 text-left">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E0F0FF] text-[14px] font-bold text-[#3D7AE6]">
                    {index + 1}
                  </span>
                  <span className="text-[15px] font-medium text-[#5C6680]">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-[18px] border border-red-500/18 bg-red-500/12 px-4 py-3.5 text-center text-[14px] font-medium text-[#FF3B30]"
            >
              {t(errorMessage)}
            </p>
          )}
          {infoMessage && (
            <p className="rounded-[18px] border border-[#6BC794]/22 bg-[#6BC794]/14 px-4 py-3.5 text-center text-[14px] font-medium text-[#389461]">
              {t(infoMessage)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-col items-center gap-4 pb-9">
          <PrimaryButton
            type="button"
            onClick={() => void useAuthStore.getState().checkVerification()}
            isLoading={isLoading}
            loadingLabel={t('verify.checking')}
            className="h-16 w-full text-[22px]"
          >
            {t('verify.checkButton')}
          </PrimaryButton>

          <button
            type="button"
            onClick={() => void useAuthStore.getState().resendVerification()}
            disabled={isLoading}
            className="h-[54px] w-full rounded-full border border-(--color-auth-field-border) bg-white/94 text-[16px] font-semibold text-(--color-auth-blue) transition-transform active:scale-[0.98]"
          >
            {t('verify.resend')}
          </button>

          <button
            type="button"
            onClick={handleUseAnotherAccount}
            disabled={isLoading}
            className="pt-1 text-[17px] font-bold text-(--color-auth-blue)"
          >
            {t('verify.useAnotherAccount')}
          </button>
        </div>

        <div className="grow" />
      </div>
    </main>
  );
}
