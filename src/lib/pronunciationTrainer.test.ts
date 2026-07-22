import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { aiWorkerUrl: 'https://worker.test' } }));

import {
  fetchPronunciationItems,
  parseItemType,
  pronunciationFocus,
  PRONUNCIATION_CONTENT_PATH,
} from './pronunciationTrainer';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('parseItemType', () => {
  it('accepts the four known types and falls back to word', () => {
    expect(parseItemType('minimalPair')).toBe('minimalPair');
    expect(parseItemType('sound')).toBe('sound');
    expect(parseItemType('nonsense')).toBe('word');
    expect(parseItemType(undefined)).toBe('word');
  });
});

describe('pronunciationFocus', () => {
  it('resolves ids and defaults to mixed', () => {
    expect(pronunciationFocus('vowels').promptValue).toBe('vowel sounds');
    expect(pronunciationFocus('nope' as never).id).toBe('mixed');
  });
});

describe('fetchPronunciationItems', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the focus promptValue and maps items', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({
        items: [
          { id: 'i1', type: 'word', text: 'thorough', translation: 'detailed', focusSound: 'th', tip: 'tongue forward', example: 'She is thorough.' },
          { type: 'minimalPair', text: 'bat / bad' },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const items = await fetchPronunciationItems({
      languageId: 'english', level: 'B1', focus: 'minimalPairs', difficulty: 'balanced', count: 6,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(`https://worker.test${PRONUNCIATION_CONTENT_PATH}`);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      language: 'English', languageCode: 'en', level: 'B1', focus: 'minimal pairs', difficulty: 'balanced', count: 6,
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: 'i1', type: 'word', text: 'thorough', focusSound: 'th', example: 'She is thorough.' });
    expect(items[1]).toMatchObject({ type: 'minimalPair', text: 'bat / bad', focusSound: null, tip: null, example: null });
    expect(items[1].difficulty).toBe('balanced');
  });

  it('drops textless items; all-empty → empty error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ items: [{ type: 'word' }, { text: '  ' }] })));
    await expect(
      fetchPronunciationItems({ languageId: 'english', level: 'B1', focus: 'mixed', difficulty: 'easy', count: 4 }),
    ).rejects.toMatchObject({ code: 'empty' });
  });

  it('non-2xx → server-error with status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'down' }) }));
    await expect(
      fetchPronunciationItems({ languageId: 'english', level: 'B1', focus: 'mixed', difficulty: 'easy', count: 4 }),
    ).rejects.toMatchObject({ code: 'server-error', status: 503 });
  });
});
