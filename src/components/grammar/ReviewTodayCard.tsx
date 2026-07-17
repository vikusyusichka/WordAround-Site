/* "Review Today" summary card on the grammar home — web port of
   GrammarReviewSummaryView. Shows the pre-built queue size + time estimate
   and a Start button; empty state = "all caught up". */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { GrammarReviewQueue } from '@/lib/grammarReviewQueue';

interface ReviewTodayCardProps {
  queue: GrammarReviewQueue | undefined;
  isLoading: boolean;
  onStart: () => void;
}

export const ReviewTodayCard = ({ queue, isLoading, onStart }: ReviewTodayCardProps) => {
  const { t } = useTranslation();
  const count = queue?.cards.length ?? 0;
  const ready = !isLoading && count > 0;

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#7C5CFF]/12">
          <Icon name="brain.head.profile" className="size-[20px] text-[#7C5CFF]" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
            {t('writing.grammar.review.cardTitle')}
          </h2>
          <p className="text-[13px] font-medium text-(--color-text-secondary)">
            {isLoading
              ? t('writing.grammar.loading')
              : ready
                ? t('writing.grammar.review.cardSubtitle', {
                    count,
                    minutes: queue?.estimatedMinutes ?? 1,
                  })
                : t('writing.grammar.review.caughtUp')}
          </p>
        </div>
      </div>
      {ready && queue?.pool && (
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
    </section>
  );
};
