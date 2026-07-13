import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findSynonyms, translate } from './essayAssistance';
import { ESSAY_LANGUAGES } from './essayTypes';

const english = ESSAY_LANGUAGES.find((l) => l.id === 'english')!;
const ukrainian = ESSAY_LANGUAGES.find((l) => l.id === 'ukrainian')!;

/** Queue of responses keyed by a URL substring match, so tests can script
    multi-call flows (synonyms bridging through translations). */
const scriptFetch = (routes: Array<{ match: string; body: unknown; status?: number }>) => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const route = routes.find((r) => url.includes(r.match));
      if (!route) return Promise.reject(new Error(`no route for ${url}`));
      return Promise.resolve(new Response(JSON.stringify(route.body), { status: route.status ?? 200 }));
    }),
  );
};

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('translate', () => {
  it('returns the validated MyMemory translation', async () => {
    scriptFetch([
      { match: 'mymemory', body: { responseData: { translatedText: 'house' }, responseStatus: 200 } },
    ]);
    const out = await translate('будинок', ukrainian, english);
    expect(out).toBe('house');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (fetch as any).mock.calls[0][0] as string;
    expect(call).toContain('langpair=uk%7Cen'); // uk|en encoded
  });

  it('rejects empty text without fetching', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(translate('   ', ukrainian, english)).rejects.toMatchObject({ code: 'assist/empty' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects same source/target language', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(translate('word', english, english)).rejects.toMatchObject({
      code: 'assist/same-language',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an echo (result equals input)', async () => {
    scriptFetch([
      { match: 'mymemory', body: { responseData: { translatedText: 'Будинок' }, responseStatus: 200 } },
    ]);
    await expect(translate('будинок', ukrainian, english)).rejects.toMatchObject({
      code: 'assist/no-result',
    });
  });

  it('rejects a translation containing digits', async () => {
    scriptFetch([
      { match: 'mymemory', body: { responseData: { translatedText: 'house 42' }, responseStatus: 200 } },
    ]);
    await expect(translate('будинок', ukrainian, english)).rejects.toMatchObject({
      code: 'assist/no-result',
    });
  });

  it('rejects a 1-word input translated to >2 words', async () => {
    scriptFetch([
      { match: 'mymemory', body: { responseData: { translatedText: 'a big old house' }, responseStatus: 200 } },
    ]);
    await expect(translate('будинок', ukrainian, english)).rejects.toMatchObject({
      code: 'assist/no-result',
    });
  });

  it('surfaces a non-200 HTTP status as server-error', async () => {
    scriptFetch([{ match: 'mymemory', body: {}, status: 503 }]);
    await expect(translate('будинок', ukrainian, english)).rejects.toMatchObject({
      code: 'assist/server-error',
    });
  });

  it('surfaces MyMemory responseStatus != 200 as server-error', async () => {
    scriptFetch([
      { match: 'mymemory', body: { responseData: { translatedText: '' }, responseStatus: 403 } },
    ]);
    await expect(translate('будинок', ukrainian, english)).rejects.toMatchObject({
      code: 'assist/server-error',
    });
  });
});

describe('findSynonyms', () => {
  it('English source → Datamuse rel_syn, deduped + sorted', async () => {
    scriptFetch([
      { match: 'datamuse', body: [{ word: 'glad' }, { word: 'joyful' }, { word: 'glad' }, { word: 'cheerful' }] },
    ]);
    const items = await findSynonyms('happy', english, english);
    expect(items.map((i) => i.result)).toEqual(['cheerful', 'glad', 'joyful']);
    expect(items[0].word).toBe('happy');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (fetch as any).mock.calls[0][0] as string;
    expect(call).toContain('rel_syn=happy');
  });

  it('non-English source → Datamuse ml path', async () => {
    scriptFetch([
      { match: 'datamuse', body: [{ word: 'joyful' }, { word: 'glad' }] },
    ]);
    // target english → no translation bridge needed
    const items = await findSynonyms('щасливий', ukrainian, english);
    expect(items.map((i) => i.result)).toEqual(['glad', 'joyful']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (fetch as any).mock.calls[0][0] as string;
    expect(call).toContain('ml=');
  });

  it('non-English target → translates the English synonyms into the target', async () => {
    // English source (rel_syn) then per-synonym translation into Ukrainian.
    scriptFetch([
      { match: 'datamuse', body: [{ word: 'glad' }, { word: 'joyful' }] },
      { match: 'mymemory', body: { responseData: { translatedText: 'радісний' }, responseStatus: 200 } },
    ]);
    const items = await findSynonyms('happy', english, ukrainian);
    // Both synonyms translate to the same word → deduped to one.
    expect(items.map((i) => i.result)).toEqual(['радісний']);
  });

  it('throws no-result when nothing comes back', async () => {
    scriptFetch([{ match: 'datamuse', body: [] }]);
    await expect(findSynonyms('zzzz', english, english)).rejects.toMatchObject({
      code: 'assist/no-result',
    });
  });

  it('rejects empty word', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(findSynonyms('  ', english, english)).rejects.toMatchObject({ code: 'assist/empty' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
