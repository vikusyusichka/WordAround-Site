import { describe, expect, it } from 'vitest';

import type { WriteWordsExercise } from './writingTypes';
import {
  activeExercise,
  canSkip,
  correctAnswer,
  displayWord,
  hintOverlayText,
  initialWritingState,
  isHintAvailable,
  isInteractionLocked,
  maxHintLetters,
  maxSkipsAllowed,
  normalize,
  progress,
  progressText,
  resultType,
  roundStats,
  skipsRemaining,
  writingReducer,
  type WritingState,
} from './writingSession';

/** Factory: `answer` becomes the translation (correctAnswer in the default
    wordToTranslation mode); word is a stable stub. */
const exercise = (id: string, answer: string): WriteWordsExercise => ({
  id,
  word: `w-${id}`,
  translation: answer,
});

const exercises: WriteWordsExercise[] = [
  exercise('a', 'apple'),
  exercise('b', 'cat'),
  exercise('c', 'yellow moon'),
];

const init = (): WritingState => initialWritingState(exercises);

const run = (s: WritingState, ...actions: Parameters<typeof writingReducer>[1][]) =>
  actions.reduce((acc, a) => writingReducer(acc, a), s);

describe('writingSession initial', () => {
  it('seeds index 0, idle validation, easy/wordToTranslation defaults', () => {
    const s = init();
    expect(s.currentIndex).toBe(0);
    expect(s.typedAnswer).toBe('');
    expect(s.validation).toBe('idle');
    expect(s.hintRevealed).toBe(0);
    expect(s.isRoundCompleted).toBe(false);
    expect(s.difficulty).toBe('easy');
    expect(s.trainingMode).toBe('wordToTranslation');
    expect(s.gameOver).toBe(false);
    expect(activeExercise(s)?.id).toBe('a');
    expect(progressText(s)).toBe('1 / 3');
    expect(progress(s)).toBeCloseTo(1 / 3);
    expect(resultType(s)).toBeNull();
  });

  it('empty exercises → round already completed', () => {
    const s = initialWritingState([]);
    expect(s.isRoundCompleted).toBe(true);
    expect(activeExercise(s)).toBeNull();
    expect(resultType(s)).toBe('win');
  });
});

describe('normalize', () => {
  it('is trim + lowercase + collapse-whitespace', () => {
    expect(normalize('  YeLLoW   Apple  ')).toBe('yellow apple');
    expect(normalize('a\tb\n c')).toBe('a b c');
    expect(normalize('')).toBe('');
  });
});

describe('training mode', () => {
  it('wordToTranslation shows the word, expects the translation', () => {
    const s = init();
    expect(displayWord(s)).toBe('w-a');
    expect(correctAnswer(s)).toBe('apple');
  });

  it('translationToWord flips the direction', () => {
    const s = writingReducer(init(), { type: 'SET_TRAINING_MODE', mode: 'translationToWord' });
    expect(displayWord(s)).toBe('apple');
    expect(correctAnswer(s)).toBe('w-a');
  });

  it('SET_TRAINING_MODE resets the round', () => {
    const dirty = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' },
      { type: 'SUBMIT' },
      { type: 'ADVANCE' },
    );
    expect(dirty.currentIndex).toBe(1);
    const reset = writingReducer(dirty, { type: 'SET_TRAINING_MODE', mode: 'translationToWord' });
    expect(reset.currentIndex).toBe(0);
    expect(reset.completedWords).toBe(0);
    expect(reset.trainingMode).toBe('translationToWord');
  });

  it('SET_TRAINING_MODE to the same mode is a no-op', () => {
    const s = init();
    expect(writingReducer(s, { type: 'SET_TRAINING_MODE', mode: 'wordToTranslation' })).toBe(s);
  });
});

describe('typing', () => {
  it('SET_TYPED stores the value', () => {
    const s = run(init(), { type: 'SET_TYPED', value: 'app' });
    expect(s.typedAnswer).toBe('app');
    expect(s.validation).toBe('idle');
  });

  it('typing after an incorrect flash resets validation to idle', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'wrong' },
      { type: 'SUBMIT' },
      { type: 'SET_TYPED', value: 'a' },
    );
    expect(s.validation).toBe('idle');
    expect(s.typedAnswer).toBe('a');
  });

  it('SET_TYPED ignored while validation is correct (locked)', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' },
      { type: 'SUBMIT' },
      { type: 'SET_TYPED', value: 'oops' },
    );
    expect(s.validation).toBe('correct');
    expect(s.typedAnswer).toBe('apple');
  });
});

