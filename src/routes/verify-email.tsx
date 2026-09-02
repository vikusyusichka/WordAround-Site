import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Envelope } from '@phosphor-icons/react';

import { AuthMessages } from '@/components/auth/AuthMessages';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore, waitForAuthReady } from '@/stores/sessionStore';

export const Route = createFileRoute('/verify-email')({
  beforeLoad: async () => {
    await waitForAuthReady();
    const state = useSessionStore.getState().state;
    if (state.kind === 'loggedOut') throw redirect({ to: '/auth/sign-in' });
    if (state.kind === 'authenticated') throw redirect({ to: '/home' });
  },
  component: VerifyEmailScreen,
});

/* Web version of WordAround/Features/Auth/Views/VerifyEmailView.swift, on the
   shared auth split layout. The "I verified" button stays as a fallback: with
   the console's Action URL pointed at /auth/action the emailed link finishes
   the job on its own and nobody has to come back here at all. */

const BADGES = [
  { key: 'verify.badgeInbox', color: '#FAC980', x: -132, y: -14, delay: 0 },
  { key: 'verify.badgeConfirm', color: '#A8D6B8', x: 108, y: -24, delay: 0.45 },
  { key: 'verify.badgeDone', color: '#B8C9FA', x: 88, y: 72, delay: 0.9 },
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
      void navigate({ to: '/auth/sign-in' });
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
    <AuthSplitLayout>
      {/* Hero: pulsing envelope + floating badges */}
      <div className="relative flex h-[186px] w-full items-center justify-center">
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

        <div className="relative flex h-[142px] w-[142px] items-center justify-center rounded-full bg-[#F7FAFF] shadow-[0_8px_16px_rgba(0,0,0,0.05)]">
          <div
            className="absolute h-[110px] w-[110px] rounded-full"
            style={{
              background: 'linear-gradient(135deg, #E0F0FF, #ffffff)',
              animation: 'wa-pulse-disc 1.8s ease-in-out infinite alternate',
            }}
          />
          <div
            className="absolute h-[122px] w-[122px] rounded-full border-2 border-white/85"
            style={{ animation: 'wa-pulse-ring 1.8s ease-in-out infinite alternate' }}
          />
          <div
            className="relative"
            style={{ animation: 'wa-pulse-icon 1.6s ease-in-out infinite alternate' }}
          >
            <Envelope size={62} weight="fill" className="auth-icon-gradient" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-[30px] font-extrabold text-(--color-auth-title) lg:text-[32px]">
          {t('verify.title')}
        </h1>
        <p className="text-[16px] leading-[1.45] font-semibold text-(--color-auth-subtitle)">
          {t('verify.sentTo')}
        </p>
        <p className="text-[19px] font-bold break-words text-(--color-auth-title)">
          {displayEmail}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[22px] bg-[#F7F9FE] p-[22px]">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3.5">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#E4EDFF] text-[14px] font-bold text-[#3380F5]">
              {index + 1}
            </span>
            <span className="text-[15px] font-semibold text-(--color-auth-label)">{step}</span>
          </div>
        ))}
      </div>

      <AuthMessages errorKey={errorMessage} infoKey={infoMessage} />

      <div className="flex flex-col gap-4">
        <PrimaryButton
          type="button"
          onClick={() => void useAuthStore.getState().checkVerification()}
          isLoading={isLoading}
          loadingLabel={t('verify.checking')}
          className="h-16 w-full text-[21px]"
        >
          {t('verify.checkButton')}
        </PrimaryButton>

        <button
          type="button"
          onClick={() => void useAuthStore.getState().resendVerification()}
          disabled={isLoading}
          className="h-14 w-full rounded-full border border-(--color-auth-field-border) bg-white/95 text-[16px] font-bold text-(--color-auth-title) transition-transform active:scale-[0.98]"
        >
          {t('verify.resend')}
        </button>

        <button
          type="button"
          onClick={handleUseAnotherAccount}
          disabled={isLoading}
          className="mx-auto text-[15px] font-bold text-(--color-auth-blue)"
        >
          {t('verify.useAnotherAccount')}
        </button>
      </div>
    </AuthSplitLayout>
  );
}
