/* Feeds the landing "Today progress" cards from the real practice log.
   Reads on mount (and on window focus, so finishing a session in another tab
   shows up when you come back) — the store is localStorage, so no query cache. */
import { useCallback, useEffect, useState } from 'react';

import {
  dailyProgress,
  type DailyPracticeSkill,
  type DailyProgress,
} from '@/lib/dailyPracticeStats';
import type { HomeSetPreviewItem } from '@/lib/homeTypes';

export const useDailyProgress = (skill: DailyPracticeSkill): DailyProgress => {
  const read = useCallback(() => dailyProgress(skill), [skill]);
  const [progress, setProgress] = useState<DailyProgress>(read);

  useEffect(() => {
    setProgress(read());
    const refresh = () => setProgress(read());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [read]);

  return progress;
};

/** Overlays live numbers onto a module's card template, keeping its colours. */
export const withDailyProgress = (
  template: HomeSetPreviewItem,
  progress: DailyProgress,
): HomeSetPreviewItem => ({
  ...template,
  currentValue: progress.current,
  totalValue: progress.goal,
  unit: progress.unit === 'words' ? 'words' : 'min',
  progress: progress.progress,
});
