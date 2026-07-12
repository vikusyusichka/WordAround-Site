/* Top-of-Writing "Today progress" card. Ports WritingProgressSummaryCardView
   (WritingProgressSummaryCardView.swift): a `ProgressCard` in goal layout with
   the pencil icon and primary-blue tint. Numbers are static stubs for 4A —
   real daily-stats persistence is out of scope. */
import { useTranslation } from 'react-i18next';

import { ProgressCard } from '@/components/home/ProgressCard';
import { WRITING_TODAY_GOAL } from '@/lib/writingTypes';

export const WritingProgressCard = () => {
  const { t } = useTranslation();
  return (
    <ProgressCard
      item={WRITING_TODAY_GOAL}
      layout="goal"
      title={t('writing.today.title')}
      subtitle={t('writing.today.subtitle')}
    />
  );
};
