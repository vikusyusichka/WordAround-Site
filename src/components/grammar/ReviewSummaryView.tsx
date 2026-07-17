/* End-of-session summary — web port of GrammarReviewSessionSummaryView:
   stats grid, rating breakdown pills, next-review hint, done button. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { ReviewSessionState } from '@/lib/grammarReviewSession';
import { incorrectDisplayCount } from '@/lib/grammarReviewSession';

interface ReviewSummaryViewProps {
  session: ReviewSessionState;
  onDone: () => void;
}

export const ReviewSummaryView = ({ session, onDone }: ReviewSummaryViewProps) => {
  const { t } = useTranslation();
  const reviewed = session.totalReviewed;
  const incorrect = incorrectDisplayCount(session);

  /* iOS next-review hint keyed off which ratings occurred (soonest wins). */
  const hintKey =
    session.forgotCount > 0
      ? 'hintForgot'
      : session.hardCount > 0
        ? 'hintHard'
        : session.goodCount > 0
          ? 'hintGood'
          : 'hintEasy';

  const stats: { label: string; value: number }[] = [
    { label: t('writing.grammar.review.summary.reviewed'), value: reviewed },
    { label: t('writing.grammar.review.summary.correct'), value: session.correctAnswerCount },
    { label: t('writing.grammar.review.summary.incorrect'), value: incorrect },
  ];

  const breakdown: { key: string; value: number; color: string }[] = [
    { key: 'forgot', value: session.forgotCount, color: 'var(--color-cs-red)' },
    { key: 'hard', value: session.hardCount, color: '#F59E0B' },
    { key: 'good', value: session.goodCount, color: 'var(--color-primary-blue)' },
    { key: 'easy', value: session.easyCount, color: '#22C55E' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
      <span className="grid size-16 place-items-center rounded-full bg-[#7C5CFF]/12">
        <Icon
          name={reviewed > 0 ? 'checkmark.seal.fill' : 'tray.fill'}
          className="size-[30px] text-[#7C5CFF]"
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
            className="flex flex-col items-center gap-0.5 rounded-2xl border border-white bg-white/95 px-2 py-3 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
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
            style={{ background: `color-mix(in srgb, ${b.color} 12%, white)`, color: b.color }}
          >
            {t(`writing.grammar.review.rating.${b.key}`)}: {b.value}
          </span>
        ))}
      </div>

      {reviewed > 0 && (
        <p className="text-center text-[14px] font-medium text-(--color-text-secondary)">
          {t(`writing.grammar.review.summary.${hintKey}`)}
        </p>
      )}

      <button
        type="button"
        onClick={onDone}
        className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
      >
        {t('writing.grammar.review.summary.done')}
      </button>
    </div>
  );
};