describe('SUBMIT', () => {
  it('normalizes both sides — extra spaces and casing pass', () => {
    const s = run(init(), { type: 'SET_TYPED', value: '  Apple  ' }, { type: 'SUBMIT' });
    expect(s.validation).toBe('correct');
    expect(s.completedWords).toBe(1);
    expect(s.streak).toBe(1);
  });

  it('multi-word answer normalizes internal whitespace', () => {
    const s = initialWritingState([exercise('m', 'yellow moon')]);
    const r = run(s, { type: 'SET_TYPED', value: '  Yellow    Moon ' }, { type: 'SUBMIT' });
    expect(r.validation).toBe('correct');
  });

  it('wrong answer (easy) → validation incorrect, not game over', () => {
    const s = run(init(), { type: 'SET_TYPED', value: 'pear' }, { type: 'SUBMIT' });
    expect(s.validation).toBe('incorrect');
    expect(s.gameOver).toBe(false);
    expect(s.completedWords).toBe(0);
    expect(s.streak).toBe(0);
  });

  it('CLEAR_INCORRECT resets an incorrect flash', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'pear' },
      { type: 'SUBMIT' },
      { type: 'CLEAR_INCORRECT' },
    );
    expect(s.validation).toBe('idle');
  });

  it('SUBMIT is idempotent while correct (locked)', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' },
      { type: 'SUBMIT' },
      { type: 'SUBMIT' },
    );
    expect(s.completedWords).toBe(1);
    expect(s.streak).toBe(1);
  });
});

describe('difficulty — hints', () => {
  it('easy allows revealing the full answer', () => {
    const s = init();
    expect(maxHintLetters(s)).toBe(5); // "apple"
    expect(isHintAvailable(s)).toBe(true);
  });

  it('medium caps hints at 1 letter', () => {
    const s = writingReducer(init(), { type: 'SET_DIFFICULTY', difficulty: 'medium' });
    expect(maxHintLetters(s)).toBe(1);
    const revealed = writingReducer(s, { type: 'REVEAL_HINT' });
    expect(revealed.hintRevealed).toBe(1);
    expect(isHintAvailable(revealed)).toBe(false);
  });

  it('hard allows no hints', () => {
    const s = writingReducer(init(), { type: 'SET_DIFFICULTY', difficulty: 'hard' });
    expect(maxHintLetters(s)).toBe(0);
    expect(isHintAvailable(s)).toBe(false);
    const r = writingReducer(s, { type: 'REVEAL_HINT' });
    expect(r.hintRevealed).toBe(0);
  });

  it('REVEAL_HINT reveals one letter at a time and counts (easy)', () => {
    const s = run(init(), { type: 'REVEAL_HINT' }, { type: 'REVEAL_HINT' });
    expect(s.hintRevealed).toBe(2);
    expect(hintOverlayText(s)).toBe('ap');
    expect(s.hintsUsed).toBe(2);
  });

  it('hint is unavailable while correct (locked)', () => {
    const s = run(init(), { type: 'SET_TYPED', value: 'apple' }, { type: 'SUBMIT' });
    expect(isInteractionLocked(s)).toBe(true);
    expect(isHintAvailable(s)).toBe(false);
  });
});

describe('difficulty — skips', () => {
  it('easy allows unlimited skips', () => {
    const s = init();
    expect(maxSkipsAllowed(s)).toBe(3);
    expect(canSkip(s)).toBe(true);
  });

  it('medium caps skips at ceil(25%) and tracks skippedCount', () => {
    // 3 cards → ceil(0.75) = 1 skip allowed.
    const s = writingReducer(init(), { type: 'SET_DIFFICULTY', difficulty: 'medium' });
    expect(maxSkipsAllowed(s)).toBe(1);
    expect(skipsRemaining(s)).toBe(1);
    const afterOne = writingReducer(s, { type: 'SKIP' });
    expect(afterOne.skippedCount).toBe(1);
    expect(canSkip(afterOne)).toBe(false);
    // A second skip is blocked.
    const afterTwo = writingReducer(afterOne, { type: 'SKIP' });
    expect(afterTwo.currentIndex).toBe(afterOne.currentIndex);
    expect(afterTwo.skippedCount).toBe(1);
  });

  it('hard forbids skipping', () => {
    const s = writingReducer(init(), { type: 'SET_DIFFICULTY', difficulty: 'hard' });
    expect(canSkip(s)).toBe(false);
    const r = writingReducer(s, { type: 'SKIP' });
    expect(r.currentIndex).toBe(0);
    expect(r.skippedWords).toBe(0);
  });

  it('easy SKIP advances, increments skippedWords, resets card state', () => {
    const s = run(
      init(),
      { type: 'REVEAL_HINT' },
      { type: 'SET_TYPED', value: 'x' },
      { type: 'SKIP' },
    );
    expect(s.currentIndex).toBe(1);
    expect(s.skippedWords).toBe(1);
    expect(s.skippedCount).toBe(0); // only medium tracks skippedCount
    expect(s.typedAnswer).toBe('');
    expect(s.streak).toBe(0);
    expect(activeExercise(s)?.id).toBe('b');
  });
});

