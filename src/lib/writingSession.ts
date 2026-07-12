/* Pure reducer for the WriteWords spelling game — web port of the easy-mode
   subset of WriteWordsViewModel.swift. State is session-only; no persistence.
   Timing (auto-advance after correct, error flash clear) is handled by the
   hook, not the reducer, so this stays fully unit-testable. */
import type { WriteWordsExercise } from '@/lib/writingTypes';

export type WriteWordsValidation = 'idle' | 'correct' | 'incorrect';

export interface WritingState {
  exercises: WriteWordsExercise[];
  currentIndex: number;
  typedAnswer: string;
  validation: WriteWordsValidation;
  /** Prefix-letter count revealed for the CURRENT card (resets on advance). */
  hintRevealed: number;
  completedWords: number;
  skippedWords: number;
  hintsUsed: number;
  streak: number;
  isRoundCompleted: boolean;
}

export type WritingAction =
  | { type: 'SET_TYPED'; value: string }
  | { type: 'CLEAR_INCORRECT' }
  | { type: 'SUBMIT' }
  | { type: 'REVEAL_HINT' }
  | { type: 'SKIP' }
  | { type: 'ADVANCE' }
  | { type: 'RESTART' };

export const initialWritingState = (exercises: WriteWordsExercise[]): WritingState => ({
  exercises,
  currentIndex: 0,
  typedAnswer: '',
  validation: 'idle',
  hintRevealed: 0,
  completedWords: 0,
  skippedWords: 0,
  hintsUsed: 0,
  streak: 0,
  isRoundCompleted: exercises.length === 0,
});

/* MARK: - Selectors */

export const activeExercise = (s: WritingState): WriteWordsExercise | null => {
  if (s.exercises.length === 0) return null;
  const idx = Math.min(s.currentIndex, s.exercises.length - 1);
  return s.exercises[idx];
};

export const correctAnswer = (s: WritingState): string => activeExercise(s)?.correctAnswer ?? '';

export const totalCount = (s: WritingState): number => s.exercises.length;

export const progressText = (s: WritingState): string =>
  `${Math.min(s.currentIndex + 1, Math.max(s.exercises.length, 1))} / ${Math.max(
    s.exercises.length,
    1,
  )}`;

export const progress = (s: WritingState): number => {
  if (s.exercises.length === 0) return 0;
  return (s.currentIndex + 1) / s.exercises.length;
};

/** Hint text = the first `hintRevealed` characters of the current answer. */
export const hintOverlayText = (s: WritingState): string =>
  s.hintRevealed > 0 ? correctAnswer(s).slice(0, s.hintRevealed) : '';

export const maxHintLetters = (s: WritingState): number => correctAnswer(s).length;

export const isHintAvailable = (s: WritingState): boolean =>
  !isInteractionLocked(s) && s.hintRevealed < maxHintLetters(s);

/** Correct state locks input while auto-advance is pending; round-complete locks forever. */
export const isInteractionLocked = (s: WritingState): boolean =>
  s.isRoundCompleted || s.validation === 'correct';

export const roundStats = (s: WritingState) => ({
  total: s.exercises.length,
  completed: s.completedWords,
  skipped: s.skippedWords,
  hints: s.hintsUsed,
});

/* MARK: - Pure helper (matches WriteWordsViewModel.normalize) */

export const normalize = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .join(' ');

/* MARK: - Reducer */

const resetForNextCard = (): Partial<WritingState> => ({
  typedAnswer: '',
  validation: 'idle',
  hintRevealed: 0,
});

export const writingReducer = (s: WritingState, action: WritingAction): WritingState => {
  switch (action.type) {
    case 'SET_TYPED': {
      if (isInteractionLocked(s)) return s;
      // Typing after a wrong-answer flash clears the incorrect state.
      const validation = s.validation === 'incorrect' ? 'idle' : s.validation;
      return { ...s, typedAnswer: action.value, validation };
    }

    case 'CLEAR_INCORRECT':
      return s.validation === 'incorrect' ? { ...s, validation: 'idle' } : s;

    case 'SUBMIT': {
      if (isInteractionLocked(s)) return s;
      const answer = correctAnswer(s);
      if (answer.length === 0) return s;
      if (normalize(s.typedAnswer) === normalize(answer)) {
        return {
          ...s,
          validation: 'correct',
          streak: s.streak + 1,
          completedWords: s.completedWords + 1,
        };
      }
      return { ...s, validation: 'incorrect' };
    }

    case 'REVEAL_HINT': {
      if (!isHintAvailable(s)) return s;
      return { ...s, hintRevealed: s.hintRevealed + 1, hintsUsed: s.hintsUsed + 1 };
    }

    case 'SKIP': {
      if (isInteractionLocked(s)) return s;
      const nextIndex = s.currentIndex + 1;
      const done = nextIndex >= s.exercises.length;
      return {
        ...s,
        skippedWords: s.skippedWords + 1,
        streak: 0,
        currentIndex: done ? s.currentIndex : nextIndex,
        isRoundCompleted: done,
        ...resetForNextCard(),
      };
    }

    case 'ADVANCE': {
      if (s.isRoundCompleted) return s;
      const nextIndex = s.currentIndex + 1;
      const done = nextIndex >= s.exercises.length;
      return {
        ...s,
        currentIndex: done ? s.currentIndex : nextIndex,
        isRoundCompleted: done,
        ...resetForNextCard(),
      };
    }

    case 'RESTART':
      return initialWritingState(s.exercises);

    default:
      return s;
  }
};
