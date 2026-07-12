import { describe, expect, it } from 'vitest';

import type { WriteWordsExercise } from './writingTypes';
import {
  activeExercise,
  hintOverlayText,
  initialWritingState,
  isHintAvailable,
  isInteractionLocked,
  normalize,
  progress,
  progressText,
  roundStats,
  writingReducer,
  type WritingState,
} from './writingSession';

const exercise = (id: string, answer: string): WriteWordsExercise => ({
  id,
  displayWord: `w-${id}`,
  displayTitle: 'Translate',
  correctAnswer: answer,
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
  it('seeds index 0, idle validation, empty typed answer', () => {
    const s = init();
    expect(s.currentIndex).toBe(0);
    expect(s.typedAnswer).toBe('');
    expect(s.validation).toBe('idle');
    expect(s.hintRevealed).toBe(0);
    expect(s.isRoundCompleted).toBe(false);
    expect(activeExercise(s)?.id).toBe('a');
    expect(progressText(s)).toBe('1 / 3');
    expect(progress(s)).toBeCloseTo(1 / 3);
  });

  it('empty exercises → round already completed', () => {
    const s = initialWritingState([]);
    expect(s.isRoundCompleted).toBe(true);
    expect(activeExercise(s)).toBeNull();
  });
});

describe('normalize', () => {
  it('is trim + lowercase + collapse-whitespace', () => {
    expect(normalize('  YeLLoW   Apple  ')).toBe('yellow apple');
    expect(normalize('a\tb\n c')).toBe('a b c');
    expect(normalize('')).toBe('');
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

  it('wrong answer → validation incorrect, streak unchanged', () => {
    const s = run(init(), { type: 'SET_TYPED', value: 'pear' }, { type: 'SUBMIT' });
    expect(s.validation).toBe('incorrect');
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

describe('hint', () => {
  it('REVEAL_HINT reveals one letter at a time and counts', () => {
    const s = run(init(), { type: 'REVEAL_HINT' }, { type: 'REVEAL_HINT' });
    expect(s.hintRevealed).toBe(2);
    expect(hintOverlayText(s)).toBe('ap');
    expect(s.hintsUsed).toBe(2);
  });

  it('hint availability is capped at answer length', () => {
    let s = init(); // "apple" — 5 letters
    for (let i = 0; i < 6; i++) s = writingReducer(s, { type: 'REVEAL_HINT' });
    expect(s.hintRevealed).toBe(5);
    expect(isHintAvailable(s)).toBe(false);
    expect(hintOverlayText(s)).toBe('apple');
  });

  it('hint is unavailable while correct (locked)', () => {
    const s = run(init(), { type: 'SET_TYPED', value: 'apple' }, { type: 'SUBMIT' });
    expect(isInteractionLocked(s)).toBe(true);
    expect(isHintAvailable(s)).toBe(false);
  });
});

describe('SKIP', () => {
  it('SKIP advances, increments skippedWords, resets streak + card state', () => {
    const s = run(
      init(),
      { type: 'REVEAL_HINT' },
      { type: 'SET_TYPED', value: 'x' },
      { type: 'SKIP' },
    );
    expect(s.currentIndex).toBe(1);
    expect(s.skippedWords).toBe(1);
    expect(s.typedAnswer).toBe('');
    expect(s.hintRevealed).toBe(0);
    expect(s.streak).toBe(0);
    expect(activeExercise(s)?.id).toBe('b');
  });

  it('SKIP on the last card sets isRoundCompleted', () => {
    const s = run(init(), { type: 'SKIP' }, { type: 'SKIP' }, { type: 'SKIP' });
    expect(s.isRoundCompleted).toBe(true);
    expect(roundStats(s).skipped).toBe(3);
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

  it('ADVANCE past the last card completes the round', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' },
      { type: 'SUBMIT' },
      { type: 'ADVANCE' },
      { type: 'SET_TYPED', value: 'cat' },
      { type: 'SUBMIT' },
      { type: 'ADVANCE' },
      { type: 'SET_TYPED', value: 'yellow moon' },
      { type: 'SUBMIT' },
      { type: 'ADVANCE' },
    );
    expect(s.isRoundCompleted).toBe(true);
    expect(roundStats(s).completed).toBe(3);
    expect(activeExercise(s)?.id).toBe('c'); // clamped to last
  });
});

describe('RESTART', () => {
  it('RESTART resets everything to the initial state', () => {
    const s = run(
      init(),
      { type: 'SET_TYPED', value: 'apple' },
      { type: 'SUBMIT' },
      { type: 'ADVANCE' },
      { type: 'SKIP' },
      { type: 'REVEAL_HINT' },
      { type: 'RESTART' },
    );
    expect(s.currentIndex).toBe(0);
    expect(s.typedAnswer).toBe('');
    expect(s.validation).toBe('idle');
    expect(s.hintRevealed).toBe(0);
    expect(s.completedWords).toBe(0);
    expect(s.skippedWords).toBe(0);
    expect(s.hintsUsed).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.isRoundCompleted).toBe(false);
  });
});
