import { beforeEach, describe, expect, it, vi } from 'vitest';

const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock('@/lib/aiClient', () => ai);

import {
  buildChoicesPrompt,
  buildFirstChapterPrompt,
  buildNextChapterPrompt,
  buildStoryMemory,
  chaptersTargetFor,
  FALLBACK_CHOICES,
  generateChapter,
  parseChoices,
  storyItemFromSession,
  storyProgress,
  storySessionFromItem,
  type StoryChapter,
  type StoryConfiguration,
} from './storyMode';

const config: StoryConfiguration = {
  languageId: 'english',
  storyType: 'mystery',
  storyLength: 'multiChapter',
  difficulty: 'B1',
};

const chapter = (index: number, overrides?: Partial<StoryChapter>): StoryChapter => ({
  id: `ch${index}`,
  chapterIndex: index,
  text: `Chapter text ${index}. The detective walked slowly through the rain.`,
  choices: [],
  isCompleted: false,
  ...overrides,
});

describe('prompts (iOS verbatim)', () => {
  it('first chapter prompt', () => {
    const prompt = buildFirstChapterPrompt(config);
    expect(prompt).toContain('Write the opening chapter of an interactive mystery story in English.');
    expect(prompt).toContain('Target length: about 180-260 words for this chapter');
    expect(prompt).toContain('CEFR level B1: use medium-length sentences');
    expect(prompt).toContain('End at a natural decision point');
    expect(prompt).toContain('- Do not write a title or chapter heading.');
  });

  it('short story / infinite use their unit nouns + lengths', () => {
    const short = buildFirstChapterPrompt({ ...config, storyLength: 'shortStory' });
    expect(short).toContain('Write the opening short story');
    expect(short).toContain('about 250-350 words');
    const inf = buildFirstChapterPrompt({ ...config, storyLength: 'infinite' });
    expect(inf).toContain('Write the opening episode');
    expect(inf).toContain('about 160-240 words');
  });

  it('continuation prompt includes story memory of the LAST 3 chapters + the choice', () => {
    const chapters = [1, 2, 3, 4].map((i) =>
      chapter(i, { madeChoiceLabel: `choice ${i}` }),
    );
    const prompt = buildNextChapterPrompt(config, chapters, 'Follow the stranger');
    expect(prompt).toContain('Continue an interactive mystery story in English.');
    expect(prompt).not.toContain('Chapter 1:');
    expect(prompt).toContain('Chapter 2:');
    expect(prompt).toContain('Chapter 4:');
    expect(prompt).toContain('(reader chose: choice 2)');
    expect(prompt).toContain('The reader chose: "Follow the stranger".');
  });

  it('empty memory renders the placeholder', () => {
    expect(buildStoryMemory([])).toBe('(no previous chapters)');
  });

  it('choices prompt asks for exactly 3 short options', () => {
    const prompt = buildChoicesPrompt(config, 'Some passage.');
    expect(prompt).toContain('suggest exactly 3 distinct things');
    expect(prompt).toContain('short action phrase (3 to 8 words)');
    expect(prompt).toContain('Some passage.');
  });
});

describe('parseChoices', () => {
  it('strips numbering/bullets/quotes, dedupes, caps at 3', () => {
    const raw = '1. Follow the stranger\n- "Hide behind the door"\n• follow the stranger\n2) Call for help\n3. Run away fast';
    expect(parseChoices(raw)).toEqual(['Follow the stranger', 'Hide behind the door', 'Call for help']);
  });

  it('falls back when fewer than 2 usable options', () => {
    expect(parseChoices('only-one-option')).toEqual(FALLBACK_CHOICES);
    expect(parseChoices('')).toEqual(FALLBACK_CHOICES);
  });

  it('drops options outside 2-90 chars', () => {
    const long = 'x'.repeat(95);
    expect(parseChoices(`${long}\nGood option\nAnother good one`)).toEqual([
      'Good option', 'Another good one',
    ]);
  });
});

