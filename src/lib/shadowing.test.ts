import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { aiWorkerUrl: 'https://worker.test' } }));

import {
  fetchShadowingPhrases,
  recentShadowingPhrases,
  rememberShadowingPhrases,
  shadowingCategory,
  SHADOWING_PHRASES_PATH,
} from './shadowing';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('fetchShadowingPhrases', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs the iOS body shape and maps phrases', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ok({
        phrases: [
          { id: 'p1', text: "I'll see you tomorrow.", translation: 'See you', level: 'B1', tip: 'Stress "see".' },
          { text: '  Can you help me?  ' },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const phrases = await fetchShadowingPhrases({
      languageId: 'english', level: 'B1', category: 'daily', count: 5, avoidPhrases: ['old'],
    });

    expect(fetchMock.mock.calls[0][0]).toBe(`https://worker.test${SHADOWING_PHRASES_PATH}`);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      language: 'English', languageCode: 'en', level: 'B1', category: 'Daily phrases', count: 5, avoidPhrases: ['old'],
    });
    expect(body.seed).toBeTruthy();

    expect(phrases).toHaveLength(2);
    expect(phrases[0]).toMatchObject({ id: 'p1', text: "I'll see you tomorrow.", translation: 'See you', tip: 'Stress "see".' });
    expect(phrases[1].text).toBe('Can you help me?');
    expect(phrases[1].translation).toBeNull();
    expect(phrases[1].id).toBeTruthy(); // synthesised when missing
  });

  it('only sends the last 30 avoid phrases', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ phrases: [{ text: 'x' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const avoid = Array.from({ length: 40 }, (_, i) => `p${i}`);
    await fetchShadowingPhrases({ languageId: 'english', level: 'B1', category: 'cafe', count: 3, avoidPhrases: avoid });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.avoidPhrases).toHaveLength(30);
    expect(body.avoidPhrases[0]).toBe('p10');
  });

  it('drops entries without text and errors when nothing usable comes back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ phrases: [{ translation: 'no text' }, { text: '   ' }] })));
    await expect(
      fetchShadowingPhrases({ languageId: 'english', level: 'B1', category: 'daily', count: 3 }),
    ).rejects.toMatchObject({ code: 'empty' });
  });

  it('non-2xx → server-error with status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }));
    await expect(
      fetchShadowingPhrases({ languageId: 'english', level: 'B1', category: 'daily', count: 3 }),
    ).rejects.toMatchObject({ code: 'server-error', status: 500 });
  });

  it('fetch rejection → network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(
      fetchShadowingPhrases({ languageId: 'english', level: 'B1', category: 'daily', count: 3 }),
    ).rejects.toMatchObject({ code: 'network' });
  });
});

describe('recent-phrase store', () => {
  beforeEach(() => localStorage.clear());

  it('keeps newest last, dedupes case-insensitively, caps at 20', () => {
    rememberShadowingPhrases('english', 'B1', 'daily', ['One', 'Two']);
    rememberShadowingPhrases('english', 'B1', 'daily', ['one']); // dupe → moves to the end
    let stored = recentShadowingPhrases('english', 'B1', 'daily');
    expect(stored).toEqual(['Two', 'one']);

    rememberShadowingPhrases('english', 'B1', 'daily', Array.from({ length: 25 }, (_, i) => `x${i}`));
    stored = recentShadowingPhrases('english', 'B1', 'daily');
    expect(stored).toHaveLength(20);
    expect(stored[stored.length - 1]).toBe('x24');
  });

  it('buckets per language+level+category', () => {
    rememberShadowingPhrases('english', 'B1', 'daily', ['A']);
    expect(recentShadowingPhrases('english', 'B1', 'travel')).toEqual([]);
    expect(recentShadowingPhrases('english', 'B2', 'daily')).toEqual([]);
    expect(recentShadowingPhrases('french', 'B1', 'daily')).toEqual([]);
  });

  it('ignores blank entries', () => {
    rememberShadowingPhrases('english', 'B1', 'daily', ['  ', '']);
    expect(recentShadowingPhrases('english', 'B1', 'daily')).toEqual([]);
  });
});

describe('shadowingCategory', () => {
  it('resolves ids and falls back to the first category', () => {
    expect(shadowingCategory('interview').title).toBe('Interview');
    expect(shadowingCategory('nope' as never).title).toBe('Daily phrases');
  });
});
