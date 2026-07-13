import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/aiClient', () => ({
  generateJSON: vi.fn(),
}));

const { generateJSON } = await import('@/lib/aiClient');
const { generateSuggestedTask, generateCustomTopicTask, generateHint } = await import('./essayService');
const { ESSAY_LANGUAGES } = await import('./essayTypes');

const english = ESSAY_LANGUAGES[0];

const rawTopic = (title: string) => ({
  title,
  task: 'Write about it.',
  detectedLevel: 'B1',
  estimatedTimeMinutes: 12,
  wordLimitMin: 90,
  wordLimitMax: 150,
  quickTips: ['A', 'B', 'C'],
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('generateSuggestedTask', () => {
  it('calls the AI once when the returned title is not in the avoid list', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce(rawTopic('A new hobby'));
    const out = await generateSuggestedTask(english, ['Old topic']);
    expect(out.title).toBe('A new hobby');
    expect(generateJSON).toHaveBeenCalledTimes(1);
  });

  it('retries once with the duplicate added to the avoid list', async () => {
    vi.mocked(generateJSON)
      .mockResolvedValueOnce(rawTopic('Space travel'))
      .mockResolvedValueOnce(rawTopic('Ocean life'));

    const out = await generateSuggestedTask(english, ['space travel']); // case-insensitive
    expect(out.title).toBe('Ocean life');
    expect(generateJSON).toHaveBeenCalledTimes(2);

    // Second call must include the first-attempt title in its prompt.
    const secondPrompt = vi.mocked(generateJSON).mock.calls[1][0].prompt;
    expect(secondPrompt).toContain('Space travel');
  });

  it('sanitizes the response (missing tips get filled)', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce({
      title: 'X',
      task: 'Y',
      detectedLevel: 'B1',
      estimatedTimeMinutes: 12,
      wordLimitMin: 90,
      wordLimitMax: 150,
      quickTips: [],
    });
    const out = await generateSuggestedTask(english, []);
    expect(out.quickTips).toHaveLength(3);
  });
});

describe('generateCustomTopicTask', () => {
  it('passes the seed topic and language to the prompt', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce(rawTopic('Robots at home'));
    await generateCustomTopicTask('robots', english);
    const prompt = vi.mocked(generateJSON).mock.calls[0][0].prompt;
    expect(prompt).toContain('"robots"');
    expect(prompt).toContain('English');
  });

  it('does not retry — one call only', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce(rawTopic('X'));
    await generateCustomTopicTask('anything', english);
    expect(generateJSON).toHaveBeenCalledTimes(1);
  });
});

describe('generateHint', () => {
  const hintArgs = {
    language: english,
    level: 'B1' as const,
    topicTitle: 'A rainy day',
    task: 'Write about a memorable rainy day.',
    essayText: 'Yesterday it was raining.',
    previousHints: [],
  };

  it('uses the essay_hints task and sanitizes the response', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce({
      text: 'Try describing your feelings with clear sensory details in one sentence.',
      category: 'content',
    });
    const hint = await generateHint(hintArgs);
    // 12-word cap: sanitizeHint slices to 12 words.
    expect(hint.text.split(' ').length).toBeLessThanOrEqual(12);
    expect(hint.category).toBe('content');
    const call = vi.mocked(generateJSON).mock.calls[0][0];
    expect(call.task).toBe('essay_hints');
    expect(call.prompt).toContain('Yesterday it was raining.');
  });

  it("falls back to the iOS-verbatim structure hint when the AI repeats a previous one", async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce({
      text: 'Describe the weather clearly.',
      category: 'content',
    });
    const hint = await generateHint({
      ...hintArgs,
      previousHints: ['describe the WEATHER clearly.'],
    });
    expect(hint.text).toBe('Add one clear supporting example.');
    expect(hint.category).toBe('structure');
  });

  it('validates unknown categories → falls back to content', async () => {
    vi.mocked(generateJSON).mockResolvedValueOnce({ text: 'Some tip.', category: 'nonsense' });
    const hint = await generateHint(hintArgs);
    expect(hint.category).toBe('content');
  });
});