describe('storyProgress rules', () => {
  it('shortStory completes after 1 chapter', () => {
    expect(chaptersTargetFor('shortStory')).toBe(1);
    const before = storyProgress([chapter(1)], 'shortStory');
    expect(before.isStoryComplete).toBe(false);
    const after = storyProgress([chapter(1, { isCompleted: true })], 'shortStory');
    expect(after.isStoryComplete).toBe(true);
    expect(after.overallProgress).toBe(1);
  });

  it('multiChapter targets 5 chapters', () => {
    const chapters = [1, 2, 3].map((i) => chapter(i, { isCompleted: true }));
    const p = storyProgress(chapters, 'multiChapter');
    expect(p.totalChaptersTarget).toBe(5);
    expect(p.overallProgress).toBeCloseTo(3 / 5);
    expect(p.isStoryComplete).toBe(false);
    const done = storyProgress([1, 2, 3, 4, 5].map((i) => chapter(i, { isCompleted: true })), 'multiChapter');
    expect(done.isStoryComplete).toBe(true);
  });

  it('infinite never auto-completes; progress min(0.95, c/(c+1)); user end completes', () => {
    const chapters = [1, 2, 3].map((i) => chapter(i, { isCompleted: true }));
    const p = storyProgress(chapters, 'infinite');
    expect(p.isStoryComplete).toBe(false);
    expect(p.overallProgress).toBeCloseTo(0.75);
    const ended = storyProgress(chapters, 'infinite', true);
    expect(ended.isStoryComplete).toBe(true);
    expect(ended.overallProgress).toBe(1);
  });
});

describe('serialization round-trip', () => {
  it('storyItemFromSession ↔ storySessionFromItem', () => {
    const chapters = [
      chapter(1, { isCompleted: true, scorePercent: 80, madeChoiceLabel: 'Go left' }),
      chapter(2, { choices: [{ id: 'c1', label: 'Open the box' }] }),
    ];
    const item = storyItemFromSession({ ownerUID: 'u1', config, chapters });
    expect(item.modeID).toBe('story-mode');
    expect(item.sourceType).toBe('story');
    expect(item.status).toBe('inProgress');
    expect(item.comprehensionScore).toBeCloseTo(0.8);
    expect(item.selections.storyType).toBe('mystery');
    expect(item.selections.completedChapters).toBe('1');

    const restored = storySessionFromItem(item);
    expect(restored.config.storyType).toBe('mystery');
    expect(restored.config.storyLength).toBe('multiChapter');
    expect(restored.chapters).toHaveLength(2);
    expect(restored.chapters[0].scorePercent).toBe(80);
    expect(restored.chapters[0].madeChoiceLabel).toBe('Go left');
    expect(restored.chapters[1].choices[0].label).toBe('Open the box');
  });
});

describe('generateChapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('short story: one generation call, no choices', async () => {
    ai.generateText.mockResolvedValue('A complete short story text.');
    const ch = await generateChapter({ ...config, storyLength: 'shortStory' }, [], null);
    expect(ai.generateText).toHaveBeenCalledTimes(1);
    expect(ai.generateText.mock.calls[0][0].task).toBe('story_generation');
    expect(ch.choices).toEqual([]);
    expect(ch.chapterIndex).toBe(1);
  });

  it('multiChapter: chapter + choices calls; falls back on bad choices', async () => {
    ai.generateText
      .mockResolvedValueOnce('The next chapter text continues here.')
      .mockResolvedValueOnce('nonsense');
    const ch = await generateChapter(config, [chapter(1)], 'Go left');
    expect(ai.generateText).toHaveBeenCalledTimes(2);
    expect(ai.generateText.mock.calls[1][0].task).toBe('story_choices');
    expect(ch.chapterIndex).toBe(2);
    expect(ch.choices.map((c) => c.label)).toEqual(FALLBACK_CHOICES);
  });
});
