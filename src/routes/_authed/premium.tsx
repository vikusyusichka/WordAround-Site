/* Premium — /premium. What it unlocks, the learner's status, and the way to
   subscribe or manage the subscription (both handled by Stripe's own pages).
   While the paywall switch is off the exams are free and this page says so. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BODY_TEXT, CARD, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useExamAccess } from '@/hooks/useExams';
import { openBillingPortal, startCheckout, type BillingPlan } from '@/lib/billing';

export const Route = createFileRoute('/_authed/premium')({
  component: PremiumPage,
});

const FEATURES = ['mock', 'practice', 'feedback', 'progress'] as const;

function PremiumPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const access = useExamAccess();
  const [busy, setBusy] = useState<BillingPlan | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (action: BillingPlan | 'portal') => {
    setBusy(action);
    setError(null);
    try {
      if (action === 'portal') await openBillingPortal();
      else await startCheckout(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <ContentContainer fluid>
      <PageHeader title={t('exams.premium.title')} subtitle={t('exams.premium.subtitle')} />
      <div className="flex max-w-[760px] flex-col gap-5">
        <section className={`${CARD} flex flex-col gap-4`}>
          <ul className="flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Icon name="checkmark" className="mt-0.5 size-5 shrink-0 text-(--color-green-accent)" />
                <span className={BODY_TEXT}>{t(`exams.premium.feature.${feature}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        {!access.paywall ? (
          <section className={`${CARD} flex flex-col items-start gap-3`}>
            <h2 className={SECTION_TITLE}>{t('exams.premium.freeNowTitle')}</h2>
            <p className={BODY_TEXT}>{t('exams.premium.freeNowBody')}</p>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => void navigate({ to: '/exams' })}>
              {t('exams.premium.toExams')}
            </button>
          </section>
        ) : access.premium ? (
          <section className={`${CARD} flex flex-col items-start gap-3`}>
            <h2 className={SECTION_TITLE}>{t('exams.premium.active')}</h2>
            <button type="button" className={SECONDARY_BUTTON} disabled={busy !== null} onClick={() => void go('portal')}>
              {t('exams.premium.manage')}
            </button>
          </section>
        ) : (
          <section className={`${CARD} flex flex-col items-start gap-3`}>
            <h2 className={SECTION_TITLE}>{t('exams.premium.choosePlan')}</h2>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={PRIMARY_BUTTON} disabled={busy !== null} onClick={() => void go('yearly')}>
                {t('exams.premium.yearly')}
              </button>
              <button type="button" className={SECONDARY_BUTTON} disabled={busy !== null} onClick={() => void go('monthly')}>
                {t('exams.premium.monthly')}
              </button>
            </div>
            <p className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.premium.stripeNote')}</p>
          </section>
        )}
        {error && <p className="text-[14px] font-semibold text-(--color-profile-danger)">{error}</p>}
      </div>
    </ContentContainer>
  );
}
