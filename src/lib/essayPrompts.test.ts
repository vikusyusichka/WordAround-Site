import { describe, expect, it } from 'vitest';

import { buildCustomTopicPrompt, buildHintPrompt, buildSuggestedTopicPrompt } from './essayPrompts';
import type { GrammarLanguage } from './essayTypes';

const english: GrammarLanguage = { id: 'english', title: 'English', shortTitle: 'EN' };
const ukrainian: GrammarLanguage = { id: 'ukrainian', title: 'Ukrainian', shortTitle: 'UK' };

describe('buildSuggestedTopicPrompt', () => {
  it('names the target language and asks for CEFR detection', () => {
    const p = buildSuggestedTopicPrompt(english, []);
    expect(p).toContain('English');
    expect(p).toContain('CEFR level');
    expect(p).toContain('essay-practice topic');
  });

  it('includes the JSON contract with all required keys', () => {
    const p = buildSuggestedTopicPrompt(ukrainian, []);
    expect(p).toContain('"title"');
    expect(p).toContain('"task"');
    expect(p).toContain('"detectedLevel"');
    expect(p).toContain('"estimatedTimeMinutes"');
    expect(p).toContain('"wordLimitMin"');
    expect(p).toContain('"wordLimitMax"');
    expect(p).toContain('"quickTips"');
  });

  it('embeds the avoid list only when non-empty', () => {
    expect(buildSuggestedTopicPrompt(english, [])).not.toContain('Do not reuse');
    const p = buildSuggestedTopicPrompt(english, ['My favorite pet', 'A rainy day']);
    expect(p).toContain('Do not reuse');
    expect(p).toContain('My favorite pet | A rainy day');
  });
});

describe('buildCustomTopicPrompt', () => {
  it("embeds the learner's seed topic and target language", () => {
    const p = buildCustomTopicPrompt('space travel', ukrainian);
    expect(p).toContain('Ukrainian');
    expect(p).toContain('space travel');
    expect(p).toContain("Base the topic on the learner's idea");
  });

  it('trims whitespace in the seed', () => {
    const p = buildCustomTopicPrompt('   hobbies   ', english);
    expect(p).toContain('"hobbies"');
  });
});

describe('buildHintPrompt', () => {
  it('embeds language, level, topic title, task, and essay preview', () => {
    const p = buildHintPrompt(
      english, 'B1', 'A rainy day', 'Write about a memorable rainy day.',
      'Yesterday it was raining.', [],
    );
    expect(p).toContain('Writing language: English');
    expect(p).toContain('Learner CEFR level: B1');
    expect(p).toContain('Essay title: A rainy day');
    expect(p).toContain('Yesterday it was raining.');
    expect(p).toContain('at most 12 words');
    expect(p).toContain('"text"');
    expect(p).toContain('"category"');
    expect(p).toContain('content|grammar|vocabulary|structure');
  });

  it("truncates the essay preview at 600 characters (iOS parity)", () => {
    const long = 'x'.repeat(1000);
    const p = buildHintPrompt(english, 'A1', 'T', 'K', long, []);
    // 600 x's plus surrounding quotes/text — assert the 600th x is there but the 601st isn't in the preview segment.
    const preview = p.match(/Learner's draft so far: "([^"]*)"/)?.[1] ?? '';
    expect(preview.length).toBe(600);
  });

  it('embeds previous-hint avoid list only when non-empty', () => {
    expect(buildHintPrompt(english, 'B1', 'T', 'K', 'draft', [])).not.toContain('Avoid repeating');
    const p = buildHintPrompt(english, 'B1', 'T', 'K', 'draft', ['tip a', 'tip b']);
    expect(p).toContain('Avoid repeating these earlier hints: tip a | tip b');
  });
});
