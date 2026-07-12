/* Body of the WriteWords route: composes prompt card, answer cells, real
   input (autofocused; Enter=submit), controls, and the round-finish view.
   Loading / no-cards fallbacks render before the game. */
import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { WriteWordsCard } from './WriteWordsCard';
import { WriteWordsCells } from './WriteWordsCells';
import { WriteWordsControls } from './WriteWordsControls';
import { WriteWordsRoundFinish } from './WriteWordsRoundFinish';
import { useWriteWords } from '@/hooks/useWriteWords';
import {
  activeExercise,
  correctAnswer,
  isHintAvailable,
  isInteractionLocked,
  progress,
  progressText,
  roundStats,
} from '@/lib/writingSession';

interface WriteWordsScreenProps {
  setId: string;
}

export const WriteWordsScreen = ({ setId }: WriteWordsScreenProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, actions, isLoading, isError, hasSet, hasExercises } = useWriteWords(setId);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Refocus the input after every advance so the user can just keep typing. */
  useEffect(() => {
    if (!state.isRoundCompleted) inputRef.current?.focus();
  }, [state.currentIndex, state.isRoundCompleted]);

  if (isLoading) {
    return (
      <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
        {t('writing.writeWords.loading')}
      </p>
    );
  }

  if (isError || !hasSet) {
    return (
      <p role="alert" className="py-16 text-center text-[15px] font-medium text-(--color-cs-red)">
        {t('writing.writeWords.loadError')}
      </p>
    );
  }

  if (!hasExercises) {
    return (
      <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
        {t('writing.writeWords.noCards')}
      </p>
    );
  }

  const stats = roundStats(state);
  const goHome = () => void navigate({ to: '/practice/writing' });

  if (state.isRoundCompleted) {
    return (
      <WriteWordsRoundFinish
        completed={stats.completed}
        skipped={stats.skipped}
        hintsUsed={stats.hints}
        total={stats.total}
        onRestart={actions.restart}
        onExit={goHome}
      />
    );
  }

  const exercise = activeExercise(state);
  if (!exercise) return null; // typing narrows; unreachable after hasExercises guard.

  const answer = correctAnswer(state);
  const canSubmit = state.typedAnswer.trim().length > 0 && !isInteractionLocked(state);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Progress bar + text */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-(--color-text-secondary) md:text-[15px]">
            {progressText(state)}
          </span>
          <button
            type="button"
            onClick={goHome}
            className="text-[13px] font-semibold text-(--color-primary-blue) hover:underline md:text-[14px]"
          >
            {t('writing.writeWords.back')}
          </button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-goal-progress-bg)">
          <div
            className="h-full rounded-full bg-(--color-primary-blue) transition-[width] duration-200"
            style={{ width: `${Math.max(0, Math.min(progress(state), 1)) * 100}%` }}
          />
        </div>
      </div>

      <WriteWordsCard displayTitle={exercise.displayTitle} displayWord={exercise.displayWord} />

      <WriteWordsCells
        correctAnswer={answer}
        typedAnswer={state.typedAnswer}
        hintRevealed={state.hintRevealed}
        validation={state.validation}
      />

      {/* Real text input — accepts native keyboard, mobile IMEs, paste. */}
      <input
        ref={inputRef}
        value={state.typedAnswer}
        onChange={(e) => actions.type(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            actions.submit();
          }
        }}
        placeholder={t('writing.writeWords.inputPlaceholder')}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={isInteractionLocked(state)}
        aria-label={t('writing.writeWords.inputPlaceholder')}
        className="mx-auto h-12 w-full max-w-md rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-center text-[16px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand) disabled:opacity-60"
      />

      <WriteWordsControls
        isHintAvailable={isHintAvailable(state)}
        canSubmit={canSubmit}
        onHint={actions.hint}
        onSkip={actions.skip}
        onSubmit={actions.submit}
      />
    </div>
  );
};
