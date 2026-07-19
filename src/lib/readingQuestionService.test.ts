import { describe, expect, it } from 'vitest';

import { generateReadingQuestions, maxQuestionsForFocus } from './readingQuestionService';
import type { ReadingQuestionType } from './models';

const CONTENT =
  'The lighthouse guided sailors safely along the dangerous coastline every night. ' +
  'Marta climbed the spiral staircase carrying her small lantern upstairs. ' +
  'The powerful beam swept across the darkened water toward the horizon. ' +
  'Fishermen trusted the ancient tower during every violent storm. ' +
  'The village celebrated the keeper with fresh bread every morning.';

const input = (types: ReadingQuestionType[], overrides?: Partial<Parameters<typeof generateReadingQuestions>[0]>) => ({
  content: CONTENT,
  title: 'The Lighthouse',
  preview: 'The lighthouse guided sailors…',
  focus: 'mainIdea' as const,
  enabledTypes: types,
  ...overrides,
});

describe('generateReadingQuestions', () => {
  it('empty content → no questions', () => {
    expect(generateReadingQuestions(input(['comprehension'], { content: '  ' }))).toEqual([]);
  });

  it('comprehension: lead sentence is the correct answer, 4 options, focus-based prompt', () => {
    const [q] = generateReadingQuestions(input(['comprehension']));
    expect(q.type).toBe('comprehension');
    expect(q.prompt).toBe('What is the main idea of "The Lighthouse"?');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain(q.correctAnswer);
    expect(q.correctAnswer).toContain('lighthouse guided sailors');
  });

  it('vocabulary focus changes the comprehension prompt', () => {
    const [q] = generateReadingQuestions(input(['comprehension'], { focus: 'vocabulary' }));
    expect(q.prompt).toBe('Which option best summarizes "The Lighthouse"?');
  });

  it('trueFalse alternates True (even) / False with "never" substitution (odd)', () => {
    const qs = generateReadingQuestions(input(['trueFalse']));
    const truths = qs.filter((q) => q.correctAnswer === 'True');
    const falses = qs.filter((q) => q.correctAnswer === 'False');
    expect(truths.length).toBeGreaterThan(0);
    expect(falses.length).toBeGreaterThan(0);
    expect(falses[0].prompt).toContain('never');
    expect(qs.every((q) => q.options.join() === 'True,False')).toBe(true);
  });

  it('fillGap blanks the longest ≥5-char word with ____', () => {
    const qs = generateReadingQuestions(input(['fillGap']));
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.prompt).toContain('____');
      expect(q.options.map((o) => o.toLowerCase())).toContain(q.correctAnswer.toLowerCase());
    }
  });

  it('vocabulary picks the longest ≥6-char word from the sentence', () => {
    const qs = generateReadingQuestions(input(['vocabulary']));
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0].correctAnswer[0]).toBe(qs[0].correctAnswer[0].toUpperCase());
  });

  it('orderReconstruction requires ≥3 sentences and numbers the correct order', () => {
    const qs = generateReadingQuestions(input(['orderReconstruction']));
    expect(qs).toHaveLength(1);
    expect(qs[0].correctAnswer.startsWith('1. ')).toBe(true);
    expect(qs[0].options).toContain(qs[0].correctAnswer);
  });

  it('detailedComprehension focus adds detail questions', () => {
    const qs = generateReadingQuestions(
      input(['comprehension'], { focus: 'detailedComprehension' }),
    );
    expect(qs.length).toBeGreaterThan(1);
    expect(qs.some((q) => q.prompt === 'Which statement best reflects this part of the text?')).toBe(true);
  });

  it('caps at maxQuestions and dedups prompts', () => {
    const qs = generateReadingQuestions(
      input(['comprehension', 'trueFalse', 'vocabulary', 'fillGap', 'findEvidence'], {
        maxQuestions: 5,
      }),
    );
    expect(qs.length).toBeLessThanOrEqual(5);
    const prompts = qs.map((q) => q.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('empty enabledTypes falls back to defaults', () => {
    const qs = generateReadingQuestions(input([]));
    expect(qs.length).toBeGreaterThan(0);
  });

  it('maxQuestionsForFocus: 8 for vocabulary else 7', () => {
    expect(maxQuestionsForFocus('vocabulary')).toBe(8);
    expect(maxQuestionsForFocus('mainIdea')).toBe(7);
  });
});
