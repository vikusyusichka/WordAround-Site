/* Unified end-of-round screen: win, timeout-lose, or wrong-answer-lose.
   Web port of WriteWordsResultScreenView (+ lose variants). Replaces the
   4A WriteWordsRoundFinish. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { WriteWordsResult } from '@/lib/writingSession';
import type { WriteWordsDifficulty } from '@/lib/writingTypes';

export interface WriteWordsResultStats {
  total: number;
  completed: number;
  skipped: number;
  hints: number;
  streak: number;
  difficulty: WriteWordsDifficulty;
}

export interface WrongAnswerDetails {
  word: string;
  userAnswer: string;
  correctAnswer: string;
}

interface WriteWordsResultScreenProps {
  result: WriteWordsResult;
  stats: WriteWordsResultStats;
  wrongAnswer: WrongAnswerDetails | null;
  onTryAgain: () => void;
  onExit: () => void;
}

const RESULT_ICON: Record<WriteWordsResult, string> = {
  win: 'party.popper.fill',
  timeout: 'hourglass',
  wrongAnswer: 'xmark',
};

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-2">
    <span className="text-[14px] font-semibold text-(--color-text-secondary) md:text-[15px]">
      {label}
    </span>
    <span className="text-right text-[14px] font-bold text-(--color-primary-blue-dark) md:text-[15px]">
      {value}
    </span>
  </div>
);

const Divider = () => <div className="h-px w-full bg-(--color-auth-field-border)" />;

export const WriteWordsResultScreen = ({
  result,
  stats,
  wrongAnswer,
  onTryAgain,
  onExit,
}: WriteWordsResultScreenProps) => {
  const { t } = useTranslation();
  const isWin = result === 'win';
  const isHardWin = isWin && stats.difficulty === 'hard';
  const difficultyLabel = t(`writing.writeWords.difficulty.${stats.difficulty}`);

  const titleKey =
    result === 'win' ? 'win' : result === 'timeout' ? 'timeout' : 'wrong';

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-white/80 bg-white/94 p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.07)] md:p-10">
      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        <div className="grid size-[72px] place-items-center rounded-full bg-linear-to-br from-(--color-primary-blue)/18 to-[#7363FF]/14">
          <Icon name={RESULT_ICON[result]} className="size-[30px] text-(--color-primary-blue-dark)" />
        </div>
        <h2 className="text-[24px] font-bold text-(--color-primary-blue-dark) md:text-[28px]">
          {t(`writing.writeWords.result.${titleKey}.title`)}
        </h2>
        <p className="max-w-sm text-[14px] font-semibold text-(--color-text-secondary) md:text-[15px]">
          {t(`writing.writeWords.result.${titleKey}.subtitle`)}
        </p>
      </div>

      {/* Stats card */}
      <div className="w-full rounded-2xl border border-white/85 bg-(--color-app-bg)/72 p-4 text-left md:p-5">
        {isWin ? (
          <>
            <StatRow label={t('writing.writeWords.result.totalWords')} value={`${stats.total}`} />
            <Divider />
            <StatRow label={t('writing.writeWords.result.completedWords')} value={`${stats.completed}`} />
            <Divider />
            <StatRow label={t('writing.writeWords.result.difficultyLabel')} value={difficultyLabel} />
            {isHardWin ? (
              <>
                <Divider />
                <div className="flex flex-col gap-1.5 py-2">
                  <span className="text-[14px] font-bold text-(--color-primary-blue-dark) md:text-[15px]">
                    {t('writing.writeWords.result.perfectTitle')}
                  </span>
                  <span className="text-[13px] font-semibold leading-snug text-(--color-text-secondary) md:text-[14px]">
                    {t('writing.writeWords.result.perfectBody')}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Divider />
                <StatRow label={t('writing.writeWords.result.skippedWords')} value={`${stats.skipped}`} />
                <Divider />
                <StatRow label={t('writing.writeWords.result.hintsUsed')} value={`${stats.hints}`} />
              </>
            )}
          </>
        ) : (
          <>
            {result === 'wrongAnswer' && wrongAnswer && (
              <>
                <StatRow label={t('writing.writeWords.result.word')} value={wrongAnswer.word} />
                <Divider />
                <StatRow
                  label={t('writing.writeWords.result.yourAnswer')}
                  value={wrongAnswer.userAnswer || '—'}
                />
                <Divider />
                <StatRow
                  label={t('writing.writeWords.result.correctAnswer')}
                  value={wrongAnswer.correctAnswer}
                />
                <Divider />
              </>
            )}
            <StatRow label={t('writing.writeWords.result.completedWords')} value={`${stats.completed}`} />
            <Divider />
            <StatRow label={t('writing.writeWords.result.streak')} value={`${stats.streak}`} />
            <Divider />
            <StatRow label={t('writing.writeWords.result.difficultyLabel')} value={difficultyLabel} />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onTryAgain}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-bold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
        >
          {t('writing.writeWords.result.tryAgain')}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white px-6 text-[15px] font-bold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
        >
          {t('writing.writeWords.back')}
        </button>
      </div>
    </div>
  );
};
