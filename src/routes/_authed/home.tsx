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
import { recentlyOpenedNotes } from '@/lib/grammarRecommendations';
import { STREAK_CARD } from '@/lib/homeTypes';
import { lastOpenedSetId } from '@/lib/recentSets';
import { mapSetToPreview } from '@/lib/setPreview';

export const Route = createFileRoute('/_authed/home')({
  component: HomeDashboard,
});

/* Web dashboard, read top to bottom: what you decided to do today, then how
   today is going across the four blocks, then the two things you can pick up
   again. The full set list lives on /sets — repeating it here just pushed the
   useful parts off screen.

   Every card is live; nothing on this screen is a placeholder. */
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
  const lastNote = recentlyOpenedNotes()[0] ?? null;

  /* Two cards side by side only when there are two — a lone half-width card
     in an empty row reads as something failed to load. */
  const pickUpColumns = continuePreview && lastNote ? 'lg:grid-cols-2' : '';

  return (
    <ContentContainer fluid>
      <PageHeader title={t('home.title.flashcards')} subtitle={t('home.subtitle.pickSet')} />

      <div className="flex flex-col gap-5 lg:gap-7">
        {/* Today's intention, and how many days in a row it has been kept. */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5">
          <DailyGoalCard onChange={() => setGoalVersion((v) => v + 1)} />
          <StatCard item={{ ...STREAK_CARD, value: String(streak) }} />
        </div>

        <SkillProgressGrid key={goalVersion} />

        {(continuePreview || lastNote) && (
          <div className={`grid gap-4 lg:gap-5 ${pickUpColumns}`}>
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
            {lastNote && <LastNoteCard note={lastNote} />}
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
