import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { DailyGoalCard } from '@/components/home/DailyGoalCard';
import { LastNoteCard } from '@/components/home/LastNoteCard';
import { ProgressCard } from '@/components/home/ProgressCard';
import { SkillProgressGrid } from '@/components/home/SkillProgressGrid';
import { StatCard } from '@/components/home/StatCard';
import { useStreak } from '@/hooks/useDailyProgress';
import { useSetsQuery } from '@/hooks/useSets';
import { STREAK_CARD } from '@/lib/homeTypes';
import { lastOpenedSetId } from '@/lib/recentSets';
import { mapSetToPreview } from '@/lib/setPreview';

export const Route = createFileRoute('/_authed/home')({
  component: HomeDashboard,
});

/* Web dashboard. Everything on it is live: today's progress for all four
   practice blocks, the streak, the goal the learner set for today, the set
   they last opened and the grammar note they last read. The full set list
   lives on /sets — repeating it here just pushed the useful parts off screen. */
function HomeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sets } = useSetsQuery();
  const streak = useStreak();

  /* Changing the goal changes what the progress cards count against; the
     bump remounts them so they re-read it. */
  const [goalVersion, setGoalVersion] = useState(0);

  const lastId = lastOpenedSetId();
  const continueSet = sets?.find((s) => s.id === lastId) ?? sets?.[0];
  const continuePreview = continueSet
    ? mapSetToPreview(continueSet, t('sets.cardCount', { count: continueSet.cards.length }))
    : null;

  return (
    <ContentContainer fluid>
      <PageHeader title={t('home.title.flashcards')} subtitle={t('home.subtitle.pickSet')} />

      <div className="flex flex-col gap-8">
        {/* Today's intention, and how many days in a row it has been kept. */}
        <div className="grid gap-4 lg:grid-cols-[1fr_240px] lg:gap-6">
          <DailyGoalCard onChange={() => setGoalVersion((v) => v + 1)} />
          <StatCard item={{ ...STREAK_CARD, value: String(streak) }} />
        </div>

        <SkillProgressGrid key={goalVersion} />

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {continuePreview && continueSet && (
            <ProgressCard
              item={continuePreview}
              layout="action"
              title={t('home.continueLearning')}
              subtitle={continuePreview.title}
              actionSystemName="arrow.right"
              onClick={() => void navigate({ to: '/sets/$id', params: { id: continueSet.id } })}
            />
          )}
          <LastNoteCard />
        </div>
      </div>
    </ContentContainer>
  );
}
