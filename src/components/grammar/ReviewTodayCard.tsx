/* "Review Today" summary card on the grammar home — web port of
   GrammarReviewSummaryView.

   The card distinguishes two things the queue does not distinguish on the
   surface. buildReviewQueue falls back to "recently opened / recently edited"
   notes whenever nothing is actually due, so a card that always said
   "N items ready · ~M min" over a gradient Start button told the learner
   they owed work they did not owe, and the "all caught up" state was
   effectively unreachable. Due work keeps the primary button; a fallback
   queue says so plainly and offers refreshing as the optional thing it is. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { GrammarReviewQueue } from '@/lib/grammarReviewQueue';

interface ReviewTodayCardProps {
  queue: GrammarReviewQueue | undefined;
  isLoading: boolean;
  /** A failed queue build must not read as "all caught up". */
  isError?: boolean;
  onStart: () => void;
}

export const ReviewTodayCard = ({
  queue,
  isLoading,
  isError = false,
  onStart,
}: ReviewTodayCardProps) => {
  const { t } = useTranslation();
  const count = queue?.cards.length ?? 0;
  const hasCards = !isLoading && !isError && count > 0;
  /* Only the manual pool holds items whose dueAt has actually come. */
  const isDue = queue?.pool === 'manual';
  const ready = hasCards && isDue;
  const canRefresh = hasCards && !isDue;

  const subtitle = isLoading
    ? t('writing.grammar.loading')
    : isError
      ? t('writing.grammar.review.loadError')
      : ready
        ? t('writing.grammar.review.cardSubtitle', {
            count,
            minutes: queue?.estimatedMinutes ?? 1,
          })
        : canRefresh
          ? t('writing.grammar.review.refreshBody')
          : t('writing.grammar.review.caughtUp');

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#7C5CFF]/12">
          <Icon name="brain.head.profile" className="size-[20px] text-[#7C5CFF]" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
            {t(
              canRefresh
                ? 'writing.grammar.review.caughtUpTitle'
                : 'writing.grammar.review.cardTitle',
            )}
          </h2>
          <p className="text-[13px] font-medium text-(--color-text-secondary)">{subtitle}</p>
        </div>
      </div>

      {hasCards && queue?.pool && (
        <span className="w-fit rounded-full bg-[#7C5CFF]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#7C5CFF]">
          {t(`writing.grammar.review.pool.${queue.pool}`, { count })}
        </span>
      )}

      {ready && (
        <button
          type="button"
          onClick={onStart}
          className="h-11 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('writing.grammar.review.start')}
        </button>
      )}

      {/* Optional work gets an optional-looking button. */}
      {canRefresh && (
        <button
          type="button"
          onClick={onStart}
          className="h-11 w-full rounded-2xl border border-[#7C5CFF]/35 bg-[#7C5CFF]/8 text-[14px] font-semibold text-[#5B3FD1] transition-colors hover:bg-[#7C5CFF]/16"
        >
          {t('writing.grammar.review.refreshStart')}
        </button>
      )}
    </section>
  );
};
