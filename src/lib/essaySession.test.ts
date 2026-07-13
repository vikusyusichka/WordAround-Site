import { describe, expect, it } from 'vitest';

import {
  essayReducer,
  initialEssayState,
  type EssayState,
} from './essaySession';
import { ESSAY_LANGUAGES, type EssayScore, type GeneratedEssayTask, type GrammarIssue } from './essayTypes';

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

/* MARK: - 4C2 additions: hints + grammar/score */

const dummyScore: EssayScore = {
  total: 80, grammar: 90, vocabulary: 80, length: 90, complexity: 75,
  relevance: 70, independence: 100, cefrLevel: 'B2', qualityLabel: 'Very good',
};

const dummyIssues: GrammarIssue[] = [
  { id: 'i1', message: 'x', incorrectText: 'a', suggestedCorrection: 'b',
    offset: 0, length: 1, category: 'grammar' },
];

describe('HINT lifecycle', () => {
  it('HINT_START sets isRequestingHint and clears error', () => {
    const s = essayReducer({ ...init(), hintError: 'boom' }, { type: 'HINT_START' });
    expect(s.isRequestingHint).toBe(true);
    expect(s.hintError).toBeNull();
  });

  it('HINT_SUCCESS appends hint and increments hintsUsedCount', () => {
    const s = run(
      init(),
      { type: 'HINT_START' },
      { type: 'HINT_SUCCESS', hint: { id: 'h1', text: 'Try adding an example.', category: 'content' } },
    );
    expect(s.isRequestingHint).toBe(false);
    expect(s.hints).toHaveLength(1);
    expect(s.hintsUsedCount).toBe(1);
  });

  it('HINT_SUCCESS re-scores if a score already exists (independence drops)', () => {
    const withTaskAndScore = run(
      init(),
      { type: 'GENERATION_SUCCESS', task: task() },
      { type: 'SET_ESSAY_TEXT', text: Array.from({ length: 80 }, () => 'day').join(' ') },
      { type: 'CHECK_SUCCESS', issues: [], score: dummyScore },
    );
    const before = withTaskAndScore.score!;
    const after = essayReducer(withTaskAndScore, {
      type: 'HINT_SUCCESS',
      hint: { id: 'h1', text: 'Add a personal example.', category: 'content' },
    });
    expect(after.hintsUsedCount).toBe(1);
    // score is recomputed — independence should be lower than before.
    expect(after.score!.independence).toBeLessThan(before.independence);
  });

  it('HINT_SUCCESS does NOT re-score when no prior score exists', () => {
    const s = essayReducer(init(), {
      type: 'HINT_SUCCESS',
      hint: { id: 'h1', text: 'x', category: 'content' },
    });
    expect(s.score).toBeNull();
  });

  it('HINT_FAIL sets hintError and clears loading', () => {
    const s = run(init(), { type: 'HINT_START' }, { type: 'HINT_FAIL', error: 'net' });
    expect(s.isRequestingHint).toBe(false);
    expect(s.hintError).toBe('net');
  });
});

describe('CHECK lifecycle', () => {
  it('CHECK_START sets isChecking and clears checkError', () => {
    const s = essayReducer({ ...init(), checkError: 'boom' }, { type: 'CHECK_START' });
    expect(s.isChecking).toBe(true);
    expect(s.checkError).toBeNull();
  });

  it('CHECK_SUCCESS stores issues and score, clears loading', () => {
    const s = run(
      init(),
      { type: 'CHECK_START' },
      { type: 'CHECK_SUCCESS', issues: dummyIssues, score: dummyScore },
    );
    expect(s.isChecking).toBe(false);
    expect(s.grammarIssues).toEqual(dummyIssues);
    expect(s.score).toEqual(dummyScore);
  });

  it('CHECK_FAIL clears loading + stores error, leaves prior score intact', () => {
    const withScore = essayReducer(init(), {
      type: 'CHECK_SUCCESS', issues: dummyIssues, score: dummyScore,
    });
    const failed = essayReducer(withScore, { type: 'CHECK_FAIL', error: 'timeout' });
    expect(failed.isChecking).toBe(false);
    expect(failed.checkError).toBe('timeout');
    // Prior score/issues are NOT cleared by CHECK_FAIL — only CLEAR_FEEDBACK and text edits do that.
    expect(failed.score).toEqual(dummyScore);
  });
});

