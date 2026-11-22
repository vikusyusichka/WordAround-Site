/* "Review Today" summary card on the grammar home — web port of
   GrammarReviewSummaryView.

   The card distinguishes two things the queue does not distinguish on the
   surface. buildReviewQueue falls back to "recently opened / recently edited"
   notes whenever nothing is actually due, so a card that always said
   "N items ready · ~M min" over a filled Start button told the learner
   they owed work they did not owe, and the "all caught up" state was
   effectively unreachable. Due work keeps the primary button; a fallback
   queue says so plainly and offers refreshing as the optional thing it is. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { GrammarReviewQueue } from '@/lib/grammarReviewQueue';
import { reviewForecast } from '@/lib/grammarReviewFormat';
import type { GrammarReviewItem } from '@/lib/models';

interface ReviewTodayCardProps {
  queue: GrammarReviewQueue | undefined;
  isLoading: boolean;
  /** A failed queue build must not read as "all caught up". */
  isError?: boolean;
  /** Every review item, for the week-ahead strip. */
  items?: Map<string, GrammarReviewItem>;
  onStart: () => void;
}

export const ReviewTodayCard = ({
  queue,
  isLoading,
  isError = false,
  items,
  onStart,
}: ReviewTodayCardProps) => {
  const { t, i18n } = useTranslation();
  const forecast = items && items.size > 0 ? reviewForecast(items.values()) : null;
  const peak = forecast ? Math.max(1, ...forecast) : 1;
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' });
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
        ? [
            t('writing.grammar.review.cardSubtitle', {
              count,
              minutes: queue?.estimatedMinutes ?? 1,
            }),
            queue?.newCount ? t('writing.grammar.review.newCount', { count: queue.newCount }) : null,
            queue?.dueTotal && queue.dueTotal > count
              ? t('writing.grammar.review.moreWaiting', { count: queue.dueTotal - count })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : canRefresh
          ? t('writing.grammar.review.refreshBody')
          : t('writing.grammar.review.caughtUp');

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-(--color-surface) bg-(--color-surface)/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-(--color-accent-violet)/12">
          <Icon name="brain.head.profile" className="size-[20px] text-(--color-accent-violet)" />
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
        <span className="w-fit rounded-full bg-(--color-accent-violet)/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-(--color-accent-violet)">
          {t(`writing.grammar.review.pool.${queue.pool}`, { count })}
        </span>
      )}

      {forecast && (
        <div aria-label={t('writing.grammar.review.forecastTitle')} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            {t('writing.grammar.review.forecastTitle')}
          </span>
          <div className="grid grid-cols-7 gap-1.5">
            {forecast.map((n, day) => {
              const date = new Date();
              date.setDate(date.getDate() + day);
              return (
                <div key={day} className="flex flex-col items-center gap-1" title={String(n)}>
                  <div className="flex h-10 w-full items-end overflow-hidden rounded-md bg-(--color-goal-bg)">
                    <div
                      className="w-full rounded-md bg-(--color-accent-violet)"
                      style={{ height: n === 0 ? 0 : `${Math.max(12, (n / peak) * 100)}%`, opacity: day === 0 ? 1 : 0.55 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-(--color-muted-text)">
                    {n > 0 ? n : '·'}
                  </span>
                  <span className="text-[10px] font-semibold text-(--color-muted-text) uppercase">
                    {weekday.format(date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ready && (
        <button
          type="button"
          onClick={onStart}
          className="h-11 w-full rounded-2xl bg-(--color-primary-blue-solid) text-[14px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('writing.grammar.review.start')}
        </button>
      )}

      {/* Optional work gets an optional-looking button. */}
      {canRefresh && (
        <button
          type="button"
          onClick={onStart}
          className="h-11 w-full rounded-2xl border border-(--color-accent-violet)/35 bg-(--color-accent-violet)/8 text-[14px] font-semibold text-(--color-accent-violet-text) transition-colors hover:bg-(--color-accent-violet)/16"
        >
          {t('writing.grammar.review.refreshStart')}
        </button>
      )}
    </section>
  );
};
