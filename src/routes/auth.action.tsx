import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { AuthField } from '@/components/auth/AuthField';
import { AuthMessages } from '@/components/auth/AuthMessages';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import * as authService from '@/lib/authService';
import { authErrorKey } from '@/lib/authErrors';
import { setPasswordSchema, type SetPasswordValues } from '@/lib/authValidation';
import { useSessionStore } from '@/stores/sessionStore';

/* Landing page for every link Firebase emails: email verification, password
   reset, email recovery and passwordless sign-in. It is deliberately ungated —
   the link is opened signed out as often as signed in.

   Firebase only routes the links here once the console's email templates have
   their Action URL pointed at this path; until then Firebase's own page
   applies the code and sends the user back via `continueUrl`. */

type Phase = 'working' | 'needEmail' | 'resetForm' | 'resetDone' | 'failed';

/* Where a `continueUrl` is allowed to send the user. Anything else — including
   another origin — falls back, so a tampered link can't bounce anyone off-site. */
const CONTINUE_TARGETS = ['/home', '/auth/sign-in', '/verify-email'] as const;
type ContinueTarget = (typeof CONTINUE_TARGETS)[number];

const isContinueTarget = (value: string): value is ContinueTarget =>
  (CONTINUE_TARGETS as readonly string[]).includes(value);

const continueTarget = (raw: string | undefined, fallback: ContinueTarget): ContinueTarget => {
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    return isContinueTarget(parsed.pathname) ? parsed.pathname : fallback;
  } catch {
    return fallback;
  }
};

interface ActionSearch {
  mode?: string;
  oobCode?: string;
  continueUrl?: string;
}

export const Route = createFileRoute('/auth/action')({
  validateSearch: (search: Record<string, unknown>): ActionSearch => ({
    mode: typeof search.mode === 'string' ? search.mode : undefined,
    oobCode: typeof search.oobCode === 'string' ? search.oobCode : undefined,
    continueUrl: typeof search.continueUrl === 'string' ? search.continueUrl : undefined,
  }),
  component: AuthActionScreen,
});

function AuthActionScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mode, oobCode, continueUrl } = Route.useSearch();

  const [phase, setPhase] = useState<Phase>('working');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  /* React 18 mounts effects twice in dev; applying an action code twice would
     fail the second time with "invalid code". */
  const startedRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const fail = (error: unknown) => {
    setErrorKey(authErrorKey(error) ?? 'errors.actionInvalid');
    setPhase('failed');
  };

  const finishSignIn = async (target: ContinueTarget) => {
    await useSessionStore.getState().refreshAuthState();
    void navigate({ to: target });
  };

  const completeLink = async (email: string) => {
    setIsBusy(true);
    try {
      await authService.completeMagicLink(email, window.location.href);
      await finishSignIn(continueTarget(continueUrl, '/home'));
    } catch (error) {
      fail(error);
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        if (authService.isMagicLink(window.location.href)) {
          const remembered = authService.rememberedMagicLinkEmail();
          if (!remembered) {
            setPhase('needEmail');
            return;
          }
          await completeLink(remembered);
          return;
        }

        if (!oobCode) {
          setErrorKey('errors.actionInvalid');
          setPhase('failed');
          return;
        }

        switch (mode) {
          case 'verifyEmail':
          case 'recoverEmail': {
            await authService.applyVerification(oobCode);
            /* The signed-in user still carries the pre-verification token. */
            await authService.reloadUser().catch(() => undefined);
            await finishSignIn(
              continueTarget(continueUrl, mode === 'verifyEmail' ? '/home' : '/auth/sign-in'),
            );
            return;
          }
          case 'resetPassword': {
            setResetEmail(await authService.verifyResetCode(oobCode));
            setPhase('resetForm');
            return;
          }
          default:
            setErrorKey('errors.actionInvalid');
            setPhase('failed');
        }
      } catch (error) {
        fail(error);
      }
    };

    void run();
    /* Runs once for the code in the URL — the guard above makes that explicit. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResetSubmit = handleSubmit(async (values) => {
    if (!oobCode) return;
    setIsBusy(true);
    setErrorKey(null);
    try {
      await authService.completeReset(oobCode, values.password);
      setPhase('resetDone');
    } catch (error) {
      fail(error);
    } finally {
      setIsBusy(false);
    }
  });

  if (phase === 'working') {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <span
          className="h-10 w-10 animate-spin rounded-full border-3 border-(--color-auth-field-border) border-t-(--color-auth-blue)"
          aria-hidden="true"
        />
        <p className="text-[17px] font-semibold text-(--color-auth-subtitle)">
          {t('action.working')}
        </p>
      </div>
    );
  }

  if (phase === 'needEmail') {
    return (
      <>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[28px] font-extrabold text-(--color-auth-title) lg:text-[30px]">
            {t('action.confirmEmailTitle')}
          </h1>
          <p className="text-[16px] leading-[1.45] font-semibold text-(--color-auth-subtitle)">
            {t('action.confirmEmailBody')}
          </p>
        </div>

        <div className="flex flex-col gap-[18px]">
          <AuthField
            label={t('auth.email')}
            icon="envelope"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder={t('auth.emailPlaceholder')}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />

          <AuthMessages errorKey={errorKey} />

          <PrimaryButton
            type="button"
            onClick={() => void completeLink(emailInput)}
            isLoading={isBusy}
            loadingLabel={t('action.working')}
            className="h-16 w-full text-[21px]"
          >
            {t('action.continue')}
          </PrimaryButton>
        </div>
      </>
    );
  }

  if (phase === 'resetForm') {
    return (
      <>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[28px] font-extrabold text-(--color-auth-title) lg:text-[30px]">
            {t('action.resetTitle')}
          </h1>
          <p className="text-[16px] leading-[1.45] font-semibold text-(--color-auth-subtitle)">
            {t('action.resetSubtitle')}
          </p>
          {resetEmail && (
            <p className="text-[17px] font-bold break-words text-(--color-auth-title)">
              {resetEmail}
            </p>
          )}
        </div>

        <form
          noValidate
          className="flex flex-col gap-[18px]"
          onSubmit={(e) => void onResetSubmit(e)}
        >
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

          <AuthMessages errorKey={errorKey} />

          <PrimaryButton
            isLoading={isBusy}
            loadingLabel={t('action.working')}
            className="h-16 w-full text-[21px]"
          >
            {t('action.savePassword')}
          </PrimaryButton>
        </form>
      </>
    );
  }

  if (phase === 'resetDone') {
    return (
      <>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[28px] font-extrabold text-(--color-auth-title) lg:text-[30px]">
            {t('action.resetDoneTitle')}
          </h1>
          <p className="text-[16px] leading-[1.45] font-semibold text-(--color-auth-subtitle)">
            {t('action.resetDoneBody')}
          </p>
        </div>

        <PrimaryButton
          type="button"
          onClick={() => void navigate({ to: '/auth/sign-in' })}
          className="h-16 w-full text-[21px]"
        >
          {t('auth.signIn')}
        </PrimaryButton>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <h1 className="text-[28px] font-extrabold text-(--color-auth-title) lg:text-[30px]">
          {t('action.failedTitle')}
        </h1>
        <p className="text-[16px] leading-[1.45] font-semibold text-(--color-auth-subtitle)">
          {t('action.failedBody')}
        </p>
      </div>

      <AuthMessages errorKey={errorKey} />

      <Link
        to="/auth/sign-in"
        className="flex h-16 w-full items-center justify-center rounded-full bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[21px] font-bold text-white shadow-[0_10px_14px_rgba(48,145,247,0.22)]"
      >
        {t('action.backToSignIn')}
      </Link>
    </>
  );
}
