/* Shown in place of a locked exam feature: what Premium unlocks and the way
   to get it. */
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';

import { BODY_TEXT, CARD, PRIMARY_BUTTON, SECTION_TITLE } from './ui';

export const PremiumPrompt = ({ reason }: { reason: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className={`${CARD} flex flex-col items-start gap-3`}>
      <div className="grid size-11 place-items-center rounded-full bg-(--color-hover-wash)">
        <Icon name="crown.fill" className="size-5 text-(--color-orange-accent)" />
      </div>
      <h2 className={SECTION_TITLE}>{t('exams.premium.lockedTitle')}</h2>
      <p className={BODY_TEXT}>{reason}</p>
      <button type="button" className={PRIMARY_BUTTON} onClick={() => void navigate({ to: '/premium' })}>
        {t('exams.premium.cta')}
      </button>
    </section>
  );
};
