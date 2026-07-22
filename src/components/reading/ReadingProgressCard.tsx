/* Top-of-Reading "Today progress" card — ports ReadingProgressSummaryCardView.
   Fed by the real daily practice log (dailyPracticeStats). */
import { useTranslation } from 'react-i18next';

import { ProgressCard } from '@/components/home/ProgressCard';
import { useDailyProgress, withDailyProgress } from '@/hooks/useDailyProgress';
import { READING_TODAY_GOAL } from '@/lib/readingTypes';

export const ReadingProgressCard = () => {
  const { t } = useTranslation();
  const progress = useDailyProgress('reading');
  return (
    <ProgressCard
      item={withDailyProgress(READING_TODAY_GOAL, progress)}
      layout="goal"
      title={t('reading.today.title')}
      subtitle={t('reading.today.subtitle')}
    />
  );
};
