/* Pure reducer for the WriteWords spelling game — web port of
   WriteWordsViewModel.swift (full difficulty system: easy / medium / hard,
   two training modes, hard-mode game-over). State is session-only; no
   persistence. Timing (auto-advance, incorrect flash clear, hard-mode
   countdown) is handled by the hook, not the reducer, so this stays fully
   unit-testable. */
import type {
  WriteWordsDifficulty,
  WriteWordsExercise,
  WriteWordsTrainingMode,
} from '@/lib/writingTypes';

export type WriteWordsValidation = 'idle' | 'correct' | 'incorrect';

export type WriteWordsGameOverReason = 'timeout' | 'wrongAnswer';

/** UI branch shown when the round ends. */
export type WriteWordsResult = 'win' | 'timeout' | 'wrongAnswer';

export interface WritingState {
  exercises: WriteWordsExercise[];
  currentIndex: number;
  typedAnswer: string;
  validation: WriteWordsValidation;
  /** Prefix-letter count revealed for the CURRENT card (resets on advance). */
  hintRevealed: number;
  completedWords: number;
  skippedWords: number;
  /** Medium-only skip-budget tracker (distinct from skippedWords). */
  skippedCount: number;
  hintsUsed: number;
  streak: number;
  isRoundCompleted: boolean;

  trainingMode: WriteWordsTrainingMode;
  difficulty: WriteWordsDifficulty;

  gameOver: boolean;
  gameOverReason: WriteWordsGameOverReason | null;
  gameOverWord: string;
  gameOverUserAnswer: string;
  gameOverCorrectAnswer: string;
}

export type WritingAction =
  | { type: 'SET_TYPED'; value: string }
  | { type: 'CLEAR_INCORRECT' }
  | { type: 'SUBMIT' }
  | { type: 'REVEAL_HINT' }
  | { type: 'SKIP' }
  | { type: 'ADVANCE' }
  | { type: 'RESTART' }
  | { type: 'SET_TRAINING_MODE'; mode: WriteWordsTrainingMode }
  | { type: 'SET_DIFFICULTY'; difficulty: WriteWordsDifficulty }
  | { type: 'TIMER_EXPIRED' };

interface InitOptions {
  trainingMode?: WriteWordsTrainingMode;
  difficulty?: WriteWordsDifficulty;
}

export const initialWritingState = (
  exercises: WriteWordsExercise[],
  opts: InitOptions = {},
): WritingState => ({
  exercises,
  currentIndex: 0,
  typedAnswer: '',
  validation: 'idle',
  hintRevealed: 0,
  completedWords: 0,
  skippedWords: 0,
  skippedCount: 0,
  hintsUsed: 0,
  streak: 0,
  isRoundCompleted: exercises.length === 0,
  trainingMode: opts.trainingMode ?? 'wordToTranslation',
  difficulty: opts.difficulty ?? 'easy',
  gameOver: false,
  gameOverReason: null,
  gameOverWord: '',
  gameOverUserAnswer: '',
  gameOverCorrectAnswer: '',
});

/* MARK: - Selectors */

export const activeExercise = (s: WritingState): WriteWordsExercise | null => {
  if (s.exercises.length === 0) return null;
  const idx = Math.min(s.currentIndex, s.exercises.length - 1);
  return s.exercises[idx];
};

/** Prompt shown as the big word on the exercise card (mode-dependent). */
export const displayWord = (s: WritingState): string => {
  const ex = activeExercise(s);
  if (!ex) return '';
  return s.trainingMode === 'wordToTranslation' ? ex.word : ex.translation;
};

/** Expected typed answer (mode-dependent), compared via normalize. */
export const correctAnswer = (s: WritingState): string => {
  const ex = activeExercise(s);
  if (!ex) return '';
  return s.trainingMode === 'wordToTranslation' ? ex.translation : ex.word;
};

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

/** Max prefix letters the hint can reveal, by difficulty (iOS maxHintLetters). */
export const maxHintLetters = (s: WritingState): number => {
  switch (s.difficulty) {
    case 'easy':
      return correctAnswer(s).length;
    case 'medium':
      return 1;
    case 'hard':
      return 0;
  }
};

export const isHintAvailable = (s: WritingState): boolean =>
  s.difficulty !== 'hard' && !isInteractionLocked(s) && s.hintRevealed < maxHintLetters(s);