describe('feedback invalidation', () => {
  it('SET_ESSAY_TEXT clears prior score + issues', () => {
    const withFeedback = run(
      init(),
      { type: 'GENERATION_SUCCESS', task: task() },
      { type: 'SET_ESSAY_TEXT', text: 'a b c d e' },
      { type: 'CHECK_SUCCESS', issues: dummyIssues, score: dummyScore },
    );
    expect(withFeedback.score).toEqual(dummyScore);
    const edited = essayReducer(withFeedback, { type: 'SET_ESSAY_TEXT', text: 'x y z' });
    expect(edited.score).toBeNull();
    expect(edited.grammarIssues).toEqual([]);
  });

  it('GENERATION_SUCCESS clears hints + feedback (new topic = fresh state)', () => {
    const dirty = run(
      init(),
      { type: 'GENERATION_SUCCESS', task: task() },
      { type: 'HINT_SUCCESS', hint: { id: 'h1', text: 'x', category: 'content' } },
      { type: 'CHECK_SUCCESS', issues: dummyIssues, score: dummyScore },
    );
    const fresh = essayReducer(dirty, {
      type: 'GENERATION_SUCCESS',
      task: task({ id: 't-2', title: 'A new topic' }),
    });
    expect(fresh.hints).toEqual([]);
    expect(fresh.hintsUsedCount).toBe(0);
    expect(fresh.grammarIssues).toEqual([]);
    expect(fresh.score).toBeNull();
  });

  it('CLEAR_FEEDBACK wipes score + issues but keeps hints', () => {
    const dirty = run(
      init(),
      { type: 'GENERATION_SUCCESS', task: task() },
      { type: 'HINT_SUCCESS', hint: { id: 'h1', text: 'x', category: 'content' } },
      { type: 'CHECK_SUCCESS', issues: dummyIssues, score: dummyScore },
    );
    const cleared = essayReducer(dirty, { type: 'CLEAR_FEEDBACK' });
    expect(cleared.score).toBeNull();
    expect(cleared.grammarIssues).toEqual([]);
    // Hints survive.
    expect(cleared.hints).toHaveLength(1);
  });
});

/* MARK: - 4C3 additions: translation + synonym usage counters */

describe('RECORD_TRANSLATION / RECORD_SYNONYM', () => {
  it('starts with zero usage counters', () => {
    const s = init();
    expect(s.usedTranslations).toBe(0);
    expect(s.usedSynonyms).toBe(0);
  });

  it('RECORD_TRANSLATION increments the counter', () => {
    const s = run(init(), { type: 'RECORD_TRANSLATION' }, { type: 'RECORD_TRANSLATION' });
    expect(s.usedTranslations).toBe(2);
    expect(s.usedSynonyms).toBe(0);
  });

  it('RECORD_SYNONYM increments the counter', () => {
    const s = essayReducer(init(), { type: 'RECORD_SYNONYM' });
    expect(s.usedSynonyms).toBe(1);
  });

  it('RECORD_TRANSLATION re-scores when a score exists (independence drops)', () => {
    const withScore = run(
      init(),
      { type: 'GENERATION_SUCCESS', task: task() },
      { type: 'SET_ESSAY_TEXT', text: Array.from({ length: 80 }, () => 'day').join(' ') },
      { type: 'CHECK_SUCCESS', issues: [], score: dummyScore },
    );
    const before = withScore.score!.independence;
    const after = essayReducer(withScore, { type: 'RECORD_TRANSLATION' });
    expect(after.usedTranslations).toBe(1);
    expect(after.score!.independence).toBeLessThan(before);
  });

  it('RECORD_SYNONYM does NOT re-score when no score exists', () => {
    const s = essayReducer(init(), { type: 'RECORD_SYNONYM' });
    expect(s.score).toBeNull();
  });

  it('GENERATION_SUCCESS resets the usage counters', () => {
    const dirty = run(
      init(),
      { type: 'GENERATION_SUCCESS', task: task() },
      { type: 'RECORD_TRANSLATION' },
      { type: 'RECORD_SYNONYM' },
    );
    expect(dirty.usedTranslations).toBe(1);
    const fresh = essayReducer(dirty, {
      type: 'GENERATION_SUCCESS',
      task: task({ id: 't-2', title: 'Another topic' }),
    });
    expect(fresh.usedTranslations).toBe(0);
    expect(fresh.usedSynonyms).toBe(0);
  });
});
