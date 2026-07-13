import { describe, expect, it } from 'vitest';

import { buildCustomTopicPrompt, buildSuggestedTopicPrompt } from './essayPrompts';
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
