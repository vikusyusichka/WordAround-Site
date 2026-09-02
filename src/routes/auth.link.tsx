import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { AuthField } from '@/components/auth/AuthField';
import { AuthMessages } from '@/components/auth/AuthMessages';
import { PrimaryButton } from '@/components/auth/PrimaryButton';
import { redirectIfSignedIn } from '@/lib/authGuards';
import { magicLinkSchema, type MagicLinkValues } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/auth/link')({
  beforeLoad: redirectIfSignedIn,
  component: MagicLinkScreen,
});

/* Passwordless sign-in: we email a one-time link that both signs the user in
   and proves the address. Opening it lands on /auth/action. */
function MagicLinkScreen() {
  const { t } = useTranslation();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const isLoading = useAuthStore((s) => s.isLoading);
  const errorMessage = useAuthStore((s) => s.errorMessage);

  useEffect(() => {
    useAuthStore.getState().clearMessages();
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    await useAuthStore.getState().sendMagicLink(values.email);
    if (!useAuthStore.getState().errorMessage) setSentTo(values.email);
  });

  if (sentTo) {
    return (
      <>
        <div className="flex flex-col gap-3">
          <h1 className="text-[30px] font-extrabold text-(--color-auth-title) lg:text-[32px]">
            {t('link.sentTitle')}
          </h1>
          <p className="text-[16px] leading-[1.45] font-semibold text-(--color-auth-subtitle)">
            {t('link.sentBody')}
          </p>
          <p className="text-[18px] font-bold break-words text-(--color-auth-title)">{sentTo}</p>
        </div>

        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="h-14 w-full rounded-full border border-(--color-auth-field-border) bg-white/95 text-[16px] font-bold text-(--color-auth-title) transition-transform active:scale-[0.98]"
        >
          {t('link.useAnotherEmail')}
        </button>

        <Link
          to="/auth/sign-in"
          className="mx-auto text-[15px] font-bold text-(--color-auth-blue)"
        >
          {t('link.backToPassword')}
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <h1 className="text-[30px] font-extrabold text-(--color-auth-title) lg:text-[32px]">
          {t('link.title')}
        </h1>
        <p className="text-[16px] leading-[1.45] font-semibold text-(--color-auth-subtitle)">
          {t('link.subtitle')}
        </p>
      </div>

      <form noValidate className="flex flex-col gap-[18px]" onSubmit={(e) => void onSubmit(e)}>
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

        <AuthMessages errorKey={errorMessage} />

        <PrimaryButton
          isLoading={isLoading}
          loadingLabel={t('link.sending')}
          className="h-16 w-full text-[21px]"
        >
          {t('link.send')}
        </PrimaryButton>
      </form>

      <Link to="/auth/sign-in" className="mx-auto text-[15px] font-bold text-(--color-auth-blue)">
        {t('link.backToPassword')}
      </Link>
    </>
  );
}
