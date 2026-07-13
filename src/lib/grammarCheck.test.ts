import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkGrammar } from './grammarCheck';
import { ESSAY_LANGUAGES } from './essayTypes';

const english = ESSAY_LANGUAGES.find((l) => l.id === 'english')!;

const mockFetchOnce = (init: ResponseInit, body: unknown) => {
  const response = new Response(typeof body === 'string' ? body : JSON.stringify(body), init);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const responseWithMatches = () => ({
  matches: [
    {
      message: 'Possible spelling mistake found.',
      offset: 0,
      length: 5,
      replacements: [{ value: 'Hello' }],
      rule: { category: { id: 'TYPOS' } },
    },
    {
      message: 'This sentence does not start with an uppercase letter.',
      offset: 6,
      length: 5,
      replacements: [{ value: 'World' }],
      rule: { category: { id: 'CASING' } },
    },
  ],
});

describe('checkGrammar — happy path', () => {
  it('POSTs form-encoded body to LanguageTool and maps matches to GrammarIssue[]', async () => {
    mockFetchOnce({ status: 200 }, responseWithMatches());
    const issues = await checkGrammar('hello world', english);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({
      message: 'Possible spelling mistake found.',
      incorrectText: 'hello',
      suggestedCorrection: 'Hello',
      offset: 0,
      length: 5,
      category: 'grammar',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('https://api.languagetool.org/v2/check');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['Content-Type']).toContain('application/x-www-form-urlencoded');
    // Body: text=hello%20world&language=en-US
    expect(call[1].body).toContain('text=hello+world');
    expect(call[1].body).toContain('language=en-US');
  });

  it('empty matches array → empty issues array', async () => {
    mockFetchOnce({ status: 200 }, { matches: [] });
    const issues = await checkGrammar('all good text here', english);
    expect(issues).toEqual([]);
  });
});

describe('checkGrammar — validation guards fire before fetch', () => {
  it('empty text throws grammar/empty', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(checkGrammar('   ', english)).rejects.toMatchObject({ code: 'grammar/empty' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('too-long text throws grammar/too-long', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const huge = 'a'.repeat(7000);
    await expect(checkGrammar(huge, english)).rejects.toMatchObject({ code: 'grammar/too-long' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('unsupported language throws grammar/unsupported-language', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const klingon = { id: 'klingon', title: 'Klingon', shortTitle: 'KL' };
    await expect(checkGrammar('bat leth', klingon)).rejects.toMatchObject({
      code: 'grammar/unsupported-language',
    });
  });
});

describe('checkGrammar — error paths', () => {
  it('non-2xx throws grammar/server-error with status', async () => {
    mockFetchOnce({ status: 429 }, { message: 'Too many requests' });
    await expect(checkGrammar('some text', english)).rejects.toMatchObject({
      code: 'grammar/server-error',
      status: 429,
    });
  });

  it('network failure throws grammar/network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(checkGrammar('some text', english)).rejects.toMatchObject({
      code: 'grammar/network',
    });
  });
});

describe('category mapping (mapCategory internals via public checkGrammar)', () => {
  const makeResponse = (categoryId: string) => ({
    matches: [{
      message: 'x', offset: 0, length: 3,
      replacements: [], rule: { category: { id: categoryId } },
    }],
  });

  it('TYPOGRAPHY → style', async () => {
    mockFetchOnce({ status: 200 }, makeResponse('TYPOGRAPHY'));
    const [issue] = await checkGrammar('abc def', english);
    expect(issue.category).toBe('style');
  });

  it('CONFUSED_WORDS → vocabulary', async () => {
    mockFetchOnce({ status: 200 }, makeResponse('CONFUSED_WORDS'));
    const [issue] = await checkGrammar('abc def', english);
    expect(issue.category).toBe('vocabulary');
  });

  it('anything else → grammar', async () => {
    mockFetchOnce({ status: 200 }, makeResponse('GRAMMAR'));
    const [issue] = await checkGrammar('abc def', english);
    expect(issue.category).toBe('grammar');
  });
});
