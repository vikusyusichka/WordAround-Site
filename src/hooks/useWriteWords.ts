/* Wraps the pure WriteWords reducer with useReducer + timing side-effects.
   Timing lives here (not in the reducer): 700 ms auto-advance after a correct
   answer, and the hard-mode per-word countdown that dispatches TIMER_EXPIRED
   at zero. */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { useSetsQuery } from '@/hooks/useSets';
import { recordPractice } from '@/lib/dailyPracticeStats';
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

  /* Seed when the cards arrive. useReducer's initialiser runs on the first
     render only, and on that render the set is usually still being fetched —
     so without this the round starts empty and reports itself complete.
     Guarded on the round still being empty, so a background refetch never
     wipes a round in progress. */
  useEffect(() => {
    if (state.exercises.length === 0 && seedExercises.length > 0) {
      dispatch({ type: 'SEED', exercises: seedExercises });
    }
  }, [seedExercises, state.exercises.length]);

  /* Auto-advance after a correct submission. */
  useEffect(() => {
    if (state.validation !== 'correct') return;
    const id = window.setTimeout(() => dispatch({ type: 'ADVANCE' }), CORRECT_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [state.validation, state.currentIndex]);

  /* A wrong answer is NOT cleared on a timer. It used to vanish after 400ms,
     which is faster than the eye travels from the field to the verdict — and
     with no verdict rendered at all, the whole exchange read as a dead button.
     It clears when you start correcting the word instead, which is what iOS
     does (WriteWordsViewModel.validateAnswer) and what the reducer already
     handles on SET_TYPED. */

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

  /* iOS banks the words the moment the round ends — whether the learner
     finished the set or lost on a wrong answer (WriteWordsViewModel
     recordPracticeStatsIfNeeded). */
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    if (!state.isRoundCompleted && !state.gameOver) return;
    if (state.completedWords <= 0) return;
    recordedRef.current = true;
    recordPractice({
      skill: 'writing',
      value: state.completedWords,
      sourceModeID: 'write-from-sets',
    });
  }, [state.isRoundCompleted, state.gameOver, state.completedWords]);

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
