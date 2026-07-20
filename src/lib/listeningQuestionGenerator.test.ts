import { describe, expect, it } from 'vitest';

import { generateListeningQuestions } from './listeningQuestionGenerator';

const TEXT =
  'The lighthouse guided sailors safely along the dangerous coastline every night. ' +
  'Marta climbed the spiral staircase carrying her small lantern upstairs. ' +
  'The powerful beam swept across the darkened water toward the horizon. ' +
  'Fishermen trusted the ancient tower during every violent storm. ' +
  'The village celebrated the keeper with fresh bread every morning.';

describe('generateListeningQuestions', () => {
  it('empty text → no questions', () => {
    expect(generateListeningQuestions({ text: '', types: [], count: 5 })).toEqual([]);
  });

  it('mainIdea: 1 question, iOS prompt, correct = lead sentence', () => {
    const qs = generateListeningQuestions({ text: TEXT, types: ['mainIdea'], count: 5 });
    expect(qs).toHaveLength(1);
    expect(qs[0].prompt).toBe('What is the passage mainly about?');
    expect(qs[0].options).toHaveLength(4);
    expect(qs[0].options[qs[0].correctIndex]).toContain('lighthouse guided sailors');
  });

  it('details: up to 4 from sentences 2-5', () => {
    const qs = generateListeningQuestions({ text: TEXT, types: ['details'], count: 8 });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.length).toBeLessThanOrEqual(4);
    expect(qs[0].prompt).toBe('Which statement is mentioned in the passage?');
  });

  it('vocabulary: longest ≥6-char word, capitalized', () => {
    const qs = generateListeningQuestions({ text: TEXT, types: ['vocabulary'], count: 8 });
    expect(qs.length).toBeGreaterThan(0);
    const correct = qs[0].options[qs[0].correctIndex];
    expect(correct[0]).toBe(correct[0].toUpperCase());
    expect(correct.length).toBeGreaterThanOrEqual(6);
  });

  it('trueFalse alternates True (even) / never-swap False (odd)', () => {
    const qs = generateListeningQuestions({ text: TEXT, types: ['trueFalse'], count: 8 });
    const truths = qs.filter((q) => q.correctIndex === 0);
    const falses = qs.filter((q) => q.correctIndex === 1);
    expect(truths.length).toBeGreaterThan(0);
    expect(falses.length).toBeGreaterThan(0);
    expect(falses[0].prompt).toContain('never');
    expect(qs.every((q) => q.options.join() === 'True,False')).toBe(true);
  });

  it('caps at count and dedups prompts; empty types → all types', () => {
    const qs = generateListeningQuestions({ text: TEXT, types: [], count: 5 });
    expect(qs.length).toBeLessThanOrEqual(5);
    const prompts = qs.map((q) => q.prompt);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('forces a mainIdea question when nothing else produced', () => {
    const short = 'One good sentence lives here.';
    const qs = generateListeningQuestions({ text: short, types: ['details'], count: 5 });
    expect(qs.length).toBe(1);
    expect(qs[0].type).toBe('mainIdea');
  });
});
