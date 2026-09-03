/* Today's progress for all four practice blocks, in the same card the blocks
   themselves use — the home screen is where you see whether the day is going
   anywhere. Each card opens its block.

   The card title is the skill rather than "Today progress": four identical
   titles side by side would tell the learner nothing. */
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ProgressCard } from '@/components/home/ProgressCard';
import { useDailyProgress, withDailyProgress } from '@/hooks/useDailyProgress';
import type { DailyPracticeSkill } from '@/lib/dailyPracticeStats';
import type { HomeSetPreviewItem } from '@/lib/homeTypes';
import { LISTENING_TODAY_GOAL } from '@/lib/listeningTypes';
import { READING_TODAY_GOAL } from '@/lib/readingTypes';
import { SPEAKING_TODAY_GOAL } from '@/lib/speakingTypes';
import { WRITING_TODAY_GOAL } from '@/lib/writingTypes';

type SkillRoute =
  | '/practice/speaking'
  | '/practice/listening'
  | '/practice/reading'
  | '/practice/writing';

interface SkillConfig {
  skill: DailyPracticeSkill;
  template: HomeSetPreviewItem;
  labelKey: string;
  to: SkillRoute;
  /** Writing counts words; the rest count minutes. */
  unitKey: 'units.min' | 'units.words';
}

const SKILLS: SkillConfig[] = [
  {
    skill: 'speaking',
    template: SPEAKING_TODAY_GOAL,
    labelKey: 'nav.speaking',
    to: '/practice/speaking',
    unitKey: 'units.min',
  },
  {
    skill: 'listening',
    template: LISTENING_TODAY_GOAL,
    labelKey: 'nav.listening',
    to: '/practice/listening',
    unitKey: 'units.min',
  },
  {
    skill: 'reading',
    template: READING_TODAY_GOAL,
    labelKey: 'nav.reading',
    to: '/practice/reading',
    unitKey: 'units.min',
  },
  {
    skill: 'writing',
    template: WRITING_TODAY_GOAL,
    labelKey: 'nav.writing',
    to: '/practice/writing',
    unitKey: 'units.words',
  },
];

export const SkillProgressGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
    {SKILLS.map((config) => (
      <SkillProgressCard key={config.skill} config={config} />
    ))}
  </div>
);

/* One card per skill so each can call the hook — hooks can't run in a loop. */
const SkillProgressCard = ({ config }: { config: SkillConfig }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const progress = useDailyProgress(config.skill);

  return (
    <ProgressCard
      item={withDailyProgress(config.template, progress, t(config.unitKey))}
      layout="goal"
      title={t(config.labelKey)}
      subtitle={t(`home.progress.subtitle.${config.skill}`)}
      onClick={() => void navigate({ to: config.to })}
    />
  );
};
