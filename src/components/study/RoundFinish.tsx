/* Shown when a study round ends: how many were known, and what to do next. */
import { useTranslation } from 'react-i18next';
import { ArrowClockwise, ArrowsClockwise } from '@phosphor-icons/react';

interface RoundFinishProps {
  known: number;
  total: number;
  learning: number;
  accent: string;
  onRepeatUnknown: () => void;
  onRestart: () => void;
}

export const RoundFinish = ({
  known,
  total,
  learning,
  accent,
  onRepeatUnknown,
  onRestart,
}: RoundFinishProps) => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-white/80 bg-white p-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
      <span className="text-[22px] font-bold text-(--color-cs-dark-text)">
        {t('study.roundDone')}
      </span>
      <span className="text-[40px] font-extrabold" style={{ color: accent }}>
        {t('study.knewCount', { known, total })}
      </span>

      <div className="flex flex-wrap justify-center gap-3">
        {learning > 0 && (
          <button
            type="button"
            onClick={onRepeatUnknown}
            className="flex h-12 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
          >
            <ArrowsClockwise size={18} weight="bold" />
            {t('study.repeatUnknown', { count: learning })}
          </button>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="flex h-12 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-6 text-[15px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
        >
          <ArrowClockwise size={18} weight="bold" />
          {t('study.restart')}
        </button>
      </div>
    </div>
  );
};
