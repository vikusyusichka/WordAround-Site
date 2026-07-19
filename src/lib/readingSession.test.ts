import { describe, expect, it } from 'vitest';

import type { ReadingQuestion } from './readingQuestionService';
import {
  currentReadingQuestion,
  initialReadingSessionState,
  isLastReadingQuestion,
  readingProgressEstimate,
  readingSessionReducer,
  type ReadingSessionState,
} from './readingSession';
import { formatReadingTime, scoreReadingSession } from './readingScoring';

const q = (id: string, correct: string): ReadingQuestion => ({
  id,
  type: 'comprehension',
  prompt: `Q ${id}`,
  options: [correct, 'Wrong'],
  correctAnswer: correct,
});

const run = (
  s: ReadingSessionState,
  ...actions: Parameters<typeof readingSessionReducer>[1][]
) => actions.reduce(readingSessionReducer, s);

describe('readingSessionReducer', () => {
  it('reading → questions → completed with scoring', () => {
    let s = run(
      initialReadingSessionState,
      { type: 'START', questions: [q('a', 'Alpha'), q('b', 'Beta')] },
      { type: 'TICK' },
      { type: 'TICK' },
      { type: 'START_QUESTIONS' },
    );
    expect(s.phase).toBe('questions');
    expect(currentReadingQuestion(s)?.id).toBe('a');

    s = run(
      s,
      { type: 'SELECT_ANSWER', answer: 'Alpha' },
      { type: 'NEXT_QUESTION' },
      { type: 'SELECT_ANSWER', answer: 'Wrong' },
    );
    expect(isLastReadingQuestion(s)).toBe(true);

    s = readingSessionReducer(s, { type: 'FINISH', wordCount: 300 });
    expect(s.phase).toBe('completed');
    expect(s.result?.correctCount).toBe(1);
    expect(s.result?.comprehensionPercent).toBe(50);
    expect(s.result?.readingTimeSeconds).toBe(2);
    expect(s.result?.mistakes).toHaveLength(1);
  });

  it('START_QUESTIONS with no questions stays in reading (finish path)', () => {
    const s = run(
      initialReadingSessionState,
      { type: 'START', questions: [] },
      { type: 'START_QUESTIONS' },
    );
    expect(s.phase).toBe('reading');
  });

  it('WORD_TAP toggles selection', () => {
    let s = run(
      initialReadingSessionState,
      { type: 'START', questions: [] },
      { type: 'WORD_TAP', word: 'lighthouse' },
    );
    expect(s.selectedWord).toBe('lighthouse');
    s = readingSessionReducer(s, { type: 'WORD_TAP', word: 'lighthouse' });
    expect(s.selectedWord).toBeNull();
  });

  it('progress estimate: reading ≤ 0.45; questions 0.45 + share of 0.45', () => {
    let s = run(initialReadingSessionState, { type: 'START', questions: [q('a', 'x'), q('b', 'y')] });
    expect(readingProgressEstimate(s)).toBeLessThanOrEqual(0.45);
    s = run(s, { type: 'START_QUESTIONS' });
    expect(readingProgressEstimate(s)).toBeCloseTo(0.45 + 0.225, 5);
    s = run(s, { type: 'NEXT_QUESTION' });
    expect(readingProgressEstimate(s)).toBeCloseTo(0.9, 5);
  });
});

describe('scoring', () => {
  it('wpm uses the 1-second floor; answers compare trim+lowercase', () => {
    const result = scoreReadingSession({
      questions: [q('a', 'Alpha')],
      answers: { a: '  alpha ' },
      wordCount: 100,
      readingTimeSeconds: 0,
    });
    expect(result.correctCount).toBe(1);
    expect(result.wpm).toBe(6000); // 100 / (1/60)
  });

  it('formatReadingTime', () => {
    expect(formatReadingTime(95)).toBe('1m 35s');
    expect(formatReadingTime(42)).toBe('42s');
  });
});
