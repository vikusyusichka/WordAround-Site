import { describe, expect, it } from 'vitest';

import {
  essayReducer,
  initialEssayState,
  type EssayState,
} from './essaySession';
import { ESSAY_LANGUAGES, type GeneratedEssayTask } from './essayTypes';

const spanish = ESSAY_LANGUAGES.find((l) => l.id === 'spanish')!;

const task = (overrides: Partial<GeneratedEssayTask> = {}): GeneratedEssayTask => ({
  id: 't-1',
  title: 'A rainy day',
  task: 'Write about a rainy day.',
  detectedLevel: 'A2',
  estimatedTimeMinutes: 12,
  wordLimitMin: 60,
  wordLimitMax: 100,
  quickTips: ['a', 'b', 'c'],
  ...overrides,
});

const init = (): EssayState => initialEssayState();

const run = (s: EssayState, ...actions: Parameters<typeof essayReducer>[1][]) =>
  actions.reduce((acc, a) => essayReducer(acc, a), s);

describe('essaySession initial', () => {
  it('starts in suggested mode, English, B1, empty essay', () => {
    const s = init();
    expect(s.topicMode).toBe('suggested');
    expect(s.selectedLanguage.id).toBe('english');
    expect(s.selectedDifficulty).toBe('B1');
    expect(s.task).toBeNull();
    expect(s.essayText).toBe('');
    expect(s.wordCount).toBe(0);
    expect(s.validation).toBe('empty');
  });
});

describe('config actions', () => {
  it('SET_TOPIC_MODE clears generationError', () => {
    const withErr = { ...init(), generationError: 'x' };
    const s = essayReducer(withErr, { type: 'SET_TOPIC_MODE', mode: 'custom' });
    expect(s.topicMode).toBe('custom');
    expect(s.generationError).toBeNull();
  });

  it('SET_TOPIC_MODE is a no-op when unchanged', () => {
    const s = init();
    expect(essayReducer(s, { type: 'SET_TOPIC_MODE', mode: 'suggested' })).toBe(s);
  });

  it('SET_CUSTOM_TOPIC updates the text', () => {
    const s = essayReducer(init(), { type: 'SET_CUSTOM_TOPIC', text: 'hobbies' });
    expect(s.customTopicText).toBe('hobbies');
  });

  it('SET_LANGUAGE and SET_DIFFICULTY update independently', () => {
    const s = run(
      init(),
      { type: 'SET_LANGUAGE', language: spanish },
      { type: 'SET_DIFFICULTY', difficulty: 'C1' },
    );
    expect(s.selectedLanguage.id).toBe('spanish');
    expect(s.selectedDifficulty).toBe('C1');
  });
});

describe('SET_ESSAY_TEXT + validation', () => {
  it('with no task, wordCount tracks but validation is always valid (min 0 / max ∞)', () => {
    const s = essayReducer(init(), { type: 'SET_ESSAY_TEXT', text: 'a b c' });
    expect(s.wordCount).toBe(3);
    expect(s.validation).toBe('valid');
  });

  it('with a task, validation transitions below → valid → above', () => {
    const withTask = essayReducer(init(), {
      type: 'GENERATION_SUCCESS',
      task: task({ wordLimitMin: 3, wordLimitMax: 5 }),
    });
    expect(essayReducer(withTask, { type: 'SET_ESSAY_TEXT', text: 'one two' }).validation).toBe('belowMinimum');
    expect(essayReducer(withTask, { type: 'SET_ESSAY_TEXT', text: 'a b c' }).validation).toBe('valid');
    expect(essayReducer(withTask, { type: 'SET_ESSAY_TEXT', text: 'a b c d e' }).validation).toBe('valid');
    expect(essayReducer(withTask, { type: 'SET_ESSAY_TEXT', text: 'a b c d e f' }).validation).toBe('aboveMaximum');
  });

  it('empty text goes back to validation="empty"', () => {
    const withTask = essayReducer(init(), {
      type: 'GENERATION_SUCCESS',
      task: task(),
    });
    const s = essayReducer(withTask, { type: 'SET_ESSAY_TEXT', text: '' });
    expect(s.validation).toBe('empty');
    expect(s.wordCount).toBe(0);
  });
});

describe('GENERATION lifecycle', () => {
  it('GENERATION_START sets isGenerating and clears error', () => {
    const s = essayReducer({ ...init(), generationError: 'err' }, { type: 'GENERATION_START' });
    expect(s.isGenerating).toBe(true);
    expect(s.generationError).toBeNull();
  });

  it('GENERATION_SUCCESS syncs difficulty, resets essay, appends title to history', () => {
    const s = run(
      init(),
      { type: 'GENERATION_START' },
      { type: 'GENERATION_SUCCESS', task: task({ title: 'A rainy day', detectedLevel: 'A2' }) },
    );
    expect(s.isGenerating).toBe(false);
    expect(s.task?.title).toBe('A rainy day');
    expect(s.selectedDifficulty).toBe('A2');
    expect(s.usedTaskTitles).toEqual(['A rainy day']);
    expect(s.essayText).toBe('');
    expect(s.validation).toBe('empty');
  });

  it('usedTaskTitles is capped at 12', () => {
    let s = init();
    for (let i = 0; i < 15; i++) {
      s = essayReducer(s, { type: 'GENERATION_SUCCESS', task: task({ title: `T${i}` }) });
    }
    expect(s.usedTaskTitles).toHaveLength(12);
    // Oldest kept = T3; most recent = T14.
    expect(s.usedTaskTitles[0]).toBe('T3');
    expect(s.usedTaskTitles[11]).toBe('T14');
  });

  it('GENERATION_FAIL clears isGenerating and stores error', () => {
    const s = run(
      init(),
      { type: 'GENERATION_START' },
      { type: 'GENERATION_FAIL', error: 'boom' },
    );
    expect(s.isGenerating).toBe(false);
    expect(s.generationError).toBe('boom');
  });
});

describe('RESET_ESSAY', () => {
  it('clears essay text but keeps the task', () => {
    const withTask = essayReducer(init(), { type: 'GENERATION_SUCCESS', task: task() });
    const withEssay = essayReducer(withTask, { type: 'SET_ESSAY_TEXT', text: 'a b c' });
    const reset = essayReducer(withEssay, { type: 'RESET_ESSAY' });
    expect(reset.essayText).toBe('');
    expect(reset.wordCount).toBe(0);
    expect(reset.validation).toBe('empty');
    expect(reset.task?.title).toBe('A rainy day');
  });
});
