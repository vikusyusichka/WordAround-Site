/* Body of the WriteWords route: composes settings button, prompt card,
   answer cells, real input (autofocused; Enter=submit), difficulty-aware
   controls, the hard-mode timer, and the unified result screen (win/lose).
   Loading / no-cards fallbacks render before the game. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { WriteWordsCard } from './WriteWordsCard';
import { WriteWordsCells } from './WriteWordsCells';
import { WriteWordsControls } from './WriteWordsControls';
import { WriteWordsResultScreen } from './WriteWordsResultScreen';
import { WriteWordsSettingsSheet } from './WriteWordsSettingsSheet';
import { WriteWordsTimerBar } from './WriteWordsTimerBar';
import { useWriteWords } from '@/hooks/useWriteWords';
import {
  canSkip,
  correctAnswer,
  displayWord,
  isHintAvailable,
  isInteractionLocked,
  isTimed,
  progress,
  progressText,
  resultType,
  roundStats,
  skipsRemaining,
} from '@/lib/writingSession';

interface WriteWordsScreenProps {
  setId: string;
}

export const WriteWordsScreen = ({ setId }: WriteWordsScreenProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, actions, isLoading, isError, hasSet, hasExercises, timerProgress, secondsRemaining } =
    useWriteWords(setId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* Refocus the input after every advance so the user can just keep typing. */
  useEffect(() => {
    if (!isInteractionLocked(state)) inputRef.current?.focus();
  }, [state.currentIndex, state]);

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
  const result = resultType(state);

  if (result) {
    return (
      <WriteWordsResultScreen
        result={result}
        stats={stats}
        wrongAnswer={
          result === 'wrongAnswer'
            ? {
                word: state.gameOverWord,
                userAnswer: state.gameOverUserAnswer,
                correctAnswer: state.gameOverCorrectAnswer,
              }
            : null
        }
        onTryAgain={actions.restart}
        onExit={goHome}
      />
    );
  }

  const answer = correctAnswer(state);
  const timed = isTimed(state);
  const canSubmit = state.typedAnswer.trim().length > 0 && !isInteractionLocked(state);
  const displayTitle =
    state.trainingMode === 'wordToTranslation'
      ? t('writing.writeWords.translatePrompt.word')
      : t('writing.writeWords.translatePrompt.translation');
  const skipsText =
    state.difficulty === 'medium'
      ? t('writing.writeWords.skipsLeft', { count: skipsRemaining(state) })
      : null;

  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Progress bar + text + settings */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-(--color-text-secondary) md:text-[15px]">
              {progressText(state)}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label={t('writing.writeWords.settings.title')}
                className="grid size-9 place-items-center rounded-full bg-white text-(--color-primary-blue-dark) shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5"
              >
                <Icon name="gearshape" className="size-[18px]" />
              </button>
              <button
                type="button"
                onClick={goHome}
                className="text-[13px] font-semibold text-(--color-primary-blue) hover:underline md:text-[14px]"
              >
                {t('writing.writeWords.back')}
              </button>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-goal-progress-bg)">
            <div
              className="h-full rounded-full bg-(--color-primary-blue) transition-[width] duration-200"
              style={{ width: `${Math.max(0, Math.min(progress(state), 1)) * 100}%` }}
            />
          </div>
          {timed && (
            <WriteWordsTimerBar progress={timerProgress} secondsRemaining={secondsRemaining} />
          )}
        </div>

        <WriteWordsCard displayTitle={displayTitle} displayWord={displayWord(state)} />

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
          showHint={state.difficulty !== 'hard'}
          isHintAvailable={isHintAvailable(state)}
          showSkip={state.difficulty !== 'hard'}
          canSkip={canSkip(state)}
          skipsRemainingText={skipsText}
          canSubmit={canSubmit}
          onHint={actions.hint}
          onSkip={actions.skip}
          onSubmit={actions.submit}
        />
      </div>

      <WriteWordsSettingsSheet
        open={settingsOpen}
        trainingMode={state.trainingMode}
        difficulty={state.difficulty}
        onSelectMode={actions.setMode}
        onSelectDifficulty={actions.setDifficulty}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