/** Max skips allowed for the round, by difficulty (iOS maxSkipsAllowed). */
export const maxSkipsAllowed = (s: WritingState): number => {
  switch (s.difficulty) {
    case 'easy':
      return s.exercises.length;
    case 'medium':
      return Math.ceil(s.exercises.length * 0.25);
    case 'hard':
      return 0;
  }
};

export const canSkip = (s: WritingState): boolean => {
  if (isInteractionLocked(s)) return false;
  switch (s.difficulty) {
    case 'easy':
      return true;
    case 'medium':
      return s.skippedCount < maxSkipsAllowed(s);
    case 'hard':
      return false;
  }
};

/** Remaining skips (medium only — the UI shows "N skips left"). */
export const skipsRemaining = (s: WritingState): number =>
  Math.max(maxSkipsAllowed(s) - s.skippedCount, 0);

export const isTimed = (s: WritingState): boolean => s.difficulty === 'hard';

/** Correct locks input while auto-advance is pending; round-complete /
    game-over lock forever. */
export const isInteractionLocked = (s: WritingState): boolean =>
  s.isRoundCompleted || s.gameOver || s.validation === 'correct';

export const roundStats = (s: WritingState) => ({
  total: s.exercises.length,
  completed: s.completedWords,
  skipped: s.skippedWords,
  hints: s.hintsUsed,
  streak: s.streak,
  difficulty: s.difficulty,
});

/** Which end-screen to show, or null while the round is active. */
export const resultType = (s: WritingState): WriteWordsResult | null => {
  if (s.gameOver) return s.gameOverReason;
  if (s.isRoundCompleted) return 'win';
  return null;
};

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

const triggerGameOver = (
  s: WritingState,
  reason: WriteWordsGameOverReason,
): WritingState => ({
  ...s,
  gameOver: true,
  gameOverReason: reason,
  gameOverWord: displayWord(s),
  gameOverUserAnswer: s.typedAnswer.trim(),
  gameOverCorrectAnswer: correctAnswer(s),
  validation: 'incorrect',
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
      // Wrong answer. In hard mode a single mistake ends the round.
      if (s.difficulty === 'hard') {
        return triggerGameOver(s, 'wrongAnswer');
      }
      return { ...s, validation: 'incorrect' };
    }

    case 'REVEAL_HINT': {
      if (!isHintAvailable(s)) return s;
      return { ...s, hintRevealed: s.hintRevealed + 1, hintsUsed: s.hintsUsed + 1 };
    }

    case 'SKIP': {
      if (!canSkip(s)) return s;
      const nextIndex = s.currentIndex + 1;
      const done = nextIndex >= s.exercises.length;
      return {
        ...s,
        skippedWords: s.skippedWords + 1,
        skippedCount: s.difficulty === 'medium' ? s.skippedCount + 1 : s.skippedCount,
        streak: 0,
        currentIndex: done ? s.currentIndex : nextIndex,
        isRoundCompleted: done,
        ...resetForNextCard(),
      };
    }

    case 'ADVANCE': {
      // Fired by the hook 700ms after a correct answer (so the correct-lock
      // must NOT block it). Only round-complete / game-over stop it.
      if (s.isRoundCompleted || s.gameOver) return s;
      const nextIndex = s.currentIndex + 1;
      const done = nextIndex >= s.exercises.length;
      return {
        ...s,
        currentIndex: done ? s.currentIndex : nextIndex,
        isRoundCompleted: done,
        ...resetForNextCard(),
      };
    }

    case 'TIMER_EXPIRED': {
      // Only meaningful in hard mode while the round is active.
      if (s.difficulty !== 'hard' || isInteractionLocked(s)) return s;
      return triggerGameOver(s, 'timeout');
    }

    case 'SET_TRAINING_MODE':
      if (action.mode === s.trainingMode) return s;
      return initialWritingState(s.exercises, {
        trainingMode: action.mode,
        difficulty: s.difficulty,
      });

    case 'SET_DIFFICULTY':
      if (action.difficulty === s.difficulty) return s;
      return initialWritingState(s.exercises, {
        trainingMode: s.trainingMode,
        difficulty: action.difficulty,
      });

    case 'RESTART':
      return initialWritingState(s.exercises, {
        trainingMode: s.trainingMode,
        difficulty: s.difficulty,
      });

    default:
      return s;
  }
};
