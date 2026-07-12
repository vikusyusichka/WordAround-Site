/* Round-complete summary shown when the user finishes (or skips through) all
   cards in the exercise. Mirrors the "study" RoundFinish visually so the two
   modules feel consistent. */
import { useTranslation } from 'react-i18next';
import { ArrowClockwise } from '@phosphor-icons/react';

interface WriteWordsRoundFinishProps {
  completed: number;
  skipped: number;
  hintsUsed: number;
  total: number;
  onRestart: () => void;
  onExit: () => void;
}

const StatBlock = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.045)] md:p-5">
    <span className="text-[24px] font-extrabold text-(--color-primary-blue-dark) md:text-[32px]">
      {value}
    </span>
    <span className="text-[12px] font-semibold uppercase tracking-wide text-(--color-text-secondary) md:text-[13px]">
      {label}
    </span>
  </div>
);

export const WriteWordsRoundFinish = ({
  completed,
  skipped,
  hintsUsed,
  total,
  onRestart,
  onExit,
}: WriteWordsRoundFinishProps) => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-white/80 bg-(--color-goal-bg) p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.06)] md:p-10">
      <span className="text-[22px] font-bold text-(--color-primary-blue-dark) md:text-[26px]">
        {t('writing.writeWords.finish.title')}
      </span>
      <span className="text-[40px] font-extrabold text-(--color-primary-blue) md:text-[48px]">
        {completed} / {total}
      </span>

      <div className="grid w-full grid-cols-3 gap-3 md:gap-4">
        <StatBlock label={t('writing.writeWords.finish.completed')} value={completed} />
        <StatBlock label={t('writing.writeWords.finish.skipped')} value={skipped} />
        <StatBlock label={t('writing.writeWords.finish.hints')} value={hintsUsed} />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="flex h-12 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
        >
          <ArrowClockwise size={18} weight="bold" />
          {t('writing.writeWords.finish.restart')}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex h-12 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-6 text-[15px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
        >
          {t('writing.writeWords.finish.exit')}
        </button>
      </div>
    </div>
  );
};
