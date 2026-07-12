/* Wraps the pure study reducer with useReducer and persists card edits
   (add/edit/delete) to Firestore. Study progress stays session-only. Seed once
   per mount — do not re-seed on set refetches, so progress survives. */
import { useReducer } from 'react';

import { useUpdateSetCards } from '@/hooks/useSets';
import type { Flashcard, FlashcardSet } from '@/lib/models';
import {
  initialStudyState,
  studyReducer,
  type StudyAction,
} from '@/lib/studySession';

export const useStudySession = (set: FlashcardSet) => {
  const [state, dispatch] = useReducer(studyReducer, set.cards, initialStudyState);
  const updateCards = useUpdateSetCards();

  /* Dispatch + persist the resulting cards (compute the next state to get them). */
  const persist = (action: StudyAction) => {
    const next = studyReducer(state, action);
    dispatch(action);
    updateCards.mutate({ setId: set.id, cards: next.cards });
  };

  return {
    state,
    dispatch,
    isPersisting: updateCards.isPending,
    addCard: (card: Flashcard) => persist({ type: 'ADD_CARD', card }),
    saveEdit: (card: Flashcard) => persist({ type: 'SAVE_EDIT', card }),
    deleteCard: (cardId: string) => persist({ type: 'DELETE_CARD', cardId }),
  };
};
