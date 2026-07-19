/* Top-of-Reading "Today progress" card — ports ReadingProgressSummaryCardView.
   Static stub numbers (real daily-stats persistence deferred, like Writing). */
import { useTranslation } from 'react-i18next';

import { ProgressCard } from '@/components/home/ProgressCard';
import { READING_TODAY_GOAL } from '@/lib/readingTypes';

export const ReadingProgressCard = () => {
  const { t } = useTranslation();
  return (
    <ProgressCard
      item={READING_TODAY_GOAL}
      layout="goal"
      title={t('reading.today.title')}
      subtitle={t('reading.today.subtitle')}
    />
  );
};
