/* Wraps the pure WriteWords reducer with useReducer + timing side-effects.
   Timing lives here (not in the reducer): 700 ms auto-advance after a correct
   answer (mirrors WriteWordsViewModel.TimerConstants.correctAdvanceDelay), and
   a 400 ms clear of the "incorrect" flash so the user can keep typing. */
import { useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import { useSetsQuery } from '@/hooks/useSets';
import type { FlashcardSet } from '@/lib/models';
import {
  initialWritingState,
  writingReducer,
  type WritingAction,
} from '@/lib/writingSession';
import { buildWriteWordsExercise, type WriteWordsExercise } from '@/lib/writingTypes';

const CORRECT_ADVANCE_MS = 700;
const INCORRECT_CLEAR_MS = 400;

export const useWriteWords = (setId: string) => {
  const { t } = useTranslation();
  const { data: sets, isLoading, isError } = useSetsQuery();
  const set: FlashcardSet | undefined = useMemo(
    () => sets?.find((s) => s.id === setId),
    [sets, setId],
  );

  /* Seed once per mount — key on setId at the route level so switching sets
     remounts. Do not re-seed on refetch. */
  const seedExercises = useMemo<WriteWordsExercise[]>(
    () => (set ? set.cards.map((c) => buildWriteWordsExercise(c, t('writing.writeWords.translateHint'))) : []),
    // Deliberately do NOT depend on `t` — locale changes won't re-shuffle the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [set],
  );

  const [state, dispatch] = useReducer(writingReducer, seedExercises, initialWritingState);

  /* Auto-advance after a correct submission. */
  useEffect(() => {
    if (state.validation !== 'correct') return;
    const id = window.setTimeout(() => dispatch({ type: 'ADVANCE' }), CORRECT_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [state.validation, state.currentIndex]);

  /* Clear the wrong-answer flash after a moment so the user can keep typing.
     (The reducer also clears on SET_TYPED, so this only fires if the user
     leaves the input untouched after a wrong submit.) */
  useEffect(() => {
    if (state.validation !== 'incorrect') return;
    const id = window.setTimeout(() => dispatch({ type: 'CLEAR_INCORRECT' }), INCORRECT_CLEAR_MS);
    return () => window.clearTimeout(id);
  }, [state.validation, state.currentIndex]);

  return {
    state,
    dispatch,
    set,
    isLoading,
    isError,
    hasSet: !!set,
    hasExercises: seedExercises.length > 0,
    actions: {
      type: (value: string) => dispatch({ type: 'SET_TYPED', value } as WritingAction),
      submit: () => dispatch({ type: 'SUBMIT' }),
      hint: () => dispatch({ type: 'REVEAL_HINT' }),
      skip: () => dispatch({ type: 'SKIP' }),
      restart: () => dispatch({ type: 'RESTART' }),
    },
  };
};
