import { beforeEach, describe, expect, it, vi } from 'vitest';

const ai = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock('@/lib/aiClient', () => ai);

import {
  buildMyTextsPrompt,
  ExploreError,
  exploreWikipedia,
  generateReadingText,
  LENGTH_WORD_RANGES,
  targetWordCountFor,
} from './readingGenerationService';

describe('buildMyTextsPrompt (iOS verbatim)', () => {
  it('includes topic, style, level, length range and focus instructions', () => {
    const prompt = buildMyTextsPrompt({
      topic: 'coral reefs',
      languageId: 'spanish',
      level: 'B1',
      length: 'medium',
      style: 'casual',
      focus: 'vocabulary',
    });
    expect(prompt).toContain('Write a self-contained reading passage in Spanish about: coral reefs.');
    expect(prompt).toContain('Tone / style: friendly and conversational — like a personal blog post.');
    expect(prompt).toContain('CEFR level B1: medium sentences with common connectors and broader vocabulary.');
    expect(prompt).toContain('Target length: about 325 words (between 250 and 400).');
    expect(prompt).toContain('Include several useful topic-specific words the reader can learn from context.');
    expect(prompt).toContain('- Do not write a title.');
  });

  it('blank topic falls back to the everyday-topic phrase', () => {
    const prompt = buildMyTextsPrompt({
      topic: '  ',
      languageId: 'english',
      level: 'A1',
      length: 'short',
      style: 'informative',
      focus: 'mainIdea',
    });
    expect(prompt).toContain('about: an interesting everyday topic.');
  });

  it('length ranges + midpoints match iOS', () => {
    expect(LENGTH_WORD_RANGES.short).toEqual([120, 220]);
    expect(LENGTH_WORD_RANGES.long).toEqual([500, 800]);
    expect(targetWordCountFor('short')).toBe(170);
    expect(targetWordCountFor('long')).toBe(650);
  });
});

describe('generateReadingText', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the my_texts_generation task, normalizes, and titles from the topic', async () => {
    ai.generateText.mockResolvedValue('Here is the text:\n\n**The reef** teems with life.');
    const result = await generateReadingText({
      topic: 'coral reefs',
      languageId: 'english',
      level: 'B1',
      length: 'short',
      style: 'informative',
      focus: 'mainIdea',
    });
    expect(ai.generateText.mock.calls[0][0].task).toBe('my_texts_generation');
    expect(result.title).toBe('Coral reefs');
    expect(result.body).toBe('The reef teems with life.');
  });
});

describe('exploreWikipedia', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('empty topic throws emptyTopic', async () => {
    await expect(exploreWikipedia('  ', 'english')).rejects.toMatchObject({ code: 'emptyTopic' });
  });

  it('fetches the summary and maps the fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        title: 'Marie Curie',
        extract: 'Marie Curie was a physicist and chemist.',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Marie_Curie' } },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await exploreWikipedia('Marie Curie', 'english');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://en.wikipedia.org/api/rest_v1/page/summary/Marie_Curie',
    );
    expect(result.title).toBe('Marie Curie');
    expect(result.sourceURL).toContain('wikipedia.org/wiki');
  });

  it('404 throws notFound', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    await expect(exploreWikipedia('zzz', 'english')).rejects.toMatchObject({ code: 'notFound' });
  });

  it('uses the language host', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ title: 'X', extract: 'Y', content_urls: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await exploreWikipedia('Venecia', 'spanish');
    expect(fetchMock.mock.calls[0][0]).toContain('https://es.wikipedia.org/');
  });

  it('ExploreError carries the code', () => {
    expect(new ExploreError('network', 'x').code).toBe('network');
  });
});
