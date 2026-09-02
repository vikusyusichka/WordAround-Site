/* Feeds the landing "Today progress" cards from the real practice log.
   Reads on mount (and on window focus, so finishing a session in another tab
   shows up when you come back) — the store is localStorage, so no query cache. */
import { useCallback, useEffect, useState } from 'react';

import {
  currentStreak,
  dailyProgress,
  type DailyPracticeSkill,
  type DailyProgress,
} from '@/lib/dailyPracticeStats';
import { goalOverrideFor } from '@/lib/dailyGoal';
import type { HomeSetPreviewItem } from '@/lib/homeTypes';

export const useDailyProgress = (skill: DailyPracticeSkill): DailyProgress => {
  /* The learner's own target for today wins over the built-in goal. */
  const read = useCallback(
    () => dailyProgress(skill, new Date(), goalOverrideFor(skill)),
    [skill],
  );
  const [progress, setProgress] = useState<DailyProgress>(read);

  useEffect(() => {
    setProgress(read());
    const refresh = () => setProgress(read());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [read]);

  return progress;
};

/** Overlays live numbers onto a module's card template, keeping its colours.
    `unitLabel` must come from i18n — the card shows it verbatim. */
export const withDailyProgress = (
  template: HomeSetPreviewItem,
  progress: DailyProgress,
  unitLabel: string,
): HomeSetPreviewItem => ({
  ...template,
  currentValue: progress.current,
  totalValue: progress.goal,
  unit: unitLabel,
  progress: progress.progress,
});

/** Consecutive practice days, refreshed on focus like the progress cards. */
export const useStreak = (): number => {
  const [streak, setStreak] = useState<number>(() => currentStreak());

  useEffect(() => {
    const refresh = () => setStreak(currentStreak());
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  return streak;
};
