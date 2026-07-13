import { describe, expect, it } from 'vitest';

import {
  computeWordCount,
  evaluateValidation,
  findLanguage,
  sanitizeTask,
} from './essayTypes';

describe('computeWordCount', () => {
  it('counts space/tab/newline-separated words', () => {
    expect(computeWordCount('one two three')).toBe(3);
    expect(computeWordCount('one\t two\nthree')).toBe(3);
    expect(computeWordCount('  padded   ')).toBe(1);
  });

  it('returns 0 for empty/whitespace-only input', () => {
    expect(computeWordCount('')).toBe(0);
    expect(computeWordCount('   \n  \t ')).toBe(0);
  });
});

describe('evaluateValidation', () => {
  it('returns empty when count is 0', () => {
    expect(evaluateValidation(0, 90, 150)).toBe('empty');
  });

  it('returns belowMinimum below the min', () => {
    expect(evaluateValidation(89, 90, 150)).toBe('belowMinimum');
  });

  it('returns valid at the boundaries', () => {
    expect(evaluateValidation(90, 90, 150)).toBe('valid');
    expect(evaluateValidation(150, 90, 150)).toBe('valid');
  });

  it('returns aboveMaximum above the max', () => {
    expect(evaluateValidation(151, 90, 150)).toBe('aboveMaximum');
  });
});

describe('sanitizeTask', () => {
  it('fills all fields when the AI returns a complete response', () => {
    const t = sanitizeTask({
      title: '  Hello ',
      task: '  Write. ',
      detectedLevel: 'B2',
      estimatedTimeMinutes: 15,
      wordLimitMin: 100,
      wordLimitMax: 200,
      quickTips: [' Tip 1 ', 'Tip 2', 'Tip 3'],
    });
    expect(t.title).toBe('Hello');
    expect(t.task).toBe('Write.');
    expect(t.detectedLevel).toBe('B2');
    expect(t.estimatedTimeMinutes).toBe(15);
    expect(t.wordLimitMin).toBe(100);
    expect(t.wordLimitMax).toBe(200);
    expect(t.quickTips).toEqual(['Tip 1', 'Tip 2', 'Tip 3']);
  });

  it('falls back to B1 for unknown CEFR strings', () => {
    // Cast because we're testing tolerance for values the AI might return.
    expect(sanitizeTask({ detectedLevel: 'wat' as unknown as 'B1' }).detectedLevel).toBe('B1');
  });

  it('fills tips to length 3', () => {
    expect(sanitizeTask({}).quickTips).toHaveLength(3);
    expect(sanitizeTask({ quickTips: ['only one'] }).quickTips).toHaveLength(3);
  });

  it('swaps min > max', () => {
    const t = sanitizeTask({ wordLimitMin: 200, wordLimitMax: 100 });
    expect(t.wordLimitMin).toBe(100);
    expect(t.wordLimitMax).toBe(200);
  });

  it('clamps time and word limits to sane ranges', () => {
    const t = sanitizeTask({
      estimatedTimeMinutes: 999,
      wordLimitMin: 1,
      wordLimitMax: 10000,
    });
    expect(t.estimatedTimeMinutes).toBeLessThanOrEqual(60);
    expect(t.wordLimitMin).toBeGreaterThanOrEqual(30);
    expect(t.wordLimitMax).toBeLessThanOrEqual(800);
  });
});

describe('findLanguage', () => {
  it('finds by id', () => {
    expect(findLanguage('ukrainian').title).toBe('Ukrainian');
  });

  it('falls back to English when id is unknown', () => {
    expect(findLanguage('klingon').id).toBe('english');
  });
});
