/* Wraps the pure WriteWords reducer with useReducer + timing side-effects.
   Timing lives here (not in the reducer): 700 ms auto-advance after a correct
   answer, a 400 ms clear of the "incorrect" flash (easy/medium), and the
   hard-mode per-word countdown that dispatches TIMER_EXPIRED at zero. */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { useSetsQuery } from '@/hooks/useSets';
import type { FlashcardSet } from '@/lib/models';
import {
  correctAnswer,
  initialWritingState,
  isInteractionLocked,
  writingReducer,
  type WritingAction,
} from '@/lib/writingSession';
import {
  buildWriteWordsExercise,
  timerDurationFor,
  type WriteWordsDifficulty,
  type WriteWordsExercise,
  type WriteWordsTrainingMode,
} from '@/lib/writingTypes';

const CORRECT_ADVANCE_MS = 700;
const INCORRECT_CLEAR_MS = 400;
const TIMER_TICK_MS = 50;

export const useWriteWords = (setId: string) => {
  const { data: sets, isLoading, isError } = useSetsQuery();
  const set: FlashcardSet | undefined = useMemo(
    () => sets?.find((s) => s.id === setId),
    [sets, setId],
  );

  /* Seed once per mount — key on setId at the route level so switching sets
     remounts. Do not re-seed on refetch. */
  const seedExercises = useMemo<WriteWordsExercise[]>(
    () => (set ? set.cards.map(buildWriteWordsExercise) : []),
    [set],
  );

  const [state, dispatch] = useReducer(writingReducer, seedExercises, (ex) =>
    initialWritingState(ex),
  );

  /* Auto-advance after a correct submission. */
  useEffect(() => {
    if (state.validation !== 'correct') return;
    const id = window.setTimeout(() => dispatch({ type: 'ADVANCE' }), CORRECT_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [state.validation, state.currentIndex]);

  /* Clear the wrong-answer flash after a moment so the user can keep typing.
     (In hard mode a wrong answer ends the round, so validation is locked and
     this cleanly no-ops.) */
  useEffect(() => {
    if (state.validation !== 'incorrect' || state.gameOver) return;
    const id = window.setTimeout(() => dispatch({ type: 'CLEAR_INCORRECT' }), INCORRECT_CLEAR_MS);
    return () => window.clearTimeout(id);
  }, [state.validation, state.currentIndex, state.gameOver]);

  /* Hard-mode countdown. Restart on every new card; stop when locked. */
  const [timerProgress, setTimerProgress] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  const isTimed = state.difficulty === 'hard';
  const locked = isInteractionLocked(state);
  const answer = correctAnswer(state);

  useEffect(() => {
    if (!isTimed || locked) {
      startedAtRef.current = null;
      setTimerProgress(1);
      setSecondsRemaining(0);
      return;
    }

    const duration = timerDurationFor(answer);
    startedAtRef.current = performance.now();
    setTimerProgress(1);
    setSecondsRemaining(Math.ceil(duration));

    const id = window.setInterval(() => {
      if (startedAtRef.current === null) return;
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      const remaining = Math.max(duration - elapsed, 0);
      setTimerProgress(duration > 0 ? remaining / duration : 0);
      setSecondsRemaining(Math.ceil(remaining));
      if (remaining <= 0) {
        window.clearInterval(id);
        startedAtRef.current = null;
        dispatch({ type: 'TIMER_EXPIRED' });
      }
    }, TIMER_TICK_MS);

    return () => window.clearInterval(id);
    // Re-run on card change / difficulty change / lock transitions.
    // `answer` is derived from currentIndex+mode; included for correctness.
  }, [isTimed, locked, state.currentIndex, answer]);

  return {
    state,
    dispatch,
    set,
    isLoading,
    isError,
    hasSet: !!set,
    hasExercises: seedExercises.length > 0,
    timerProgress,
    secondsRemaining,
    actions: {
      type: (value: string) => dispatch({ type: 'SET_TYPED', value } as WritingAction),
      submit: () => dispatch({ type: 'SUBMIT' }),
      hint: () => dispatch({ type: 'REVEAL_HINT' }),
      skip: () => dispatch({ type: 'SKIP' }),
      restart: () => dispatch({ type: 'RESTART' }),
      setMode: (mode: WriteWordsTrainingMode) => dispatch({ type: 'SET_TRAINING_MODE', mode }),
      setDifficulty: (difficulty: WriteWordsDifficulty) =>
        dispatch({ type: 'SET_DIFFICULTY', difficulty }),
    },
  };
};
