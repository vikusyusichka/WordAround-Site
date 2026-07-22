/* Top-of-Writing "Today progress" card. Ports WritingProgressSummaryCardView
   (WritingProgressSummaryCardView.swift): a `ProgressCard` in goal layout with
   the pencil icon and primary-blue tint. Fed by the real daily practice log
   (dailyPracticeStats) — writing counts WORDS, not minutes. */
import { useTranslation } from 'react-i18next';

import { ProgressCard } from '@/components/home/ProgressCard';
import { useDailyProgress, withDailyProgress } from '@/hooks/useDailyProgress';
import { WRITING_TODAY_GOAL } from '@/lib/writingTypes';

export const WritingProgressCard = () => {
  const { t } = useTranslation();
  const progress = useDailyProgress('writing');
  return (
    <ProgressCard
      item={withDailyProgress(WRITING_TODAY_GOAL, progress, t('units.words'))}
      layout="goal"
      title={t('writing.today.title')}
      subtitle={t('writing.today.subtitle')}
    />
  );
};