describe('hard mode game-over', () => {
  const hard = () => writingReducer(init(), { type: 'SET_DIFFICULTY', difficulty: 'hard' });

  it('wrong answer ends the round with captured details', () => {
    const s = run(hard(), { type: 'SET_TYPED', value: 'banana' }, { type: 'SUBMIT' });
    expect(s.gameOver).toBe(true);
    expect(s.gameOverReason).toBe('wrongAnswer');
    expect(s.gameOverWord).toBe('w-a');
    expect(s.gameOverUserAnswer).toBe('banana');
    expect(s.gameOverCorrectAnswer).toBe('apple');
    expect(resultType(s)).toBe('wrongAnswer');
    expect(isInteractionLocked(s)).toBe(true);
  });

  it('TIMER_EXPIRED ends the round with a timeout', () => {
    const s = writingReducer(hard(), { type: 'TIMER_EXPIRED' });
    expect(s.gameOver).toBe(true);
    expect(s.gameOverReason).toBe('timeout');
    expect(resultType(s)).toBe('timeout');
  });

  it('TIMER_EXPIRED is a no-op in easy/medium', () => {
    const easy = writingReducer(init(), { type: 'TIMER_EXPIRED' });
    expect(easy.gameOver).toBe(false);
    const medium = writingReducer(
      writingReducer(init(), { type: 'SET_DIFFICULTY', difficulty: 'medium' }),
      { type: 'TIMER_EXPIRED' },
    );
    expect(medium.gameOver).toBe(false);
  });

  it('correct answers can win hard mode', () => {
    const s = run(
      hard(),
      { type: 'SET_TYPED', value: 'apple' }, { type: 'SUBMIT' }, { type: 'ADVANCE' },
      { type: 'SET_TYPED', value: 'cat' }, { type: 'SUBMIT' }, { type: 'ADVANCE' },
      { type: 'SET_TYPED', value: 'yellow moon' }, { type: 'SUBMIT' }, { type: 'ADVANCE' },
    );
    expect(s.isRoundCompleted).toBe(true);
    expect(s.gameOver).toBe(false);
    expect(resultType(s)).toBe('win');
    expect(roundStats(s).completed).toBe(3);
  });
});

describe('ADVANCE', () => {
  it('ADVANCE moves to the next card and resets card-local state', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' },
      { type: 'SUBMIT' },
      { type: 'ADVANCE' },
    );
    expect(s.currentIndex).toBe(1);
    expect(s.typedAnswer).toBe('');
    expect(s.validation).toBe('idle');
    expect(s.hintRevealed).toBe(0);
  });

  it('ADVANCE past the last card completes the round (win)', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' }, { type: 'SUBMIT' }, { type: 'ADVANCE' },
      { type: 'SET_TYPED', value: 'cat' }, { type: 'SUBMIT' }, { type: 'ADVANCE' },
      { type: 'SET_TYPED', value: 'yellow moon' }, { type: 'SUBMIT' }, { type: 'ADVANCE' },
    );
    expect(s.isRoundCompleted).toBe(true);
    expect(resultType(s)).toBe('win');
    expect(roundStats(s).completed).toBe(3);
    expect(activeExercise(s)?.id).toBe('c'); // clamped to last
  });
});

describe('SET_DIFFICULTY / RESTART', () => {
  it('SET_DIFFICULTY resets progress and keeps the new difficulty', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' }, { type: 'SUBMIT' }, { type: 'ADVANCE' },
      { type: 'SET_DIFFICULTY', difficulty: 'hard' },
    );
    expect(s.difficulty).toBe('hard');
    expect(s.currentIndex).toBe(0);
    expect(s.completedWords).toBe(0);
  });

  it('SET_DIFFICULTY to the same value is a no-op', () => {
    const s = init();
    expect(writingReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'easy' })).toBe(s);
  });

  it('RESTART resets progress but keeps mode + difficulty', () => {
    const s = run(
      writingReducer(init(), { type: 'SET_DIFFICULTY', difficulty: 'hard' }),
      { type: 'SET_TYPED', value: 'banana' }, { type: 'SUBMIT' }, // hard wrong → game over
      { type: 'RESTART' },
    );
    expect(s.difficulty).toBe('hard');
    expect(s.gameOver).toBe(false);
    expect(s.currentIndex).toBe(0);
    expect(s.completedWords).toBe(0);
    expect(s.streak).toBe(0);
    expect(resultType(s)).toBeNull();
  });
});
