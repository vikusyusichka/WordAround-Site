/* Spaced-review session — /practice/writing/grammar/review (static segment
   wins over $topicId). Queue comes from useReviewQueueQuery; play state lives
   in the pure reviewSessionReducer; each rating persists via markReviewed
   (recommendation cards become real review items on first rating, like iOS). */
import { useEffect, useReducer } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReviewSessionScreen } from '@/components/grammar/ReviewSessionScreen';
import { ReviewSummaryView } from '@/components/grammar/ReviewSummaryView';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { useMarkReviewed, useReviewQueueQuery } from '@/hooks/useGrammarReview';
import {
  currentCard,
  initialReviewSessionState,
  progressFraction,
  reviewSessionReducer,
} from '@/lib/grammarReviewSession';
import type { GrammarReviewResult } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/writing/grammar/review')({
  component: ReviewRoute,
});

function ReviewRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: queue, isLoading, isError } = useReviewQueueQuery();
  const markReviewed = useMarkReviewed();
  const [session, dispatch] = useReducer(reviewSessionReducer, initialReviewSessionState);

  /* Seed the session once the queue arrives (and only once per mount). */
  useEffect(() => {
    if (session.cards.length === 0 && queue && queue.cards.length > 0) {
      dispatch({ type: 'START', cards: queue.cards, pool: queue.pool });
    }
  }, [queue, session.cards.length]);

  const goHome = () => void navigate({ to: '/practice/writing/grammar' });

  const card = currentCard(session);

  const handleRate = (result: GrammarReviewResult) => {
    if (card) markReviewed.mutate({ item: card.reviewItem, result });
    dispatch({ type: 'RATE', result });
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('writing.grammar.review.title')}
        subtitle={t('writing.grammar.review.subtitle')}
        actions={
          !session.finished && card ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SKIP' })}
              className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03] md:text-[15px]"
            >
              {t('writing.grammar.review.skip')}
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={goHome}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('writing.grammar.title')}
        </button>

        {isLoading && (
          <p className="py-10 text-center text-[15px] font-medium text-(--color-text-secondary)">
            {t('writing.grammar.loading')}
          </p>
        )}
        {isError && (
          <p role="alert" className="py-10 text-center text-[15px] font-medium text-(--color-cs-red)">
            {t('writing.grammar.loadError')}
          </p>
        )}

        {!isLoading && !isError && !session.finished && !card && (
          <GrammarNotesEmptyState
            title={t('writing.grammar.review.caughtUpTitle')}
            body={t('writing.grammar.review.caughtUp')}
          />
        )}

        {!session.finished && card && (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-(--color-text-secondary)">
                  {t('writing.grammar.review.itemOf', {
                    current: session.currentIndex + 1,
                    total: session.cards.length,
                  })}
                </p>
                <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                  {t(`writing.grammar.review.phase.${session.phase}`)}
                </span>
              </div>
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
                <div
                  className="h-full rounded-full bg-[#7C5CFF] transition-[width]"
                  style={{ width: `${progressFraction(session) * 100}%` }}
                />
              </div>
            </div>

            <ReviewSessionScreen
              key={`${card.id}-${session.phase}`}
              card={card}
              phase={session.phase}
              lastAnswer={session.lastAnswer}
              onContinue={() => dispatch({ type: 'CONTINUE' })}
              onSubmit={(answer) => dispatch({ type: 'SUBMIT_ANSWER', answer })}
              onRate={handleRate}
              onOpenNote={() =>
                void navigate({
                  to: '/practice/writing/grammar/$topicId/$noteId',
                  params: { topicId: card.reviewItem.topicId, noteId: card.reviewItem.noteId ?? '' },
                })
              }
            />
          </>
        )}

        {session.finished && <ReviewSummaryView session={session} onDone={goHome} />}
      </div>
    </ContentContainer>
  );
}
