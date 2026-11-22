/* Spaced-review session — /notes/review (static segment wins over $topicId).
   `?topic=<id>` limits the session to one topic. The queue comes from
   useReviewQueueQuery; play state lives in the pure reviewSessionReducer.
   Each rating is applied here (FSRS, with the learner's retention setting) so
   the session can carry the new state into a card that comes back, then
   persisted. Recommendation cards become real review items on first rating,
   like iOS. Keyboard: S skips; the card handles 1–4 and Enter. */
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReviewSessionScreen } from '@/components/grammar/ReviewSessionScreen';
import { ReviewSummaryView } from '@/components/grammar/ReviewSummaryView';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { useMarkReviewed, useReviewQueueQuery } from '@/hooks/useGrammarReview';
import { applyReviewResult, previewIntervals } from '@/lib/grammarReview';
import { isTypingTarget } from '@/lib/grammarReviewFormat';
import {
  currentCard,
  initialReviewSessionState,
  isRelearnAttempt,
  progressFraction,
  relearnPendingCount,
  reviewSessionReducer,
} from '@/lib/grammarReviewSession';
import type { GrammarReviewResult } from '@/lib/models';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';

export const Route = createFileRoute('/_authed/notes/review')({
  validateSearch: (search: Record<string, unknown>): { topic?: string } => ({
    topic: typeof search.topic === 'string' && search.topic.length > 0 ? search.topic : undefined,
  }),
  component: ReviewRoute,
});

function ReviewRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { topic } = Route.useSearch();
  const { data: queue, isLoading, isError, refetch } = useReviewQueueQuery(topic);
  const markReviewed = useMarkReviewed();
  const retention = useGrammarSettings((s) => s.reviewRetention);
  const [session, dispatch] = useReducer(reviewSessionReducer, initialReviewSessionState);

  /* Seed the session once the queue arrives (and only once per mount). */
  useEffect(() => {
    if (session.cards.length === 0 && queue && queue.cards.length > 0) {
      dispatch({ type: 'START', cards: queue.cards, pool: queue.pool });
    }
  }, [queue, session.cards.length]);

  const goHome = () =>
    topic
      ? void navigate({ to: '/notes/$topicId', params: { topicId: topic } })
      : void navigate({ to: '/notes' });

  const card = currentCard(session);

  /* Recomputed per card, not per render tick: the preview and the saved
     schedule must come from the same moment's state. */
  const intervals = useMemo(
    () => (card ? previewIntervals(card.reviewItem, Date.now(), retention) : null),
    [card, retention],
  );

  const handleRate = useCallback(
    (result: GrammarReviewResult) => {
      if (!card) return;
      const updated = applyReviewResult(card.reviewItem, result, Date.now(), retention);
      markReviewed.mutate({ previous: card.reviewItem, updated, result });
      dispatch({ type: 'RATE', result, updated });
    },
    [card, retention, markReviewed],
  );

  const handleSubmit = useCallback(
    (answer: string) => dispatch({ type: 'SUBMIT_ANSWER', answer }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if ((e.key === 's' || e.key === 'S') && card && !session.finished) {
        e.preventDefault();
        dispatch({ type: 'SKIP' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, session.finished]);

  /* "Review more": the queue is rebuilt from Firestore so the cards just
     rated (now due later) drop out and the next batch comes in. */
  const handleMore = async () => {
    const fresh = await refetch();
    const cards = fresh.data?.cards ?? [];
    if (cards.length > 0) dispatch({ type: 'START', cards, pool: fresh.data?.pool ?? null });
    else dispatch({ type: 'RESET' });
  };

  const pendingRetries = relearnPendingCount(session);

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
              className="flex h-11 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-(--color-surface) px-4 text-[14px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-(--color-hover-wash) md:text-[15px]"
            >
              {t('writing.grammar.review.skip')}
              <kbd className="hidden rounded-md border border-(--color-auth-field-border) px-1.5 font-sans text-[10px] font-bold text-(--color-muted-text) md:inline">
                S
              </kbd>
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <BackLink label={t('nav.notes')} onClick={goHome} />

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

        {!session.finished && card && intervals && (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-(--color-text-secondary)">
                  {t('writing.grammar.review.itemOf', {
                    current: session.currentIndex + 1,
                    total: session.cards.length,
                  })}
                  {pendingRetries > 0 &&
                    ` · ${t('writing.grammar.review.relearnPending', { count: pendingRetries })}`}
                </p>
                <span className="rounded-full bg-(--color-goal-bg) px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                  {t(`writing.grammar.review.phase.${session.phase}`)}
                </span>
              </div>
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
                <div
                  className="h-full rounded-full bg-(--color-accent-violet) transition-[width]"
                  style={{ width: `${progressFraction(session) * 100}%` }}
                />
              </div>
            </div>

            <ReviewSessionScreen
              key={`${session.currentIndex}-${card.id}-${session.phase}`}
              card={card}
              phase={session.phase}
              lastAnswer={session.lastAnswer}
              intervals={intervals}
              isRelearn={isRelearnAttempt(session)}
              onSubmit={handleSubmit}
              onRate={handleRate}
              onOpenNote={() =>
                void navigate({
                  to: '/notes/$topicId/$noteId',
                  params: { topicId: card.reviewItem.topicId, noteId: card.reviewItem.noteId ?? '' },
                })
              }
            />
          </>
        )}

        {session.finished && (
          <ReviewSummaryView
            session={session}
            onDone={goHome}
            onMore={() => void handleMore()}
            onOpenNote={(topicId, noteId) =>
              void navigate({ to: '/notes/$topicId/$noteId', params: { topicId, noteId } })
            }
          />
        )}
      </div>
    </ContentContainer>
  );
}
