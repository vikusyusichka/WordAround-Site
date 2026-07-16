import { describe, expect, it } from 'vitest';

import { GrammarQuizValidationError, validateQuizQuestions } from './grammarQuizValidator';
import type { GrammarQuizQuestion } from './models';

const q = (overrides: Partial<GrammarQuizQuestion>): GrammarQuizQuestion => ({
  id: 'id-1',
  type: 'shortAnswer',
  questionText: 'What is this?',
  options: [],
  correctAnswer: 'answer',
  order: 0,
  ...overrides,
});

describe('validateQuizQuestions', () => {
  it('throws empty on []', () => {
    try {
      validateQuizQuestions([]);
      expect.unreachable();
    } catch (e) {
      expect((e as GrammarQuizValidationError).code).toBe('empty');
    }
  });

  it('throws on missing question text / answer', () => {
    expect(() => validateQuizQuestions([q({ questionText: '  ' })])).toThrow(/question text/);
    expect(() => validateQuizQuestions([q({ correctAnswer: '\n' })])).toThrow(/correct answer/);
  });

  it('trims text/answer and drops empty explanation', () => {
    const [out] = validateQuizQuestions([
      q({ questionText: '  Q?  ', correctAnswer: ' A ', explanation: '   ' }),
    ]);
    expect(out.questionText).toBe('Q?');
    expect(out.correctAnswer).toBe('A');
    expect(out.explanation).toBeUndefined();
  });

  it('multipleChoice: needs ≥2 options containing the answer; dedupes case-insensitively', () => {
    expect(() =>
      validateQuizQuestions([q({ type: 'multipleChoice', options: ['only'] , correctAnswer: 'only' })]),
    ).toThrow(/at least 2/);
    expect(() =>
      validateQuizQuestions([q({ type: 'multipleChoice', options: ['a', 'b'], correctAnswer: 'c' })]),
    ).toThrow(/contain the correct answer/);
    const [out] = validateQuizQuestions([
      q({ type: 'multipleChoice', options: [' A ', 'a', 'B', ''], correctAnswer: 'A' }),
    ]);
    expect(out.options).toEqual(['A', 'B']);
  });

  it('trueFalse: normalizes answer casing and forces options', () => {
    const [out] = validateQuizQuestions([
      q({ type: 'trueFalse', correctAnswer: 'TRUE', options: ['weird'] }),
    ]);
    expect(out.correctAnswer).toBe('True');
    expect(out.options).toEqual(['True', 'False']);
    expect(() =>
      validateQuizQuestions([q({ type: 'trueFalse', correctAnswer: 'yes' })]),
    ).toThrow(/True or False/);
  });

  it('fillGap: requires a blank; clears options', () => {
    expect(() =>
      validateQuizQuestions([q({ type: 'fillGap', questionText: 'no blank here' })]),
    ).toThrow(/blank/);
    const [out] = validateQuizQuestions([
      q({ type: 'fillGap', questionText: 'Fill: I _____ agree', options: ['x'] }),
    ]);
    expect(out.options).toEqual([]);
  });

  it('regenerates empty/duplicate ids and re-sequences order', () => {
    const out = validateQuizQuestions([
      q({ id: '', order: 7 }),
      q({ id: 'dup', order: 3 }),
      q({ id: 'dup', order: 9 }),
    ]);
    expect(out[0].id).not.toBe('');
    expect(out[1].id).toBe('dup');
    expect(out[2].id).not.toBe('dup');
    expect(out.map((x) => x.order)).toEqual([0, 1, 2]);
  });
});
