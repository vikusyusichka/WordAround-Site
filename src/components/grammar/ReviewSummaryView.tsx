/* End-of-session summary — web port of GrammarReviewSessionSummaryView:
   stats grid, rating breakdown pills, when the next card returns, the notes
   that gave the most trouble, and "review more" / done. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { formatReviewInterval } from '@/lib/grammarReviewFormat';
import type { ReviewSessionState } from '@/lib/grammarReviewSession';
import { incorrectDisplayCount } from '@/lib/grammarReviewSession';

interface ReviewSummaryViewProps {
  session: ReviewSessionState;
  onDone: () => void;
  onMore: () => void;
  onOpenNote: (topicId: string, noteId: string) => void;
}

const WEAK_LIMIT = 3;

export const ReviewSummaryView = ({ session, onDone, onMore, onOpenNote }: ReviewSummaryViewProps) => {
  const { t } = useTranslation();
  const reviewed = session.totalReviewed;
  const incorrect = incorrectDisplayCount(session);
  const now = Date.now();

  /* Unique cards of this session (repeats appear twice in `cards`). */
  const uniqueCards = [...new Map(session.cards.map((c) => [c.id, c])).values()];

  const rated = Object.values(session.ratedItems);
  const soonest = rated.length > 0 ? Math.min(...rated.map((i) => i.dueAt)) : null;

  /* Cards sent back for relearning, most-forgotten first. */
  const weak = uniqueCards
    .filter((c) => (session.relearnCounts[c.id] ?? 0) > 0 && c.reviewItem.noteId)
    .sort((a, b) => (session.relearnCounts[b.id] ?? 0) - (session.relearnCounts[a.id] ?? 0))
    .slice(0, WEAK_LIMIT);

  const stats: { label: string; value: number }[] = [
    { label: t('writing.grammar.review.summary.reviewed'), value: reviewed },
    { label: t('writing.grammar.review.summary.correct'), value: session.correctAnswerCount },
    { label: t('writing.grammar.review.summary.incorrect'), value: incorrect },
  ];

  const breakdown: { key: string; value: number; color: string }[] = [
    { key: 'forgot', value: session.forgotCount, color: 'var(--color-cs-red)' },
    { key: 'hard', value: session.hardCount, color: 'var(--color-accent-amber)' },
    { key: 'good', value: session.goodCount, color: 'var(--color-primary-blue)' },
    { key: 'easy', value: session.easyCount, color: 'var(--color-accent-green)' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
      <span className="grid size-16 place-items-center rounded-full bg-(--color-accent-violet)/12">
        <Icon
          name={reviewed > 0 ? 'checkmark.seal.fill' : 'tray.fill'}
          className="size-[30px] text-(--color-accent-violet)"
        />
      </span>
      <h2 className="text-[22px] font-extrabold text-(--color-primary-blue-dark)">
        {reviewed > 0
          ? t('writing.grammar.review.summary.title')
          : t('writing.grammar.review.summary.emptyTitle')}
      </h2>

      <div className="grid w-full grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-0.5 rounded-2xl border border-(--color-surface) bg-(--color-surface)/95 px-2 py-3 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
          >
            <span className="text-[22px] font-extrabold text-(--color-primary-blue-dark)">
              {stat.value}
            </span>
            <span className="text-[12px] font-semibold text-(--color-text-secondary)">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {breakdown.map((b) => (
          <span
            key={b.key}
            className="rounded-full px-3 py-1 text-[12px] font-bold"
            style={{ background: `color-mix(in srgb, ${b.color} 12%, var(--color-cs-surface))`, color: b.color }}
          >
            {t(`writing.grammar.review.rating.${b.key}`)}: {b.value}
          </span>
        ))}
      </div>

      {soonest !== null && (
        <p className="text-center text-[14px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.review.summary.nextIn', {
            when: formatReviewInterval(Math.max(soonest - now, 60_000), t),
          })}
        </p>
      )}

      {weak.length > 0 && (
        <section className="flex w-full flex-col gap-2">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-muted-text)">
            {t('writing.grammar.review.summary.weakTitle')}
          </h3>
          {weak.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpenNote(c.reviewItem.topicId, c.reviewItem.noteId as string)}
              className="flex items-center gap-3 rounded-2xl border border-(--color-auth-field-border) bg-(--color-surface) px-4 py-3 text-left transition-colors hover:bg-(--color-hover-wash)"
            >
              <Icon name="exclamationmark.triangle.fill" className="size-4 shrink-0 text-(--color-cs-red)" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-(--color-primary-blue-dark)">
                {c.note.title || t('writing.grammar.review.untitled')}
              </span>
              <Icon name="chevron.right" className="size-[13px] shrink-0 text-(--color-muted-text)" />
            </button>
          ))}
        </section>
      )}

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onMore}
          className="h-12 flex-1 rounded-2xl border border-(--color-accent-violet)/35 bg-(--color-accent-violet)/8 text-[15px] font-semibold text-(--color-accent-violet-text) transition-colors hover:bg-(--color-accent-violet)/16"
        >
          {t('writing.grammar.review.summary.more')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-12 flex-1 rounded-2xl bg-(--color-primary-blue-solid) text-[15px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.98]"
        >
          {t('writing.grammar.review.summary.done')}
        </button>
      </div>
    </div>
  );
};
